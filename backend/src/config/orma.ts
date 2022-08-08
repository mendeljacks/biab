import { orma_mutate, orma_query } from 'orma/src/index'
import { apply_inherit_operations_macro } from 'orma/src/mutate/macros/inherit_operations_macro'
import { validate_mutation } from 'orma/src/mutate/verifications/mutate_validation'
import { mutation_entity_deep_for_each } from 'orma/src/mutate/helpers/mutate_helpers'
import { pool, trans } from './pg'
import cuid from 'cuid'
import { orma_schema } from '../../../common/orma_schema'

/**
 * Standardizes the output so it is always an array of arrays
 */
export const byo_query_fn = async (sqls: { sql_string }[], connection = pool) => {
    const sql = sqls.map(el => el.sql_string).join(';\n')
    const response = await connection.query(sql)

    // pg driver returns array only when multiple statements detected
    if (!Array.isArray(response)) {
        return [response.rows]
    } else {
        return response.map(row => row.rows)
    }
}
const add_resource_ids = (mutation: any) => {
    mutation_entity_deep_for_each(mutation, (value, path) => {
        if (value?.$operation === 'create') {
            const resource_id = cuid()
            value.resource_id = resource_id
        }
    })
}
export const mutate_handler = mutation => {
    return trans(async connection => {
        apply_inherit_operations_macro(mutation)
        add_resource_ids(mutation)

        const errors = validate_mutation(mutation, orma_schema)
        if (errors.length > 0) {
            return Promise.reject(errors)
        }

        // Run orma mutation
        const mutation_results = await orma_mutate(
            mutation,
            sqls => byo_query_fn(sqls, connection),
            orma_schema
        )
        return mutation_results
    })
}

export const query_handler = query => {
    return orma_query(query, orma_schema, byo_query_fn)
}
