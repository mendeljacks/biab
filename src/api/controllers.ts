import { OrmaSchema } from 'orma/src/introspector/introspector'
import { ConnectionEdges } from 'orma/src/query/macros/where_connected_macro'
import { mutate_handler, Pool, query_handler } from '../config/orma'
import { authenticate } from './auth/auth'
import { EnsureOwnershipFn, ensure_perms, RoleHasPerms } from './auth/perms'
import { validate_orma_query } from './auth/validate'

export const welcome = async (to: string) => `Welcome to ${to}!`

export const query = async (
    req,
    jwt_secret: string,
    pool: Pool,
    connection_edges: ConnectionEdges,
    role_has_perms: RoleHasPerms,
    orma_schema: OrmaSchema,
    ensure_ownership: EnsureOwnershipFn,
    byo_query_fn: Function
) => {
    const token_content = await authenticate(req, jwt_secret)
    await validate_orma_query(req.body, orma_schema)
    await ensure_perms(req.body, token_content, 'query', role_has_perms)
    await ensure_ownership(req.body, token_content, 'query', connection_edges, pool, orma_schema)
    return query_handler(req.body, pool, orma_schema, byo_query_fn)
}

export const mutate = async (
    req,
    jwt_secret: string,
    pool: Pool,
    connection_edges: ConnectionEdges,
    role_has_perms: RoleHasPerms,
    orma_schema: OrmaSchema,
    ensure_ownership: EnsureOwnershipFn,
    byo_query_fn: Function,
    trans: Function,
    extra_macros: Function
) => {
    const token_content = await authenticate(req, jwt_secret)
    await ensure_perms(req.body, token_content, 'mutate', role_has_perms)
    await ensure_ownership(req.body, token_content, 'mutate', connection_edges, pool, orma_schema)
    return mutate_handler(req.body, pool, orma_schema, byo_query_fn, trans, extra_macros)
}
