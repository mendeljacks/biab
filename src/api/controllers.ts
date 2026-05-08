import { ConnectionEdges, OrmaSchema } from 'orma'
import { apply_supersede_macro } from 'orma/build/query/macros/supersede_macro'
import { DbType, get_db_adapter, get_trans_fn, mutate_handler, Pool, query_handler } from '../config/orma'
import { authenticate } from './auth/auth'
import { ensure_perms, EnsureOwnershipFn, RoleHasPerms } from './auth/perms'
import { validate_orma_query } from './auth/validate'

export type RoleIds = (string | number)[]

export type DbConfig = {
    pool: Pool
    connection_edges: ConnectionEdges
    orma_schema: OrmaSchema
    db_type: DbType
}

export type OwnershipConfig = {
    jwt_secret: string
    role_has_perms: RoleHasPerms
    ensure_ownership: EnsureOwnershipFn
    role_ids: RoleIds
}

export const welcome = async (to: string) => `Welcome to ${to}!`

export const query = async (req: Record<string, any>, db_config: DbConfig, ownership_config: OwnershipConfig) => {
    const { pool, connection_edges, orma_schema, db_type } = db_config
    const { jwt_secret, role_has_perms, ensure_ownership, role_ids } = ownership_config
    const db_adapter = get_db_adapter(db_type)
    const token_content = await authenticate(req, jwt_secret)
    await validate_orma_query(req.body, orma_schema)
    await ensure_perms(req.body, role_ids, 'query', role_has_perms)
    await ensure_ownership(req.body, token_content, 'query', connection_edges, orma_schema)
    return query_handler(req.body, orma_schema, db_adapter(pool), connection_edges)
}

export const mutate = async (
    req: Record<string, any>,
    db_config: DbConfig,
    ownership_config: OwnershipConfig,
    extra_macros: (mutation: any) => void
) => {
    const { pool, connection_edges, orma_schema, db_type } = db_config
    const { jwt_secret, role_has_perms, ensure_ownership, role_ids } = ownership_config
    const db_adapter = get_db_adapter(db_type)
    const trans = get_trans_fn(db_type)
    await apply_supersede_macro(
        req.body,
        async (body: any) => {
            const headers = req.headers
            const result = await query({ body, headers }, db_config, ownership_config)

            return result
        },
        orma_schema
    )
    const token_content = await authenticate(req, jwt_secret)
    await ensure_perms(req.body, role_ids, 'mutate', role_has_perms)
    await ensure_ownership(req.body, token_content, 'mutate', connection_edges, orma_schema)
    return mutate_handler(req.body, pool, orma_schema, db_adapter, trans, extra_macros)
}

export const controller = async (
    db_config: DbConfig,
    ownership_config: OwnershipConfig,
    mode: 'query' | 'mutate',
    req: Record<string, any>,
    extra_macros?: (mutation: any) => void
) => {
    if (mode === 'mutate') {
        return mutate(req, db_config, ownership_config, extra_macros!)
    }
    return query(req, db_config, ownership_config)
}
