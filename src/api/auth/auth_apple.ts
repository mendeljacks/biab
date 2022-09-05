import Ajv from 'ajv/dist/2020'
import appleSignin from 'apple-signin-auth'
import { make_token } from './auth'

export type AppleUser = {
    iss: string
    aud: string
    exp: string
    iat: string
    sub: string
    c_hash?: string
    email: string
    email_verified: string | boolean
    auth_time?: number
    nonce_supported: boolean
    real_user_status?: number
}
export type EnsureAppleUserExistsFn = (apple_user: AppleUser) => Promise<{
    id: number
    user_has_roles: { role_id: number }[]
}>

export const apple_access_token_to_jwt = async (
    id_token: string,
    access_token: string,
    ensure_apple_user_exists: EnsureAppleUserExistsFn,
    jwt_secret: string,
    bundle_id: string | string[]
) => {
    // Fetch the user's profile with the access token and bearer
    const apple_user: AppleUser = await appleSignin.verifyIdToken(id_token, {
        // Optional Options for further verification - Full list can be found here https://github.com/auth0/node-jsonwebtoken#jwtverifytoken-secretorpublickey-options-callback
        audience: bundle_id, // client id - can also be an array
        // nonce: 'NONCE', // nonce // Check this note if coming from React Native AS RN automatically SHA256-hashes the nonce https://github.com/invertase/react-native-apple-authentication#nonce
        // If you want to handle expiration on your own, or if you want the expired tokens decoded
        ignoreExpiration: true // default is false
    })

    const user = await ensure_apple_user_exists(apple_user)

    const token = await make_token(
        user.id,
        user.user_has_roles?.map(({ role_id }) => role_id) || [],
        jwt_secret
    )

    return { token, user_id: user.id }
}

const apple_auth_headless_schema = {
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
const validate = ajv.compile(apple_auth_headless_schema)

export const apple_auth_headless = async (
    body: { id_token: string; access_token: string },
    ensure_user_exists: EnsureAppleUserExistsFn,
    jwt_secret: string,
    bundle_id: string | string[]
) => {
    validate(body)

    if ((validate.errors?.length || 0) > 0) {
        return Promise.reject({ errors: validate.errors })
    }

    return apple_access_token_to_jwt(
        body.id_token,
        body.access_token,
        ensure_user_exists,
        jwt_secret,
        bundle_id
    )
}
