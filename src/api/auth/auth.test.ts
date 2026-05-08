import { expect } from 'chai'
import { describe, test } from 'mocha'
import { add_resource_ids } from '../../config/extra_macros'
import { fake_db_adapter } from '../../tests/fake_byo_query_fn'
import { fake_orma_schema } from '../../tests/fake_orma_schema'
import { fake_pool } from '../../tests/fake_pool'
import { mutate, query, welcome } from '../controllers'
import { authenticate, make_token } from './auth'
import { fake_secret } from './auth_google.test'
import { ensure_perms } from './perms'

const fake_connection_edges = {
    reviews: [
        { from_entity: 'reviews', from_field: 'user_id', to_entity: 'users', to_field: 'id' },
        { from_entity: 'reviews', from_field: 'place_id', to_entity: 'places', to_field: 'id' }
    ],
    review_has_photos: [
        {
            from_entity: 'review_has_photos',
            from_field: 'review_id',
            to_entity: 'reviews',
            to_field: 'id'
        },
        {
            from_entity: 'review_has_photos',
            from_field: 'photo_id',
            to_entity: 'photos',
            to_field: 'id'
        }
    ],

    photos: [{ from_field: 'id', to_entity: 'review_has_photos', to_field: 'photo_id' }]
}

export const admin = 1
export const user = 2
const everyone = [admin, user]
const admin_only = [admin]
const disabled = [] as number[]
export const fake_ensure_permissions = async () => {}
export const fake_permission_entity = 'users'
export const fake_permission_field = 'user_id'
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
        const admin_token = await make_token(1, fake_secret)
        const user_token = await make_token(1, fake_secret)
        const t1 = await query(
            {
                body: {},
                headers: { authorization: `Bearer ${admin_token}` }
            },
            {
                pool: fake_pool,
                connection_edges: fake_connection_edges,
                orma_schema: fake_orma_schema,
                db_type: fake_db_adapter as any
            },
            {
                jwt_secret: fake_secret,
                role_has_perms: fake_role_has_permissions,
                role_ids: [1],
                permission_entity: fake_permission_entity,
                permission_field: fake_permission_field,
                is_admin: false,
                allowed_values: []
            }
        )
        const t2 = await mutate(
            {
                body: {},
                headers: { authorization: `Bearer ${user_token}` }
            },
            {
                pool: fake_pool,
                connection_edges: fake_connection_edges,
                orma_schema: fake_orma_schema,
                db_type: fake_db_adapter as any
            },
            {
                jwt_secret: fake_secret,
                role_has_perms: fake_role_has_permissions,
                role_ids: [2],
                permission_entity: fake_permission_entity,
                permission_field: fake_permission_field,
                is_admin: false,
                allowed_values: []
            },
            add_resource_ids
        )

        expect(t1).to.deep.equal({})
        expect(t2).to.equal(undefined)

        let err = undefined
        let err2 = undefined
        try {
            const t1 = await query(
                {},
                {
                    pool: fake_pool,
                    connection_edges: fake_connection_edges,
                    orma_schema: fake_orma_schema,
                    db_type: fake_db_adapter as any
                },
                {
                    jwt_secret: fake_secret,
                    role_has_perms: fake_role_has_permissions,
                    role_ids: [],
                    permission_entity: fake_permission_entity,
                    permission_field: fake_permission_field,
                    is_admin: false,
                    allowed_values: []
                }
            )
        } catch (error) {
            err = error
        }
        try {
            const t2 = await mutate(
                { body: {} },
                {
                    pool: fake_pool,
                    connection_edges: fake_connection_edges,
                    orma_schema: fake_orma_schema,
                    db_type: fake_db_adapter as any
                },
                {
                    jwt_secret: fake_secret,
                    role_has_perms: fake_role_has_permissions,
                    role_ids: [],
                    permission_entity: fake_permission_entity,
                    permission_field: fake_permission_field,
                    is_admin: false,
                    allowed_values: []
                },
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
            await make_token(1, undefined as any)
            expect(true).to.equal(false)
        } catch (error: unknown) {
            expect((error as Error).message.length > 0).to.equal(true)
        }
    })
    test('authenticate token can reject', async () => {
        try {
            await authenticate({ headers: { authorization: 'Bearer oops' } }, 'secret')
            expect(true).to.equal(false)
        } catch (error: unknown) {
            expect((error as Error).message.length > 0).to.equal(true)
        }
    })
    test('Requre perm for reading', async () => {
        try {
            await ensure_perms(
                { users: { id: true, user_has_roles: { id: true, users: { id: true } } } },
                [1],
                'query',
                fake_role_has_permissions
            )
            expect(true).to.equal(false)
        } catch (error: unknown) {
            expect((error as Error).message.length > 0).to.deep.equal(true)
        }
        try {
            await ensure_perms({ users: { id: true } }, [2], 'query', fake_role_has_permissions)
            expect(true).to.equal(false)
        } catch (error: unknown) {
            expect((error as Error).message.length > 0).to.deep.equal(true)
        }

        try {
            await ensure_perms({ users: { id: true } }, [2], 'mutate', fake_role_has_permissions)
            expect(true).to.equal(false)
        } catch (error: unknown) {
            expect((error as Error).message.length > 0).to.deep.equal(true)
        }
    })

    test('Welcome', async () => {
        const result = await welcome('')
        expect(result.length > 0).to.deep.equal(true)
    })
})
