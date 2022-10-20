import { OrmaSchema } from 'orma/src/introspector/introspector'
import { validate_query } from 'orma/src/query/validation/query_validation'
import { OrmaQuery } from 'orma/src/types/query/query_types'

export const validate_orma_query = async <T>(query: OrmaQuery<any>, orma_schema: OrmaSchema) => {
    const errors = validate_query(query, orma_schema)
    if (errors.length > 0) {
        return Promise.reject(errors)
    }
    return []
}
