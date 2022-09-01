import { expect } from 'chai'
import { describe, test } from 'mocha'
import { array_equals, clone } from 'orma/src/helpers/helpers'
import { OrmaSchema } from 'orma/src/introspector/introspector'
import { WhereConnected } from 'orma/src/types/query/query_types'
import * as orma from '../../config/orma'
import sinon from 'sinon'
import { admin, ensure_ownership, user } from '../../api/auth/ownership'
import { fake_pool } from '../orma.test'
import { fake_orma_schema } from '../fake_orma_schema'

export const fake_connection_edges = {
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

describe('Ownership', () => {
    test(array_equals.name, () => {
        expect(array_equals([1, 2, 3], [1, 2, 3])).to.be.true
    })
    test('Ownership adds where connected when not provided for users but not admin', async () => {
        const original_query = {
            photos: { id: true }
        } as any
        let query = clone(original_query)

        // Admin not restricted to ownership
        const token_content = { user_id: 1, role_ids: [admin] }
        const result = await ensure_ownership(
            query,
            token_content,
            'query',
            fake_connection_edges,
            fake_pool,
            fake_orma_schema
        )
        expect(query).to.deep.equal(original_query)
        expect(result).to.deep.equal([])

        // Make sure user 1 cannot see photos belonging to user 2
        const token_content2 = { user_id: 1, role_ids: [user] }
        const result2 = await ensure_ownership(
            query,
            token_content2,
            'query',
            fake_connection_edges,
            fake_pool,
            fake_orma_schema
        )
        expect(query.$where_connected.length > 0).to.deep.equal(true)
        expect(result2).to.equal(undefined)
    })
    test('You cannot provide someone else in where connected', async () => {
        // Test for error when provided wrong where connected
        const original_query = {
            $where_connected: [
                { $entity: 'users', $field: 'id', $values: [2] }
            ] as WhereConnected<OrmaSchema>,
            photos: {
                id: true
            }
        } as any
        let query = clone(original_query)

        const token_content = { user_id: 1, role_ids: [user] }
        try {
            const result = await ensure_ownership(
                query,
                token_content,
                'query',
                fake_connection_edges,
                fake_pool,
                fake_orma_schema
            )
            expect(true).to.equal(false)
        } catch (errors) {
            expect(errors.length > 0).to.be.true
            expect(query).to.deep.equal(original_query)
        }
    })
    test('You cannot trick system by same table different column name', async () => {
        const original_query = {
            $where_connected: [
                { $entity: 'users', $field: 'resource_id', $values: [2] }
            ] as WhereConnected<OrmaSchema>,
            photos: {
                id: true
            }
        } as any
        let query = clone(original_query)

        const token_content = { user_id: 1, role_ids: [user] }
        const result = await ensure_ownership(
            query,
            token_content,
            'query',
            fake_connection_edges,
            fake_pool,
            fake_orma_schema
        )
        expect(query).to.deep.equal({
            $where_connected: [
                { $entity: 'users', $field: 'resource_id', $values: [2] },
                { $entity: 'users', $field: 'id', $values: [1] }
            ],
            photos: { id: true }
        })
        expect(result).to.equal(undefined)
    })
    test('You can provide your own user in a where connected', async () => {
        // Test for error when provided wrong where connected
        const original_query = {
            $where_connected: [
                { $entity: 'users', $field: 'id', $values: [1] }
            ] as WhereConnected<OrmaSchema>,
            photos: {
                id: true
            }
        } as any
        let query = clone(original_query)

        const token_content = { user_id: 1, role_ids: [user] }
        const result = await ensure_ownership(
            query,
            token_content,
            'query',
            fake_connection_edges,
            fake_pool,
            fake_orma_schema
        )
        expect(query).to.deep.equal(original_query)
        expect(result).to.equal(undefined)
    })
    test('A user can add photos to a review that belongs to them', async () => {
        sinon.stub(orma, 'byo_query_fn').callsFake(async sqls => {
            return sqls.map(el => [{ id: 1 }])
        })
        const original_mutation = {
            review_has_photos: [{ review_id: 1, photos: [{ url: 'http://mypic' }] }]
        } as any
        let mutation = clone(original_mutation)

        const token_content = { user_id: 1, role_ids: [user] }
        const result = await ensure_ownership(
            mutation,
            token_content,
            'mutate',
            fake_connection_edges,
            fake_pool,
            fake_orma_schema
        )
        sinon.restore()
        expect(result).to.equal(undefined)
    })
    test('A user can not add photos to a review that belongs to someone else', async () => {
        sinon.stub(orma, 'byo_query_fn').callsFake(async sqls => {
            return sqls.map(el => [{ id: 2 }])
        })
        const original_mutation = {
            review_has_photos: [{ review_id: 1, photos: [{ url: 'http://mypic' }] }]
        } as any
        let mutation = clone(original_mutation)

        const token_content = { user_id: 1, role_ids: [user] }
        try {
            const result = await ensure_ownership(
                mutation,
                token_content,
                'mutate',
                fake_connection_edges,
                fake_pool,
                fake_orma_schema
            )
            expect(true).to.equal(false)
        } catch (error) {
            expect(error.length > 0).to.be.true
        }
        sinon.restore()
    })
})
