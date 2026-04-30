import { createWriteStream, existsSync, mkdirSync, rmSync, writeFileSync } from 'fs'
import JSONStream from 'JSONStream'
import { orma_introspect, OrmaSchema } from 'orma'
import { get_entity_names } from 'orma/build/helpers/schema_helpers'
import { Readable, Transform } from 'stream'
import { pipeline } from 'stream/promises'

export type DehydrateArgs = {
    /** Function that executes an array of SQL strings and returns an array of row arrays */
    db_adapter: (sqls: { sql_string: string }[]) => Promise<any[][]>
    /** DB schema name to introspect (default: 'public') */
    schema_name?: string
    /** Database type for orma_introspect (default: 'postgres') */
    database_type?: 'postgres' | 'mysql'
    /** Path to write hydration files (default: process.cwd()/hydration) */
    hydration_folder_path?: string
    /** Pre-introspected orma schema. If not provided, will introspect using db_adapter */
    orma_schema?: OrmaSchema
}

export const dehydrate = async (args: DehydrateArgs) => {
    const {
        db_adapter,
        schema_name = 'public',
        database_type = 'postgres' as const,
        hydration_folder_path = `${process.cwd()}/hydration`
    } = args

    const orma_schema =
        args.orma_schema ??
        (await orma_introspect(schema_name, db_adapter, {
            database_type
        }))

    const entities = get_entity_names(orma_schema)

    // Remove old hydration folder
    if (existsSync(hydration_folder_path)) {
        rmSync(hydration_folder_path, { recursive: true })
    }

    for (let i = 0; i < entities.length; i++) {
        const table_name = entities[i]
        const query = `SELECT * FROM ${schema_name}.${table_name}`
        const [hydration_rows] = await db_adapter([{ sql_string: query }])

        if (hydration_rows.length > 0) {
            await write_hydration(table_name, hydration_rows, hydration_folder_path)
        }
    }

    write_hydration_index(entities, hydration_folder_path)
}

const log_every = 10000
const log = (file_name: string, length: number) => (i: number) => {
    if (i % log_every === 0) {
        if (process.stdout.clearLine) {
            process.stdout.clearLine(0)
        }
        if (process.stdout.cursorTo) {
            process.stdout.cursorTo(0)
        }
        process.stdout.write(
            `Dehydrating ${file_name.split('/').pop().split('_hydration.json').shift()}: ${i}/${length}`
        )
    }
}

// Asynchronous generator to create JSON chunks and log progress
async function* hydration_stream(array: any[], log_fn: (i: number) => void) {
    for (let i = 0; i < array.length; i++) {
        log_fn(i)
        yield array[i]
    }
}

// Stream hydration rows to disk using JSONStream
const stream_hydration_rows_to_disk = async (filename: string, dataArray: any[]) => {
    const jsonStream = JSONStream.stringify(`[\n`, `,\n`, `\n]\n`, 4)
    const dataStream = hydration_stream(dataArray, log(filename, dataArray.length))

    const readableStream = Readable.from(dataStream)
    const fileStream = createWriteStream(filename)

    // Fix formatting of JSONStream output - add indentation
    const addTabTransform = new Transform({
        transform(chunk, encoding, callback) {
            const chunks = chunk.toString().split('\n')
            const chunkWithTab = chunks
                .map(line => {
                    return ['[', ']', ',', ''].includes(line) ? line : `    ${line}`
                })
                .join('\n')
            callback(null, chunkWithTab)
        }
    })

    try {
        await pipeline(readableStream, jsonStream, addTabTransform, fileStream)
    } catch (error) {
        console.error('Failed to write hydration data to file:', error)
    }
}

const write_hydration = async (table_name: string, hydration_rows: any[], hydration_folder_path: string) => {
    mkdirSync(hydration_folder_path, { recursive: true })

    const file_path = `${hydration_folder_path}/${table_name}_hydration.json`

    await stream_hydration_rows_to_disk(file_path, hydration_rows)
}

const write_hydration_index = (entities: string[], hydration_folder_path: string) => {
    const existing_entities = entities.filter(entity => existsSync(`${hydration_folder_path}/${entity}_hydration.json`))

    const imports = existing_entities.map(entity => `import ${entity} from './${entity}_hydration.json'`).join('\n')

    const json = `export const hydration_data = {
    ${existing_entities.join(',\n    ')}
} as const`

    const file_contents = `${imports}
    
${json}`

    mkdirSync(hydration_folder_path, { recursive: true })
    const file_path = `${hydration_folder_path}/hydration.ts`
    writeFileSync(file_path, file_contents, 'utf-8')
}
