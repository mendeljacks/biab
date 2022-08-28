import { expect } from 'chai'
import { describe, test } from 'mocha'
import { authenticate, make_token } from '../../api/auth/auth'
import { fake_secret } from '../../api/auth/auth_google.test'
import { ensure_perms } from '../../api/auth/perms'
import { mutate, query, welcome } from '../../api/controllers'
import { fake_pool } from '../orma.test'

describe('Auth', () => {
    test('Requires jwt to user query/mutate', async () => {
        const admin_token = await make_token(1, [1], fake_secret)
        const user_token = await make_token(1, [2], fake_secret)
        const t1 = await query(
            {
                body: {},
                headers: { authorization: `Bearer ${admin_token}` }
            },
            fake_secret,
            fake_pool
        )
        const t2 = await mutate(
            {
                body: {},
                headers: { authorization: `Bearer ${user_token}` }
            },
            fake_secret,
            fake_pool
        )

        expect(t1).to.deep.equal({})
        expect(t2).to.deep.equal({})

        let err = undefined
        let err2 = undefined
        try {
            const t1 = await query({}, fake_secret, fake_pool)
        } catch (error) {
            err = error
        }
        try {
            const t2 = await mutate({ body: {} }, fake_secret, fake_pool)
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

    test('Welcome', async () => {
        const result = await welcome('')
        expect(result.length > 0).to.deep.equal(true)
    })
})
