import { ConnectionEdges, OrmaSchema } from 'orma'
import { mutation_entity_deep_for_each } from 'orma/build/mutate/helpers/mutate_helpers'
import { query_for_each } from 'orma/build/query/query_helpers'
import { Pool } from '../../config/orma'
import { TokenContent } from './auth'

export type EnsureOwnershipFn = (
    query: any,
    token_content: TokenContent,
    mode: 'query' | 'mutate',
    connection_edges: ConnectionEdges,
    pool: Pool,
    orma_schema: OrmaSchema
) => Promise<any>

export type RoleHasPerms = {
    [table_name: string]: {
        create: number[]
        read: number[]
        update: number[]
        delete: number[]
    }
}

export const ensure_perms = async (
    query: Record<string, any>,
    role_ids: (string | number)[],
    mode: 'query' | 'mutate',
    role_has_perms: RoleHasPerms
) => {
    let needed_perms = {}
    const deep_for_each = mode === 'query' ? query_for_each : mutation_entity_deep_for_each
    deep_for_each(query, (value, _path, entity_name) => {
        if (entity_name.startsWith('$')) {
            return
        }
        if (!needed_perms[entity_name]) needed_perms[entity_name] = {}
        if (!Object.keys(role_has_perms).includes(entity_name)) {
            throw new Error(`No permissions defined for entity ${entity_name}`)
        }
        needed_perms[entity_name][value.$operation || 'read'] = true
    })

    const table_names = Object.keys(needed_perms)
    const missing_perms = table_names.reduce((acc: string[], table_name: string) => {
        const operations = Object.keys(needed_perms[table_name])
        for (const operation of operations) {
            if (!role_has_perms[table_name][operation].some((role_id: string | number) => role_ids.includes(role_id))) {
                acc.push(table_name)
            }
        }
        return acc
    }, [])

    if (missing_perms.length > 0) {
        return Promise.reject({
            message: `Additional read permissions required: ${missing_perms.join(', ')}`,
            additional_data: {
                needed_read_permissions: [...table_names],
                missing_read_permissions: missing_perms
            }
        })
    }

    return Promise.resolve()
}
