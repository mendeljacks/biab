import { createReadStream, existsSync } from 'fs'
import JSONStream from 'JSONStream'
import { OrmaSchema, orma_introspect, orma_mutate } from 'orma'
import { get_child_edges, get_entity_names } from 'orma/build/helpers/schema_helpers'
import { pipeline } from 'stream/promises'
import { toposort } from 'yay_json'
import { promise_retry } from '../reusables/promise_retry'

export type HydrateArgs = {
    /** Function that executes an array of SQL strings and returns an array of row arrays */
    db_adapter: (sqls: { sql_string: string }[]) => Promise<any[][]>
    /** DB schema name to introspect (default: 'public') */
    schema_name?: string
    /** Database type for orma_introspect (default: 'postgres') */
    database_type?: 'postgres' | 'mysql'
    /** Pre-introspected orma schema. If not provided, will introspect using db_adapter */
    orma_schema?: OrmaSchema
    /** Path to read hydration files from (default: process.cwd()/hydration) */
    hydration_folder_path?: string
    /** Function to apply extra macros (e.g. add_resource_ids) to each mutation before inserting */
    extra_macros?: (mutation: any) => void
    /** Environment mode guard - hydrate will only proceed if this is 'TEST' or 'DEV' */
    env_mode: string
    /** Optional list of entity names that should be inserted before topologically sorted entities
     *  (e.g. self-referencing tables that need to go first) */
    priority_entities?: string[]
    /** Batch size for inserts (default: 2000) */
    batch_size?: number
    /** Number of retries on network errors (default: 100) */
    retries?: number
}

const is_db_retryable = async (err: any) => {
    if (['ECONNRESET', 'ECONNREFUSED', 'PROTOCOL_CONNECTION_LOST', 'ER_OPTION_PREVENTS_STATEMENT'].includes(err.code)) {
        return true
    }
    console.warn('Non Retryable error:', err)
    return false
}

export const hydrate = async (args: HydrateArgs) => {
    const {
        db_adapter,
        schema_name = 'public',
        database_type = 'postgres' as const,
        hydration_folder_path = `${process.cwd()}/hydration`,
        extra_macros,
        env_mode,
        priority_entities = [],
        batch_size = 2000,
        retries = 100
    } = args

    // Guard: only allow in TEST or DEV
    if (env_mode !== 'TEST' && env_mode !== 'DEV') {
        console.error(`TRIED TO DELETE ENTIRE ${env_mode} DATABASE! EXITING...`)
        process.exit(1)
    }

    try {
        console.time('hydration')
        console.time('deletion')

        const orma_schema =
            args.orma_schema ??
            (await orma_introspect(schema_name, db_adapter, {
                database_type
            }))

        await delete_all_rows(db_adapter, orma_schema, schema_name)
        console.timeEnd('deletion')

        console.time('actual hydrate')

        // Build DAG from FK relationships and topological sort
        const dag = get_entity_names(orma_schema)
            .filter(el => !priority_entities.includes(el))
            .reduce(
                (acc, el) => {
                    const parents = get_child_edges(el, orma_schema)
                    acc[el] = parents.map((parent_edge: any) => parent_edge.to_entity)
                    return acc
                },
                {} as Record<string, string[]>
            )

        const sorted = toposort(dag)
        const table_names = [...priority_entities, ...sorted.flat()]

        for (let i = 0; i < table_names.length; i++) {
            await hydrate_rows(
                table_names,
                orma_schema,
                i,
                hydration_folder_path,
                db_adapter,
                extra_macros,
                batch_size,
                retries
            )
        }

        console.timeEnd('actual hydrate')
        console.timeEnd('hydration')
    } catch (err) {
        console.error('error while hydrating', err)
        return Promise.reject(err)
    }
}

const delete_all_rows = async (
    db_adapter: (sqls: { sql_string: string }[]) => Promise<any[][]>,
    orma_schema: OrmaSchema,
    schema_name: string
) => {
    const entity_names = get_entity_names(orma_schema)

    const disable_fk = `SET session_replication_role = 'replica';`
    const delete_statements = entity_names.map(el => `DELETE FROM ${schema_name}.${el}`).join(';\n')
    const enable_fk = `SET session_replication_role = 'DEFAULT';`

    try {
        await db_adapter([{ sql_string: disable_fk }, { sql_string: delete_statements }, { sql_string: enable_fk }])
    } catch (err) {
        console.error('error while deleting database rows', err)
    }
}

const stream_read_hydration_rows_from_disk = async (
    filename: string,
    processItem: (item: any, index: number) => void
) => {
    const fileStream = createReadStream(filename, { encoding: 'utf8' })
    const jsonStream = JSONStream.parse('*')

    try {
        await pipeline(fileStream, jsonStream, async function (source: any) {
            let index = 0
            for await (const item of source) {
                processItem(item, index)
                index++
            }
        })
    } catch (error) {
        console.error('Failed to read hydration data from file:', error)
    }
}

const mutate_retried = async (
    mutation: any,
    orma_schema: OrmaSchema,
    db_adapter: (sqls: { sql_string: string }[]) => Promise<any[][]>,
    retries: number
) =>
    promise_retry(
        async () => await orma_mutate(mutation, db_adapter, orma_schema),
        { retries, minTimeout: 1_000 },
        is_db_retryable
    )

const hydrate_rows = async (
    table_names: string[],
    orma_schema: OrmaSchema,
    i: number,
    hydration_folder_path: string,
    db_adapter: (sqls: { sql_string: string }[]) => Promise<any[][]>,
    extra_macros: ((mutation: any) => void) | undefined,
    batch_size: number,
    retries: number
) => {
    const table_name = table_names[i]

    const file_path = `${hydration_folder_path}/${table_name}_hydration.json`
    if (existsSync(file_path)) {
        let rows: any[] = []
        await stream_read_hydration_rows_from_disk(file_path, (item, index) => {
            rows.push(item)
        })

        if (!rows?.length) return

        const msg = `${i + 1}/${table_names.length} Hydrated ${rows.length} rows for ${table_name}`
        console.time(msg)

        for (let j = 0; j < rows.length / batch_size; j++) {
            const batch_rows = rows.slice(batch_size * j, batch_size * (j + 1))
            const mutation = {
                $operation: 'create',
                [table_name]: batch_rows
            }

            // Apply extra macros (e.g. add_resource_ids) if provided
            if (extra_macros) {
                extra_macros(mutation)
            }

            process.stdout.write(`Inserting ${table_name}: ${j * batch_size} / ${rows.length}\r`)

            await mutate_retried(mutation, orma_schema, db_adapter, retries)

            process.stdout.clearLine(0)
        }

        console.timeEnd(msg)
    }
}
