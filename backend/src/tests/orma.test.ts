import { expect } from 'chai'
import cuid from 'cuid'
import { beforeEach, describe, test } from 'mocha'

import sinon from 'sinon'
import fs from 'fs'
import { orma_schema } from '../../../common/orma_schema'
import * as orma from '../config/orma'
import * as orma_original from 'orma'
import { identity, pool } from '../config/pg'
import { populated_data, prepopulate } from '../scripts/prepopulate'

describe('Crud Orma', () => {
    test('Introspection', async () => {
        sinon.stub(orma_original, 'orma_introspect').callsFake(async () => orma_schema)
        sinon.stub(fs, 'writeFileSync').callsFake(() => {})
        await orma.introspect()
    })
    test('Validation', async () => {
        sinon.stub(orma_original, 'orma_mutate').callsFake(async _ => 'called')
        let err = undefined
        try {
            const mutation = {
                $operation: 'create',
                users: [{ oops: 'oops' }]
            }

            await orma.mutate_handler(mutation)
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
            query: () => ({ rows: [] })
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
        await prepopulate()
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
        await prepopulate()
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

        await orma.mutate_handler(mutation)

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

        const result: any = await orma.query_handler(body)
        sinon.restore()
        expect(result.users.length).to.equal(1)
    })
})
