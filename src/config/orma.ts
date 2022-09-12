import cuid from 'cuid'
import { writeFileSync } from 'fs'
import { orma_introspect, orma_mutate, orma_query } from 'orma/src/index'
import { OrmaSchema } from 'orma/src/introspector/introspector'
import { mutation_entity_deep_for_each } from 'orma/src/mutate/helpers/mutate_helpers'
import { apply_inherit_operations_macro } from 'orma/src/mutate/macros/inherit_operations_macro'
import { validate_mutation } from 'orma/src/mutate/verifications/mutate_validation'

export const ensure_valid_mutation = async (mutation, orma_schema: OrmaSchema) => {
    const errors = validate_mutation(mutation, orma_schema as any as OrmaSchema)
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
        apply_inherit_operations_macro(mutation)
        extra_macros(mutation)

        await ensure_valid_mutation(mutation, orma_schema)

        // Run orma mutation
        const mutation_results = await orma_mutate(
            mutation,
            sqls => byo_query_fn(sqls, connection),
            orma_schema as any as OrmaSchema
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
    byo_query_fn: Function
) => {
    return orma_query(query, orma_schema as any as OrmaSchema, sqls => byo_query_fn(sqls, pool))
}

export const introspect = async (output_path: string, pool: Pool, byo_query_fn: Function) => {
    const orma_schema = await orma_introspect('public', sqls => byo_query_fn(sqls, pool), {
        db_type: 'postgres'
    })
    const str = `export const orma_schema = ${JSON.stringify(orma_schema, null, 2)} as const`
    writeFileSync(output_path, str)
    return orma_schema
}
