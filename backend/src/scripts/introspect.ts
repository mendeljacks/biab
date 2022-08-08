import { writeFileSync } from 'fs'
import { orma_introspect } from 'orma/src/index'
import { byo_query_fn } from '../config/orma'

export const introspect = async db => {
    const orma_schema = await orma_introspect('public', byo_query_fn, { db_type: 'postgres' })
    try {
        const str = `export const orma_schema = ${JSON.stringify(orma_schema, null, 2)} as const`
        writeFileSync('../common/orma_schema.ts', str)
    } catch (error) {
        console.log('Could not save the orma schema')
    }
}
