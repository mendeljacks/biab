import { writeFileSync } from 'fs'
import { orma_introspect, orma_mutate, orma_query, ConnectionEdges, OrmaSchema } from 'orma'
import { validate_mutation } from 'orma/build/mutate/verifications/mutate_validation'

export const ensure_valid_mutation = async (mutation, orma_schema: OrmaSchema) => {
    const errors = validate_mutation(mutation, orma_schema)
    if (errors.length > 0) {
        return Promise.reject(errors)
    }
}

export const mutate_handler = (
    mutation,
    pool: Required<Pool>,
    orma_schema: OrmaSchema,
    byo_query_fn: Function,
    trans: Function,
    extra_macros: Function
) => {
    return trans(async connection => {
        extra_macros(mutation)

        await ensure_valid_mutation(mutation, orma_schema)

        // Run orma mutation
        const mutation_results = await orma_mutate(
            mutation,
            sqls => byo_query_fn(sqls, connection),
            orma_schema
        )
        return mutation_results
    }, pool)
}

export type Pool = {
    query: Function
    connect: Function
}
export const query_handler = (
    query,
    pool: Pool,
    orma_schema: OrmaSchema,
    byo_query_fn: Function,
    connection_edges: ConnectionEdges
) => {
    return orma_query(
        query,
        orma_schema,
        sqls => byo_query_fn(sqls, pool),
        connection_edges
    )
}

export const introspect = async (output_path: string, pool: Pool, byo_query_fn: Function) => {
    const orma_schema = await orma_introspect('public', sqls => byo_query_fn(sqls, pool), {
        database_type: 'postgres'
    })
    const str = `export const orma_schema = ${JSON.stringify(orma_schema, null, 2)} as const`
    writeFileSync(output_path, str)
    return orma_schema
}
