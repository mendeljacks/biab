import { orma_mutate_prepare } from 'orma/src'
import { push_path } from 'orma/src/helpers/push_path'
import { OrmaSchema } from 'orma/src/introspector/introspector'
import { get_mutation_connected_errors } from 'orma/src/mutate/verifications/mutation_connected'
import { ConnectionEdges } from 'orma/src/query/macros/where_connected_macro'
import { WhereConnected } from 'orma/src/types/query/query_types'
import { byo_query_fn, Pool } from '../../config/orma'
import { TokenContent } from './auth'

export const admin = 1
export const user = 2

export const ensure_ownership = async (
    query,
    token_content: TokenContent,
    mode: 'query' | 'mutate',
    connection_edges: ConnectionEdges,
    pool: Pool,
    orma_schema: OrmaSchema
) => {
    if (token_content.role_ids.includes(admin)) {
        return []
    }
    const schema = orma_schema as any as OrmaSchema
    let errors =
        mode === 'query'
            ? await get_query_ownership_errors(query, token_content)
            : await get_mutate_ownership_errors(
                  query,
                  token_content,
                  schema,
                  connection_edges,
                  pool
              )

    if (errors.length > 0) {
        throw errors
    }
}

export const array_equals = (a, b) => {
    return (
        Array.isArray(a) &&
        Array.isArray(b) &&
        a.length === b.length &&
        a.every((val, index) => val === b[index])
    )
}

const get_mutate_ownership_errors = async (
    mutation,
    token_content: TokenContent,
    orma_schema: OrmaSchema,
    connection_edges: ConnectionEdges,
    pool: Pool
) => {
    const mutation_plan = orma_mutate_prepare(orma_schema, mutation)
    const connected_errors = await get_mutation_connected_errors(
        orma_schema,
        connection_edges,
        async statements => byo_query_fn(statements, pool),
        [{ $entity: 'users', $field: 'id', $values: [token_content.user_id] }],
        mutation_plan.mutation_pieces
    )
    return connected_errors
}

const get_query_ownership_errors = async (query, token_content: TokenContent) => {
    const user_id = token_content.user_id
    const where_connected: WhereConnected<OrmaSchema> = query.$where_connected ?? []

    // combine user ids from the $where_connected clause
    const given_user_ids = where_connected.reduce((acc, { $entity, $field, $values }) => {
        if ($entity === 'users' && $field === 'id') {
            acc.push(...$values)
        }
        return acc
    }, [] as (string | number)[])

    if (given_user_ids.length === 0) {
        // default to the maximum allowed users for this user. If the magic perm is present, this is all users
        // so we dont add any $where_connected. Otherwise, the user only has access to one user
        push_path(
            ['$where_connected'],
            { $entity: 'users', $field: 'id', $values: [user_id] },
            query
        )
    } else {
        // verify that the given users are permitted for this account
        const is_only_this_user = array_equals(given_user_ids, [user_id])

        if (!is_only_this_user) {
            return [
                {
                    message: 'Insufficient permission to view other users data'
                }
            ]
        }
    }

    return []
}
