import { ConnectionEdges, get_mutation_diff, OrmaSchema } from 'orma'
import { add_resource_ids } from '../config/extra_macros'
import { DbAdapter, mutate_handler, Pool, query_handler, SqlFunction, TransFn } from '../config/orma'

type PopulatedData = {
    [table_name: string]: any[]
}

export const prepopulate = async (
    populated_data: PopulatedData,
    pool: Pool,
    orma_schema: OrmaSchema,
    db_adapter: DbAdapter,
    trans: TransFn,
    connection_edges: ConnectionEdges
) => {
    const sql_function: SqlFunction = db_adapter(pool)
    const table_names = Object.keys(populated_data)
    for (const table_name of table_names) {
        const populatable_rows = populated_data[table_name]
        const columns = Object.keys(populatable_rows[0] as Record<string, any>).reduce((acc: Record<string, boolean>, val: string) => {
            acc[val] = true
            return acc
        }, {})
        const result = await query_handler({ [table_name]: columns }, orma_schema, sql_function, connection_edges)
        let diff = get_mutation_diff(result, { [table_name]: populatable_rows })
        diff[table_name] = diff[table_name]?.filter((el: any) => el.$operation !== 'delete')

        if (diff[table_name]?.length > 0) {
            console.log(`Creating ${diff[table_name].length} ${table_name} rows`)
            await mutate_handler(diff, pool, orma_schema, db_adapter, trans, add_resource_ids)
        }
    }
}
