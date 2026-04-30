import { ConnectionEdges, OrmaSchema, orma_mutate_prepare } from 'orma'
import { push_path } from 'orma/build/helpers/push_path'
import { get_mutation_connected_errors } from 'orma/build/mutate/verifications/mutation_connected'
import { DbAdapter } from '../../config/orma'

export const ensure_ownership = async (
    db_adapter: DbAdapter,
    is_admin: boolean,
    permission_entity: string,
    permission_field: string,
    allowed_values: (string | number)[],
    query: any,
    mode: 'query' | 'mutate',
    connection_edges: ConnectionEdges,
    pool: any,
    orma_schema: OrmaSchema
) => {
    if (is_admin) {
        return []
    }
    if (allowed_values.length === 0) {
        throw [{ message: `You do not have access to any ${permission_entity}` }]
    }
    const errors =
        mode === 'query'
            ? await get_query_ownership_errors(query, allowed_values, permission_entity, permission_field)
            : await get_mutate_ownership_errors(
                  query,
                  allowed_values,
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

const get_mutate_ownership_errors = async (
    mutation: any,
    allowed_values: (string | number)[],
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
        [
            {
                $entity: permission_entity,
                $field: permission_field,
                $values: allowed_values
            }
        ],
        mutation_plan.mutation_pieces
    )
    return connected_errors
}

const array_subset = (subset: any[], superset: any[]) =>
    Array.isArray(subset) && Array.isArray(superset) && subset.every(val => superset.includes(val))

const get_query_ownership_errors = async (
    query: any,
    allowed_values: (string | number)[],
    permission_entity: string,
    permission_field: string
): Promise<{ message: string }[]> => {
    const where_connected: any[] = query.$where_connected ?? []

    const given_values = where_connected.reduce((acc: (string | number)[], { $entity, $field, $values }: any) => {
        if ($entity === permission_entity && $field === permission_field) {
            acc.push(...$values)
        }
        return acc
    }, [])

    if (given_values.length === 0) {
        push_path(
            ['$where_connected'],
            {
                $entity: permission_entity,
                $field: permission_field,
                $values: allowed_values
            },
            query
        )
    } else {
        if (!array_subset(given_values, allowed_values)) {
            return [{ message: 'Insufficient permission to view other users data' }]
        }
    }

    return []
}
