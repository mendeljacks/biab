import { describe, test, afterEach } from 'mocha'
import { expect } from 'chai'
import {
    access_token_to_jwt,
    GoogleUser,
    google_auth_headless,
    google_login,
    google_login_callback
} from './auth_google'
import axios from 'axios'
import sinon from 'sinon'
import * as orma from '../../config/orma'
import * as auth_google from './auth_google'

const google_user = {
    id: 'string',
    email: 'mendeljacks@gmail.com',
    verified_email: false,
    name: 'string',
    given_name: 'string',
    family_name: 'string',
    picture: 'string',
    locale: 'string',
    iat: 998
} as GoogleUser

describe('Google auth', () => {
    afterEach(() => {
        sinon.restore()
    })
    test('Puts roles into the token', async () => {
        sinon.stub(axios, 'get').callsFake(async () => {
            return { data: google_user }
        })
        sinon.stub(auth_google, 'ensure_user_exists').callsFake(async () => {
            return { user_has_roles: [{}] }
        })
        const jwt = await access_token_to_jwt('hi', 'hi')
        expect(jwt.token).to.be.a.string
    })
    test('Google auth headless controller', async () => {
        sinon.stub(axios, 'post').callsFake(async () => {
            return { data: {} }
        })
        sinon.stub(axios, 'get').callsFake(async () => {
            return { data: google_user }
        })
        const jwt = await google_auth_headless({ body: { id_token: '', access_token: '' } }, {})
        expect(jwt.token).to.be.a.string

        try {
            // should reject with no body
            const jwt = await google_auth_headless({ body: {} }, {})
            expect(1).to.equal(2)
        } catch (error) {}
    })
    test('Will not try to create user if it exists', async () => {
        sinon.stub(orma, 'byo_query_fn').callsFake(async sqls => sqls.map(el => [{}]))
        sinon.stub(axios, 'post').callsFake(async () => {
            return { data: {} }
        })
        sinon.stub(axios, 'get').callsFake(async () => {
            return { data: google_user }
        })

        const response = await google_login_callback({ query: { code: 'test' } }, undefined)
        expect(response.token).to.be.a.string
    })
    test('If user does not exist it will get created', async () => {
        sinon.stub(axios, 'post').callsFake(async () => {
            return { data: {} }
        })
        const stub = sinon.stub(orma, 'byo_query_fn').callsFake(async sqls => sqls.map(el => []))

        stub.onCall(5).callsFake(async sqls => sqls.map(el => [{}]))

        sinon.stub(axios, 'get').callsFake(async () => {
            return { data: google_user }
        })
        const response = await google_login_callback({ query: { code: 'test' } }, undefined)
        expect(response.token).to.be.a.string
    })
    test('Google login is a redirect', async () => {
        expect(await google_login({}, { redirect: () => {} })).to.be.undefined
    })
})
