import { describe, test } from 'mocha'
import { expect } from 'chai'
import { apple_access_token_to_jwt } from './auth_apple'
import { fake_secret } from './auth_google.test'

export const fake_bundle_id = 'com.sigmasoftware.clubapp'
describe('Auth Apple', () => {
    test('User can login with a id token and access token', async () => {
        const id_token =
            'eyJraWQiOiJXNldjT0tCIiwiYWxnIjoiUlMyNTYifQ.eyJpc3MiOiJodHRwczovL2FwcGxlaWQuYXBwbGUuY29tIiwiYXVkIjoiY29tLnNpZ21hc29mdHdhcmUuY2x1YmFwcCIsImV4cCI6MTY2MjAzODU5NiwiaWF0IjoxNjYxOTUyMTk2LCJzdWIiOiIwMDA4MTQuNzdmZGFiNjIzZWU0NDgxMjllZmVjYmZlNWVmYmM1Y2IuMTI1MiIsImNfaGFzaCI6ImlxcFZaQ0lQLV9vcTZkT0ViNXZIamciLCJlbWFpbCI6ImFydHVyLm5pa29sYWllbmtvQGdtYWlsLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjoidHJ1ZSIsImF1dGhfdGltZSI6MTY2MTk1MjE5Niwibm9uY2Vfc3VwcG9ydGVkIjp0cnVlLCJyZWFsX3VzZXJfc3RhdHVzIjoyfQ.oS_QZo-ZjLveyrP7bLojO73PHd9yqikPPoMfzcYEtCXRKSBjtKwv9HWtY36nnOnZliGbqag_moLBP5V-W2DWudNqkb8gtXxlQCvdX6ZY9claP5fqc9eGnTQ2iFUTXB9ObTLJnLJmQV4eLPJNIJkl6WfdESRknFLUY2PfyB162n2KuWLILDU84fRP7H_ufrFn_qXPN9RGAhVF4x9TfDtm2VqZmAD4fLpcdyY5ndC4HaQf-6wmKSiWJGspfF8MK617P9tV-PR8KrRXIVVfGtggFx4sF4D_3BETtMlDUTYUkBR3noAHrndYFNsG4PYJJXKQj8FKZLKN6lFzDwkTMOhdFA'
        const access_token = 'ce3cb3cc5550e4741b092612b7848d961.0.ryru.xqlx19oN_hUmjSuWaVpgNw'
        const response = await apple_access_token_to_jwt(
            id_token,
            access_token,
            (() => {
                return { id: 1 }
            }) as any,
            fake_secret,
            fake_bundle_id
        )
        expect(response.token.length > 0).to.equal(true)
    })
})
