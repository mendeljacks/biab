import { OrmaSchema, orma_mutate_prepare, ConnectionEdges } from 'orma'
import { get_mutation_connected_errors } from 'orma/build/mutate/verifications/mutation_connected'
import { push_path } from 'orma/build/helpers/push_path'
import { query_for_each } from 'orma/build/query/query_helpers'
import { TokenContent } from './auth'
import { DbAdapter } from '../../config/orma'

export type OwnershipConfig = {
    admin_role_id: number
    publicly_readable: string[]
    permission_entity: string
    permission_field: string
}

export const make_ensure_ownership = (config: OwnershipConfig, db_adapter: DbAdapter) => {
    const { admin_role_id, publicly_readable, permission_entity, permission_field } = config

    return async (
        query: any,
        token_content: TokenContent,
        mode: 'query' | 'mutate',
        connection_edges: ConnectionEdges,
        pool: any,
        orma_schema: OrmaSchema
    ) => {
        if (token_content.role_ids.includes(admin_role_id)) {
            return []
        }

        const errors =
            mode === 'query'
                ? await get_query_ownership_errors(
                      query,
                      token_content,
                      publicly_readable,
                      permission_entity,
                      permission_field
                  )
                : await get_mutate_ownership_errors(
                      query,
                      token_content,
                      orma_schema,
                      connection_edges,
                      pool,
                      db_adapter,
                      permission_entity,
                      permission_field
                  )

        if (errors.length > 0) {
            throw errors
        }
    }
}

const get_mutate_ownership_errors = async (
    mutation: any,
    token_content: TokenContent,
    orma_schema: OrmaSchema,
    connection_edges: ConnectionEdges,
    pool: any,
    db_adapter: DbAdapter,
    permission_entity: string,
    permission_field: string
) => {
    const mutation_plan = orma_mutate_prepare(orma_schema, mutation)

    const connected_errors = await get_mutation_connected_errors(
        orma_schema,
        connection_edges,
        db_adapter(pool),
        [] as any,
        [{ $entity: permission_entity, $field: permission_field, $values: [token_content.user_id] }],
        mutation_plan.mutation_pieces
    )
    return connected_errors
}

const get_query_table_names = (query: any): string[] => {
    const table_names = new Set<string>()
    query_for_each(query, (value: any, path: any, entity_name: string) => {
        table_names.add(entity_name)
    })
    return [...table_names]
}

const array_equals = (a: any[], b: any[]) =>
    Array.isArray(a) &&
    Array.isArray(b) &&
    a.length === b.length &&
    a.every((val, index) => val === b[index])

const get_query_ownership_errors = async (
    query: any,
    token_content: TokenContent,
    publicly_readable: string[],
    permission_entity: string,
    permission_field: string
): Promise<{ message: string }[]> => {
    const table_names = get_query_table_names(query)
    if (table_names.every(name => publicly_readable.includes(name))) {
        return []
    }

    const user_id = token_content.user_id
    const where_connected: any[] = query.$where_connected ?? []

    const given_user_ids = where_connected.reduce(
        (acc: (string | number)[], { $entity, $field, $values }: any) => {
            if ($entity === permission_entity && $field === permission_field) {
                acc.push(...$values)
            }
            return acc
        },
        []
    )

    if (given_user_ids.length === 0) {
        push_path(
            ['$where_connected'],
            { $entity: permission_entity, $field: permission_field, $values: [user_id] },
            query
        )
    } else {
        if (!array_equals(given_user_ids, [user_id])) {
            return [{ message: 'Insufficient permission to view other users data' }]
        }
    }

    return []
}
