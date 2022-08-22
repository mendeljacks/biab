import { expect } from 'chai'
import { describe, test } from 'mocha'
import sinon from 'sinon'
import { authenticate, ensure_perms, make_token } from '../../api/auth'
import { login, mutate, query, signup, welcome } from '../../api/controllers'
import * as orma from '../../config/orma'

describe('Auth', () => {
    test('Requires jwt to user query/mutate', async () => {
        const admin_token = await make_token(1, [1], process.env.jwt_secret)
        const user_token = await make_token(1, [2], process.env.jwt_secret)
        const t1 = await query({
            body: {},
            headers: { authorization: `Bearer ${admin_token}` }
        })
        const t2 = await mutate({
            body: {},
            headers: { authorization: `Bearer ${user_token}` }
        })

        expect(t1).to.deep.equal({})
        expect(t2).to.deep.equal({})

        let err = undefined
        let err2 = undefined
        try {
            const t1 = await query({})
        } catch (error) {
            err = error
        }
        try {
            const t2 = await mutate({ body: {} })
        } catch (error) {
            err2 = error
        }

        expect(err).to.deep.equal('No token')
        expect(err2).to.deep.equal('No token')
    })
    test('make token can reject', async () => {
        try {
            await make_token(1, [2], undefined)
            expect(true).to.equal(false)
        } catch (error) {
            expect(error.message.length > 0).to.equal(true)
        }
    })
    test('authenticate token can reject', async () => {
        try {
            await authenticate({ headers: { authorization: 'Bearer oops' } }, 'secret')
            expect(true).to.equal(false)
        } catch (error) {
            expect(error.message.length > 0).to.equal(true)
        }
    })
    test('Requre perm for reading', async () => {
        try {
            await ensure_perms(
                { users: { id: true, user_has_roles: { id: true, users: { id: true } } } },
                { user_id: 1, role_ids: [1] },
                'query'
            )
            expect(true).to.equal(false)
        } catch (error) {
            expect(error.message.length > 0).to.deep.equal(true)
        }
        try {
            await ensure_perms({ users: { id: true } }, { user_id: 1, role_ids: [2] }, 'query')
            expect(true).to.equal(false)
        } catch (error) {
            expect(error.message.length > 0).to.deep.equal(true)
        }

        try {
            await ensure_perms({ users: { id: true } }, { user_id: 1, role_ids: [2] }, 'mutate')
            expect(true).to.equal(false)
        } catch (error) {
            expect(error.message.length > 0).to.deep.equal(true)
        }
    })
    test('Signup Controller', async () => {
        sinon.stub(orma, 'mutate_handler').callsFake(async _ => 'called')
        const response = await signup({ body: { email: 'admin', password: 'admin' } })
        sinon.restore()
        expect(response).to.deep.equal('called')
    })
    test('Login Controller', async () => {
        sinon.stub(orma, 'query_handler').callsFake(async mutation => {
            const password = '$2b$10$iOxhCB/x0Ep.LVvvJJLFJuCrBZfiSxE0srGVAkB9IPz4sgSNzi.P.'
            const user_has_roles = [{ role_id: 1 }]
            return { users: [{ id: 1, email: 'admin', password, user_has_roles }] }
        })
        const response = await login({ body: { email: 'admin', password: 'admin' } })

        expect(response.token.length > 0).to.deep.equal(true)

        try {
            await login({
                body: { email: undefined, password: 'admin' }
            })
            expect(false).to.deep.equal(true)
        } catch (error) {
            expect(error.length > 0).to.deep.equal(true)
        }

        try {
            await login({
                body: { email: 'admin', password: undefined }
            })
            expect(false).to.deep.equal(true)
        } catch (error) {
            expect(error.length > 0).to.deep.equal(true)
        }

        sinon.restore()
    })
    test('Can make token for user with no roles', async () => {
        sinon.stub(orma, 'query_handler').callsFake(async mutation => {
            const password = '$2b$10$iOxhCB/x0Ep.LVvvJJLFJuCrBZfiSxE0srGVAkB9IPz4sgSNzi.P.'

            return { users: [{ id: 1, email: 'admin', password }] }
        })
        const response = await login({ body: { email: 'admin', password: 'admin' } })

        expect(response.token.length > 0).to.deep.equal(true)

        sinon.restore()
    })
    test('Login user throws error with bad email', async () => {
        sinon.stub(orma, 'query_handler').callsFake(async mutation => {
            return { users: [] }
        })

        try {
            await login({ body: { email: 'oops', password: 'admin' } })
            expect(true).to.deep.equal(false)
        } catch (error) {
            expect(error.length > 0).to.deep.equal(true)
        }

        sinon.restore()
    })
    test('Login user throws error with bad password', async () => {
        sinon.stub(orma, 'query_handler').callsFake(async mutation => {
            return { users: [{ password: '' }] }
        })

        try {
            await login({ body: { email: 'oops', password: 'admin' } })
            expect(true).to.deep.equal(false)
        } catch (error) {
            expect(error.length > 0).to.deep.equal(true)
        }

        sinon.restore()
    })
    test('Signup user throws error with bad email', async () => {
        sinon.stub(orma, 'mutate_handler')

        try {
            await signup({ body: { email: undefined, password: 'admin' } })
            expect(true).to.deep.equal(false)
        } catch (error) {
            expect(error.length > 0).to.deep.equal(true)
        }

        sinon.restore()
    })
    test('Signup user throws error with bad password', async () => {
        sinon.stub(orma, 'mutate_handler')

        try {
            await signup({ body: { email: 'oops', password: undefined } })
            expect(true).to.deep.equal(false)
        } catch (error) {
            expect(error.length > 0).to.deep.equal(true)
        }

        sinon.restore()
    })
    test('Welcome', async () => {
        const result = await welcome({})
        expect(result.length > 0).to.deep.equal(true)
    })
})
