import axios from 'axios'
import querystring from 'querystring'
import { mutate_handler, query_handler } from '../../config/orma'
import { make_token } from './auth'
import Ajv from 'ajv/dist/2020'
import { user } from './roles'

const redirectURI = 'auth/google/callback'

export const google_login = async (res, server_root_uri: string) => {
    res.redirect(get_google_auth_url(server_root_uri))
}

export type GoogleUser = {
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

export const ensure_user_exists = async (google_user: GoogleUser) => {
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

    let { users } = (await query_handler(query)) as any

    if (users.length > 0) {
        return users[0]
    }

    const mutation = {
        $operation: 'create',
        users: [
            {
                email: google_user.email,
                password: google_user.id,
                first_name: google_user.given_name,
                last_name: google_user.family_name,
                user_has_roles: [
                    {
                        role_id: user
                    }
                ]
            }
        ]
    }

    await mutate_handler(mutation)
    let { users: new_users } = await query_handler(query)
    return new_users[0]
}

export const access_token_to_jwt = async (id_token: string, access_token: string) => {
    // Fetch the user's profile with the access token and bearer
    const google_user: GoogleUser = await axios
        .get(
            `https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=${access_token}`,
            { headers: { Authorization: `Bearer ${id_token}` } }
        )
        .then(res => res.data)

    const user = await ensure_user_exists(google_user)

    const token = await make_token(
        user.id,
        user.user_has_roles?.map(({ role_id }) => role_id) || [],
        process.env.jwt_secret
    )

    return { token, user_id: user.id }
}

const google_auth_headless_schema = {
    type: 'object',
    properties: {
        id_token: {
            type: 'string'
        },
        access_token: {
            type: 'string'
        }
    },
    required: ['id_token', 'access_token'],
    additionalProperties: false
}

const ajv = new Ajv({ discriminator: true })
const validate = ajv.compile(google_auth_headless_schema)
export const google_auth_headless = async (req, res) => {
    validate(req.body)

    if ((validate.errors?.length || 0) > 0) {
        return Promise.reject({ errors: validate.errors })
    }

    return access_token_to_jwt(req.body.id_token, req.body.access_token)
}

export const google_login_callback = async (req, res) => {
    const code = req.query.code as string

    const { id_token, access_token } = await get_tokens({
        code,
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        redirectUri: `${process.env.SERVER_ROOT_URI}/${redirectURI}`
    })

    return access_token_to_jwt(id_token, access_token)
}

const get_google_auth_url = (server_root_uri: string) => {
    const rootUrl = 'https://accounts.google.com/o/oauth2/v2/auth'
    const options = {
        redirect_uri: `${server_root_uri}/${redirectURI}`,
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

const get_tokens = async ({
    code,
    clientId,
    clientSecret,
    redirectUri
}: {
    code: string
    clientId: string
    clientSecret: string
    redirectUri: string
}) => {
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

    const { data } = await axios.post(url, querystring.stringify(values), {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    })
    return data as {
        access_token: string
        expires_in: Number
        refresh_token: string
        scope: string
        id_token: string
    }
}
