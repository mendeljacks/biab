import appleSignin from 'apple-signin-auth'
import { expect } from 'chai'
import { describe, test } from 'mocha'
import sinon from 'sinon'
import { apple_access_token_to_jwt } from './auth_apple'
import { fake_secret } from './auth_google.test'

export const fake_bundle_id = 'com.sigmasoftware.clubapp'
describe('Auth Apple', () => {
    test('User can login with a id token and access token', async () => {
        sinon.stub(appleSignin, 'verifyIdToken').resolves({
            iss: 'https://appleid.apple.com',
            aud: fake_bundle_id,
            sub: '000814.77fdab623ee448129efecbfe5efbc5cb.1252',
            email: 'artur.nikolaienko@gmail.com',
            email_verified: 'true'
        } as any)
        const id_token = 'mocked_id_token'
        const access_token = 'mocked_access_token'
        const response = await apple_access_token_to_jwt(
            id_token,
            access_token,
            (() => {
                return { id: 1 }
            }) as any,
            fake_secret,
            fake_bundle_id
        )
        sinon.restore()
        expect(response.token.length > 0).to.equal(true)
    })
})
