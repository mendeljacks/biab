import { expect } from 'chai'
import cuid from 'cuid'
import { beforeEach, describe, test } from 'mocha'
import * as orma from 'orma/src/index'
import sinon from 'sinon'
import fs from 'fs'
import { orma_schema } from '../../../common/orma_schema'
import { introspect, mutate_handler, query_handler } from '../config/orma'

describe('Crud Orma', () => {
    beforeEach(async () => {
        const { users } = await query_handler({
            users: {
                id: true,
                user_has_roles: {
                    id: true,
                    roles: {
                        id: true
                    }
                }
            }
        })
        await mutate_handler({
            $operation: 'delete',
            users
        })
    })
    test('Introspection', async () => {
        sinon.stub(orma, 'orma_introspect').callsFake(async () => orma_schema)
        sinon.stub(fs, 'writeFileSync').callsFake(() => {})
        await introspect()
    })
    test('Validation', async () => {
        let err = undefined
        try {
            const mutation = {
                $operation: 'create',
                users: [{ oops: 'oops' }]
            }

            await mutate_handler(mutation)
        } catch (e) {
            err = e
        }
        expect(err.length > 0).to.deep.equal(true)
    })
    test('Create a user', async () => {
        const user = {
            id: { $guid: cuid() },
            email: 'mendeljacks@gmail.com',
            password: 'password',
            first_name: 'Mendel',
            last_name: 'Jackson',
            phone: '1234567890'
        }
        const mutation = {
            $operation: 'create',
            users: [user]
        }

        const mutate_response = await mutate_handler(mutation)
        expect(mutate_response.users.length).to.equal(1)
    })
    test('Create a user select created_at updated_at', async () => {
        const user = {
            id: { $guid: cuid() },
            email: 'mendeljacks@gmail.com',
            password: 'password'
        }
        const mutation = {
            $operation: 'create',
            users: [user]
        }

        await mutate_handler(mutation)

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

        const result: any = await query_handler(body)

        expect(result.users[0].id).to.be.a('number')
        expect(result?.users[0].created_at).to.be.a('string')
        expect(result?.users[0].updated_at).to.be.a('string')
    })
    test('Create a user nested', async () => {
        const user = {
            // id: { $guid: cuid() },
            email: 'mendeljacks@gmail.com',
            password: 'password',
            first_name: 'Mendel',
            last_name: 'Jackson',
            phone: '1234567890',
            user_has_roles: [
                {
                    // id: { $guid: cuid() },
                    roles: [
                        {
                            // id: { $guid: cuid() },
                            name: 'admin'
                        }
                    ]
                }
            ]
        }
        const mutation = {
            $operation: 'create',
            users: [user]
        }

        const mutate_response = await mutate_handler(mutation)
        expect(mutate_response.users.length).to.equal(1)
    })
})
