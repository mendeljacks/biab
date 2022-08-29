import { describe, test } from 'mocha'
import { expect } from 'chai'
import { ensure_perms } from '../../api/auth/perms'
import { fake_role_has_permissions } from './auth.test'
import { admin, user } from '../../api/auth/ownership'

describe('Table perms', () => {
    test(ensure_perms.name, async () => {
        const result = await ensure_perms(
            { users: { id: true } },
            { user_id: 1, role_ids: [admin] },
            'query',
            fake_role_has_permissions
        )
        expect(result).to.equal(undefined)
    })
    test(ensure_perms.name, async () => {
        try {
            const result = await ensure_perms(
                { migrations: { id: true } },
                { user_id: 1, role_ids: [user] },
                'query',
                fake_role_has_permissions
            )
            expect(true).to.equal(false)
        } catch (error) {
            expect(error.message.length > 0).to.equal(true)
        }
    })
})
