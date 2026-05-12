import { apply_supersede_macro } from 'orma/build/query/macros/supersede_macro'
import { DbConfig, get_db_adapter, get_trans_fn, mutate_handler, MutateHandlerOptions, query_handler } from '../config/orma'
import { authenticate } from './auth/auth'
import { ensure_ownership } from './auth/ownership'
import { ensure_perms, RoleHasPerms } from './auth/perms'
import { validate_orma_query } from './auth/validate'

export type RoleIds = (string | number)[]

export type OwnershipConfig = {
    jwt_secret: string
    role_has_perms: RoleHasPerms
    role_ids: RoleIds
    is_admin: boolean
    permission_entity: string
    permission_field: string
    allowed_values: (string | number)[]
}

export const welcome = async (to: string) => `Welcome to ${to}!`

export const query = async (req: Record<string, any>, db_config: DbConfig, ownership_config: OwnershipConfig) => {
    const { pool, connection_edges, orma_schema, db_type } = db_config
    const { jwt_secret, role_has_perms, role_ids, is_admin, permission_entity, permission_field, allowed_values } =
        ownership_config
    const db_adapter = get_db_adapter(db_type)
    const token_content = await authenticate(req, jwt_secret)
    await validate_orma_query(req.body, orma_schema)
    await ensure_perms(req.body, role_ids, 'query', role_has_perms)
    await ensure_ownership(db_config, is_admin, permission_entity, permission_field, allowed_values, req.body, 'query')
    return query_handler(req.body, orma_schema, db_adapter(pool), connection_edges)
}

export const mutate = async (
    req: Record<string, any>,
    db_config: DbConfig,
    ownership_config: OwnershipConfig,
    extra_macros: (mutation: any) => void,
    mutate_options: MutateHandlerOptions = {}
) => {
    const { pool, connection_edges, orma_schema, db_type } = db_config
    const { jwt_secret, role_has_perms, role_ids, is_admin, permission_entity, permission_field, allowed_values } =
        ownership_config
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
    await ensure_ownership(db_config, is_admin, permission_entity, permission_field, allowed_values, req.body, 'mutate')
    return mutate_handler(req.body, pool, orma_schema, db_adapter, trans, extra_macros, mutate_options)
}

export const controller = async (
    db_config: DbConfig,
    ownership_config: OwnershipConfig,
    mode: 'query' | 'mutate',
    req: Record<string, any>,
    extra_macros?: (mutation: any) => void,
    mutate_options?: MutateHandlerOptions
) => {
    if (mode === 'mutate') {
        return mutate(req, db_config, ownership_config, extra_macros!, mutate_options)
    }
    return query(req, db_config, ownership_config)
}
