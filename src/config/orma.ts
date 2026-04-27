import { writeFileSync } from 'fs'
import { orma_introspect, orma_mutate, orma_query, ConnectionEdges, OrmaSchema } from 'orma'
import { validate_mutation } from 'orma/build/mutate/verifications/mutate_validation'

export type DbAdapter = (connection: any) => (sqls: any) => Promise<any>

export type Pool = {
    query: Function
    connect: Function
}

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
    db_adapter: DbAdapter,
    trans: Function,
    extra_macros: Function
) => {
    return trans(async connection => {
        extra_macros(mutation)

        await ensure_valid_mutation(mutation, orma_schema)

        const mutation_results = await orma_mutate(
            mutation,
            db_adapter(connection),
            orma_schema
        )
        return mutation_results
    }, pool)
}

export const query_handler = (
    query,
    pool: Pool,
    orma_schema: OrmaSchema,
    db_adapter: DbAdapter,
    connection_edges: ConnectionEdges
) => {
    return orma_query(
        query,
        orma_schema,
        db_adapter(pool),
        connection_edges
    )
}

export const introspect = async (output_path: string, pool: Pool, db_adapter: DbAdapter) => {
    const orma_schema = await orma_introspect('public', db_adapter(pool), {
        database_type: 'postgres'
    })
    const str = `export const orma_schema = ${JSON.stringify(orma_schema, null, 2)} as const`
    writeFileSync(output_path, str)
    return orma_schema
}
