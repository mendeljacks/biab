import { expect } from 'chai'
import { describe, test } from 'mocha'

import * as orma_original from 'orma'
import sinon from 'sinon'
import { add_resource_ids } from '../config/extra_macros'
import * as orma from '../config/orma'
import { identity } from '../config/pg'
import { prepopulate } from '../scripts/prepopulate'
import { fake_byo_query_fn } from './fake_byo_query_fn'
import { fake_orma_schema } from './fake_orma_schema'
import { fake_pool } from './fake_pool'
import { fake_trans } from './fake_trans'

const fake_prepopulated_data = {
    roles: [
        { id: 1, name: 'admin' },
        { id: 2, name: 'user' }
    ],
    users: [
        {
            id: 1,
            email: 'admin',
            password: '$2b$10$Cj.60A.stZiMz7wUpXAtAOeZHsqAwme3G1Qoxv0T.74tXOV3nlzca'
        }
    ],
    user_has_roles: [{ id: 1, user_id: 1, role_id: 1 }]
}

describe('Crud Orma', () => {
    test('Validation', async () => {
        sinon.stub(orma_original, 'orma_mutate').callsFake(async _ => 'called')
        let err = undefined
        try {
            const mutation = {
                $operation: 'create',
                users: [{ oops: 'oops' }]
            }

            await orma.mutate_handler(
                mutation,
                fake_pool,
                fake_orma_schema,
                fake_byo_query_fn,
                fake_trans,
                add_resource_ids
            )
        } catch (e) {
            err = e
        }
        sinon.restore()
        expect(err.length > 0).to.deep.equal(true)
    })
    test(identity.name, () => {
        expect(identity(1)).to.equal(1)
    })
    test(prepopulate.name, async () => {
        // in this case there will be nothing todo
        sinon.stub(orma, 'query_handler').callsFake(async mutation => {
            return { roles: fake_prepopulated_data.roles }
        })
        sinon.stub(orma, 'mutate_handler').callsFake(async mutation => {
            return {}
        })
        await prepopulate(
            fake_prepopulated_data,
            fake_pool,
            fake_orma_schema,
            fake_byo_query_fn,
            fake_trans,
            {}
        )
        sinon.restore()
    })
    test(prepopulate.name, async () => {
        // in this case it will try to create two rows
        sinon.stub(orma, 'query_handler').callsFake(async mutation => {
            return { roles: [] }
        })
        sinon.stub(orma, 'mutate_handler').callsFake(async mutation => {
            return {}
        })
        await prepopulate(
            fake_prepopulated_data,
            fake_pool,
            fake_orma_schema,
            fake_byo_query_fn,
            fake_trans,
            {}
        )
        sinon.restore()
    })
    test('Create a user select created_at updated_at', async () => {
        sinon.stub(orma, 'byo_query_fn').callsFake(async sqls => sqls.map(el => [{}]))
        const user = {
            $operation: 'create',
            email: 'mendeljacks@gmail.com',
            password: 'password'
        }
        const role = {
            $operation: 'update',
            id: 1,
            name: 'admin2'
        }
        const mutation = {
            users: [user],
            roles: [role]
        }

        await orma.mutate_handler(
            mutation,
            fake_pool,
            fake_orma_schema,
            fake_byo_query_fn,
            fake_trans,
            add_resource_ids
        )

        const body = {
            users: {
                id: true,
                email: true,
                password: true,
                first_name: true,
                last_name: true,
                phone: true,
                created_at: true,
                updated_at: true
            }
        }

        const connection_edges = {}

        const result: any = await orma.query_handler(
            body,
            fake_pool,
            fake_orma_schema,
            fake_byo_query_fn,
            connection_edges
        )
        sinon.restore()
        expect(result.users.length).to.equal(1)
    })
})
