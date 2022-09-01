import { OrmaSchema } from 'orma/src/introspector/introspector'
import { get_mutation_diff } from 'orma/src/mutate/diff/diff_mutation'
import { mutate_handler, Pool, query_handler } from '../config/orma'

type PopulatedData = {
    [table_name: string]: any[]
}

export const prepopulate = async (
    populated_data: PopulatedData,
    pool: Pool,
    orma_schema: OrmaSchema
) => {
    const table_names = Object.keys(populated_data)
    for (const table_name of table_names) {
        const populatable_rows = populated_data[table_name]
        const columns = Object.keys(populatable_rows[0]).reduce((acc, val) => {
            acc[val] = true
            return acc
        }, {})
        const result = await query_handler({ [table_name]: columns }, pool, orma_schema)
        let diff = get_mutation_diff(result, { [table_name]: populatable_rows })
        diff[table_name] = diff[table_name]?.filter(el => el.$operation !== 'delete')

        if (diff[table_name]?.length > 0) {
            console.log(`Creating ${diff[table_name].length} ${table_name} rows`)
            await mutate_handler(diff, pool, orma_schema)
        }
    }
}
