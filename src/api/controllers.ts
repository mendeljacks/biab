import { ConnectionEdges, OrmaSchema } from 'orma'
import { apply_supersede_macro } from 'orma/build/query/macros/supersede_macro'
import { DbAdapter, mutate_handler, Pool, query_handler } from '../config/orma'
import { authenticate } from './auth/auth'
import { ensure_perms, EnsureOwnershipFn, RoleHasPerms } from './auth/perms'
import { validate_orma_query } from './auth/validate'

export type RoleIds = (string | number)[]

export const welcome = async (to: string) => `Welcome to ${to}!`

export const query = async (
    req,
    jwt_secret: string,
    pool: Pool,
    connection_edges: ConnectionEdges,
    role_has_perms: RoleHasPerms,
    orma_schema: OrmaSchema,
    ensure_ownership: EnsureOwnershipFn,
    db_adapter: DbAdapter,
    role_ids: RoleIds
) => {
    const token_content = await authenticate(req, jwt_secret)
    await validate_orma_query(req.body, orma_schema)
    await ensure_perms(req.body, role_ids, 'query', role_has_perms)
    await ensure_ownership(req.body, token_content, 'query', connection_edges, pool, orma_schema)
    return query_handler(req.body, pool, orma_schema, db_adapter, connection_edges)
}

export const mutate = async (
    req,
    jwt_secret: string,
    pool: Pool,
    connection_edges: ConnectionEdges,
    role_has_perms: RoleHasPerms,
    orma_schema: OrmaSchema,
    ensure_ownership: EnsureOwnershipFn,
    db_adapter: DbAdapter,
    trans: Function,
    extra_macros: Function,
    role_ids: RoleIds
) => {
    await apply_supersede_macro(
        req.body,
        async body => {
            const headers = req.headers
            const result = await query(
                { body, headers },
                jwt_secret,
                pool,
                connection_edges,
                role_has_perms,
                orma_schema,
                ensure_ownership,
                db_adapter,
                role_ids
            )

            return result
        },
        orma_schema
    )
    const token_content = await authenticate(req, jwt_secret)
    await ensure_perms(req.body, role_ids, 'mutate', role_has_perms)
    await ensure_ownership(req.body, token_content, 'mutate', connection_edges, pool, orma_schema)
    return mutate_handler(req.body, pool, orma_schema, db_adapter, trans, extra_macros)
}
