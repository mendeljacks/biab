import { expect } from 'chai'
import { describe, test } from 'mocha'
import { authenticate, make_token } from './auth'
import { fake_secret } from './auth_google.test'
import { ensure_perms } from './perms'
import { mutate, query, welcome } from '../controllers'
import { fake_orma_schema } from '../../tests/fake_orma_schema'
import { fake_pool } from '../../tests/fake_pool'
import { fake_connection_edges } from '../../../../clubs/src/api/auth/ownership2.test'
import { fake_byo_query_fn } from '../../tests/fake_byo_query_fn'
import { fake_trans } from '../../tests/fake_trans'
import { add_resource_ids } from '../../config/extra_macros'

export const admin = 1
export const user = 2
const everyone = [admin, user]
const admin_only = [admin]
const disabled = []
export const fake_ensure_permissions = async () => {}
export const fake_role_has_permissions = {
    migrations: { create: disabled, read: disabled, update: disabled, delete: disabled },
    club_has_users: { create: everyone, read: everyone, update: everyone, delete: everyone },
    clubs: { create: everyone, read: everyone, update: everyone, delete: everyone },
    review_has_photos: { create: everyone, read: everyone, update: everyone, delete: everyone },
    photos: { create: everyone, read: everyone, update: disabled, delete: everyone },
    reviews: { create: everyone, read: everyone, update: everyone, delete: admin_only },
    places: { create: admin_only, read: everyone, update: admin_only, delete: admin_only },
    user_has_roles: {
        create: admin_only,
        read: admin_only,
        update: admin_only,
        delete: admin_only
    },
    roles: { create: admin_only, read: everyone, update: admin_only, delete: admin_only },
    users: { create: admin_only, read: everyone, update: everyone, delete: everyone }
}

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
            fake_pool,
            fake_connection_edges,
            fake_role_has_permissions,
            fake_orma_schema,
            fake_ensure_permissions,
            fake_byo_query_fn
        )
        const t2 = await mutate(
            {
                body: {},
                headers: { authorization: `Bearer ${user_token}` }
            },
            fake_secret,
            fake_pool,
            fake_connection_edges,
            fake_role_has_permissions,
            fake_orma_schema,
            fake_ensure_permissions,
            fake_byo_query_fn,
            fake_trans,
            add_resource_ids
        )

        expect(t1).to.deep.equal({})
        expect(t2).to.deep.equal({})

        let err = undefined
        let err2 = undefined
        try {
            const t1 = await query(
                {},
                fake_secret,
                fake_pool,
                fake_connection_edges,
                fake_role_has_permissions,
                fake_orma_schema,
                fake_ensure_permissions,
                fake_byo_query_fn
            )
        } catch (error) {
            err = error
        }
        try {
            const t2 = await mutate(
                { body: {} },
                fake_secret,
                fake_pool,
                fake_connection_edges,
                fake_role_has_permissions,
                fake_orma_schema,
                fake_ensure_permissions,
                fake_byo_query_fn,
                fake_trans,
                add_resource_ids
            )
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
                'query',
                fake_role_has_permissions
            )
            expect(true).to.equal(false)
        } catch (error) {
            expect(error.message.length > 0).to.deep.equal(true)
        }
        try {
            await ensure_perms(
                { users: { id: true } },
                { user_id: 1, role_ids: [2] },
                'query',
                fake_role_has_permissions
            )
            expect(true).to.equal(false)
        } catch (error) {
            expect(error.message.length > 0).to.deep.equal(true)
        }

        try {
            await ensure_perms(
                { users: { id: true } },
                { user_id: 1, role_ids: [2] },
                'mutate',
                fake_role_has_permissions
            )
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
