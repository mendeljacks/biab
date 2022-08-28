import Ajv from 'ajv/dist/2020'
import axios from 'axios'
import querystring from 'querystring'
import { make_token } from './auth'

const redirectURI = 'auth/google/callback'

export const google_login = async (res, server_root_uri: string, google_client_id: string) => {
    res.redirect(get_google_auth_url(server_root_uri, google_client_id))
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

export type EnsureUserExistsFn = (google_user: GoogleUser) => Promise<{
    id: number
    user_has_roles: { role_id: number }[]
}>

export const access_token_to_jwt = async (
    id_token: string,
    access_token: string,
    ensure_user_exists: EnsureUserExistsFn,
    jwt_secret: string
) => {
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
        jwt_secret
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
export const google_auth_headless = async (
    body: { id_token: string; access_token: string },
    ensure_user_exists: EnsureUserExistsFn,
    jwt_secret: string
) => {
    validate(body)

    if ((validate.errors?.length || 0) > 0) {
        return Promise.reject({ errors: validate.errors })
    }

    return access_token_to_jwt(body.id_token, body.access_token, ensure_user_exists, jwt_secret)
}

export const google_login_callback = async (
    code: string,
    google_client_id: string,
    google_client_secret: string,
    server_root_uri: string,
    ensure_user_exists: EnsureUserExistsFn,
    jwt_secret: string
) => {
    const { id_token, access_token } = await get_tokens({
        code,
        clientId: google_client_id,
        clientSecret: google_client_secret,
        redirectUri: `${server_root_uri}/${redirectURI}`
    })

    return access_token_to_jwt(id_token, access_token, ensure_user_exists, jwt_secret)
}

const get_google_auth_url = (server_root_uri: string, google_client_id: string) => {
    const rootUrl = 'https://accounts.google.com/o/oauth2/v2/auth'
    const options = {
        redirect_uri: `${server_root_uri}/${redirectURI}`,
        client_id: google_client_id,
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
