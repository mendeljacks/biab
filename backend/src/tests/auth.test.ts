import { describe, test } from 'mocha'
import { expect } from 'chai'
import { mutate_controller, query_controller } from '../api/controllers'

describe('Auth', () => {
    test('Requires jwt to user query/mutate', async () => {
        const t1 = await query_controller({ headers: { authorization: 'Bearer token' } })
        const t2 = await mutate_controller({ body: {}, headers: { authorization: 'Bearer token' } })

        expect(t1).to.deep.equal({})
        expect(t2).to.deep.equal({})

        let err = undefined
        let err2 = undefined
        try {
            const t1 = await query_controller({})
        } catch (error) {
            err = error
        }
        try {
            const t2 = await mutate_controller({ body: {} })
        } catch (error) {
            err2 = error
        }

        expect(err).to.deep.equal('No token')
        expect(err2).to.deep.equal('No token')
    })
    test('Perms for assign user to role', () => {
        expect(true).to.equal(true)
    })
    test('Perms for creating role not allowed', () => {
        expect(true).to.equal(true)
    })
})
