import axios from 'axios'
import querystring from 'querystring'
import { mutate_handler, query_handler } from '../../config/orma'
import { make_token } from './auth'

const redirectURI = 'auth/google/callback'
const SERVER_ROOT_URI = 'http://localhost:3001'

export const google_login = async (req, res) => {
    res.redirect(getGoogleAuthURL())
}
type GoogleUser = {
    id: string
    email: string
    verified_email: boolean
    name: string
    given_name: string
    family_name: string
    picture: string
    locale: string
    iat: number
}

export const google_login_callback = async (req, res) => {
    const code = req.query.code as string

    const { id_token, access_token } = await getTokens({
        code,
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        redirectUri: `${SERVER_ROOT_URI}/${redirectURI}`
    })

    // Fetch the user's profile with the access token and bearer
    const google_user: GoogleUser = await axios
        .get(
            `https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=${access_token}`,
            {
                headers: {
                    Authorization: `Bearer ${id_token}`
                }
            }
        )
        .then(res => res.data)
        .catch(error => {
            console.error(`Failed to fetch user`)
            throw new Error(error.message)
        })

    const query = {
        users: {
            id: true,
            email: true,
            password: true,
            user_has_roles: {
                role_id: true
            },
            $where: {
                $eq: ['email', { $escape: google_user.email }]
            }
        }
    }

    const { users } = (await query_handler(query)) as any

    if (users.length === 0) {
        const mutation = {
            $operation: 'create',
            users: [
                {
                    email: google_user.email,
                    password: google_user.id
                }
            ]
        }

        await mutate_handler(mutation)
    }

    const token = await make_token(
        users[0].id,
        users[0].user_has_roles?.map(({ role_id }) => role_id) || [],
        process.env.jwt_secret
    )

    return { token, user_id: users[0].id }
}

function getGoogleAuthURL() {
    const rootUrl = 'https://accounts.google.com/o/oauth2/v2/auth'
    const options = {
        redirect_uri: `${SERVER_ROOT_URI}/${redirectURI}`,
        client_id: process.env.GOOGLE_CLIENT_ID,
        access_type: 'offline',
        response_type: 'code',
        prompt: 'consent',
        scope: [
            'https://www.googleapis.com/auth/userinfo.profile',
            'https://www.googleapis.com/auth/userinfo.email'
        ].join(' ')
    }

    return `${rootUrl}?${querystring.stringify(options)}`
}

function getTokens({
    code,
    clientId,
    clientSecret,
    redirectUri
}: {
    code: string
    clientId: string
    clientSecret: string
    redirectUri: string
}): Promise<{
    access_token: string
    expires_in: Number
    refresh_token: string
    scope: string
    id_token: string
}> {
    /*
     * Uses the code to get tokens
     * that can be used to fetch the user's profile
     */
    const url = 'https://oauth2.googleapis.com/token'
    const values = {
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
    }

    return axios
        .post(url, querystring.stringify(values), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        })
        .then(res => res.data)
        .catch(error => {
            console.error(`Failed to fetch auth tokens`)
            throw new Error(error.message)
        })
}
