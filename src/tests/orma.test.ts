import { expect } from 'chai'
import { describe, test } from 'mocha'

import fs from 'fs'
import * as orma_original from 'orma'
import sinon from 'sinon'
import { orma_schema } from '../../orma_schema'
import * as orma from '../config/orma'
import { identity } from '../config/pg'
import { populated_data, prepopulate } from '../scripts/prepopulate'

export const fake_pool = {
    query: () => {
        return []
    },
    connect: () => ({ query: () => {}, release: () => {} })
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

            await orma.mutate_handler(mutation, fake_pool)
        } catch (e) {
            err = e
        }
        sinon.restore()
        expect(err.length > 0).to.deep.equal(true)
    })
    test(identity.name, () => {
        expect(identity(1)).to.equal(1)
    })
    test(orma.byo_query_fn.name, async () => {
        const response = await orma.byo_query_fn([{ sql_string: '' }], {
            query: () => ({ rows: [] }),
            connect: () => {}
        })
        expect(response.length).to.equal(1)
    })
    test(prepopulate.name, async () => {
        // in this case there will be nothing todo
        sinon.stub(orma, 'query_handler').callsFake(async mutation => {
            return { roles: populated_data.roles }
        })
        sinon.stub(orma, 'mutate_handler').callsFake(async mutation => {
            return {}
        })
        await prepopulate(fake_pool)
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
        await prepopulate(fake_pool)
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

        await orma.mutate_handler(mutation, fake_pool)

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

        const result: any = await orma.query_handler(body, fake_pool)
        sinon.restore()
        expect(result.users.length).to.equal(1)
    })
})
