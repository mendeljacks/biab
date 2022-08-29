import { ConnectionEdges } from 'orma/src/query/macros/where_connected_macro'
import { mutate_handler, Pool, query_handler } from '../config/orma'
import { authenticate } from './auth/auth'
import { ensure_ownership } from './auth/ownership'
import { ensure_perms, RoleHasPerms } from './auth/perms'

export const welcome = async (to: string) => `Welcome to ${to}!`

export const query = async (
    req,
    jwt_secret: string,
    pool: Pool,
    connection_edges: ConnectionEdges,
    role_has_perms: RoleHasPerms
) => {
    const token_content = await authenticate(req, jwt_secret)
    await ensure_perms(req.body, token_content, 'query', role_has_perms)
    await ensure_ownership(req.body, token_content, 'query', connection_edges, pool)
    return query_handler(req.body, pool)
}

export const mutate = async (
    req,
    jwt_secret: string,
    pool: Pool,
    connection_edges: ConnectionEdges,
    role_has_perms: RoleHasPerms
) => {
    const token_content = await authenticate(req, jwt_secret)
    await ensure_perms(req.body, token_content, 'mutate', role_has_perms)
    await ensure_ownership(req.body, token_content, 'mutate', connection_edges, pool)
    return mutate_handler(req.body, pool)
}
