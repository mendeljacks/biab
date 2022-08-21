import { describe, test } from 'mocha'
import { expect } from 'chai'
import { admin, ensure_perms, user } from '../../api/auth'

describe('Table perms', () => {
    test(ensure_perms.name, async () => {
        const result = await ensure_perms(
            { users: { id: true } },
            { user_id: 1, role_ids: [admin] },
            'query'
        )
        expect(result).to.equal(undefined)
    })
    test(ensure_perms.name, async () => {
        try {
            const result = await ensure_perms(
                { migrations: { id: true } },
                { user_id: 1, role_ids: [user] },
                'query'
            )
            expect(true).to.equal(false)
        } catch (error) {
            expect(error.message.length > 0).to.equal(true)
        }
    })
})
