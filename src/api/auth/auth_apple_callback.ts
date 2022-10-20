import AppleAuth from 'apple-auth'
import jwt from 'jsonwebtoken'

// Endpoint for the app to login or register with the `code` obtained during Sign in with Apple
//
// Use this endpoint to exchange the code (which must be validated with Apple within 5 minutes) for a session in your system
export const sign_in_with_apple = async (
    req,
    server_root_uri: string,
    bundle_id: string,
    service_id: string,
    team_id: string,
    key_contents: string,
    key_id: string
) => {
    const auth = new AppleAuth(
        {
            // use the bundle ID as client ID for native apps, else use the service ID for web-auth flows
            // https://forums.developer.apple.com/thread/118135
            client_id: req.query.useBundleId === 'true' ? bundle_id : service_id,
            team_id: team_id,
            redirect_uri: `${server_root_uri}/callbacks/sign_in_with_apple`, // does not matter here, as this is already the callback that verifies the token after the redirection
            key_id: key_id,
            scope: undefined
        },
        key_contents.replace(/\|/g, '\n'),
        'text'
    )

    const accessToken = await auth.accessToken(req.query.code)

    const idToken = jwt.decode(accessToken.id_token)

    return { query: req.query, idToken }
}
