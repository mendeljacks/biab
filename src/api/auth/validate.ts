import { OrmaQuery, OrmaSchema, validate_query } from 'orma'

export const validate_orma_query = async <T>(query: OrmaQuery<any, any>, orma_schema: OrmaSchema) => {
    const errors = validate_query(query, orma_schema)
    if (errors.length > 0) {
        return Promise.reject(errors)
    }
    return []
}
