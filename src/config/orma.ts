import { writeFileSync } from 'fs'
import {
  ConnectionEdges,
  mysql2_adapter,
  orma_introspect,
  orma_mutate,
  orma_mutate_prepare,
  orma_mutate_run,
  orma_query,
  OrmaSchema,
  pg_adapter,
  postgres_promise_transaction
} from 'orma'
import { get_primary_keys } from 'orma/build/helpers/schema_helpers'
import { path_to_entity } from 'orma/build/mutate/helpers/mutate_helpers'

import { validate_mutation } from 'orma/build/mutate/verifications/mutate_validation'
import {
  middleware_system_prefetch,
  MiddlewareConfig,
  OrmaQueryFn,
  run_post_middleware_system
} from '../api/middleware/post_middleware_system'
export type DbAdapter = (connection: any) => (sqls: any) => Promise<any>
export type SqlFunction = (sqls: any) => Promise<any>
export type TransFn = (fn: (connection: any) => Promise<any>, pool: any) => Promise<any>
export type DbType = 'postgres' | 'mysql' | 'sqlite'

const db_adapters: Partial<Record<DbType, DbAdapter>> = {
    postgres: pg_adapter,
    mysql: mysql2_adapter
}

const trans_fns: Partial<Record<DbType, TransFn>> = {
    postgres: postgres_promise_transaction as TransFn
}

export const get_db_adapter = (db_type: DbType): DbAdapter => {
    const adapter = db_adapters[db_type]
    if (!adapter) throw new Error(`No db_adapter for ${db_type}`)
    return adapter
}
export const get_trans_fn = (db_type: DbType): TransFn => {
    const trans = trans_fns[db_type]
    if (!trans) throw new Error(`No trans fn for ${db_type}`)
    return trans
}

export type Pool = {
    query: Function
    connect: Function
}

export type DbConfig = {
    pool: Pool
    connection_edges: ConnectionEdges
    orma_schema: OrmaSchema
    db_type: DbType
}

export const ensure_valid_mutation = async (mutation: any, orma_schema: OrmaSchema) => {
    const errors = validate_mutation(mutation, orma_schema)
    if (errors.length > 0) {
        return Promise.reject(errors)
    }
}

export type PreMiddlewareFunction = (
    mutation: any,
    auth_data: any
) => void | Promise<void>

export type MutateHandlerOptions = {
    /**
     * Optional list of pre-middleware functions that run before the mutation is
     * executed. Use these for authorization checks, validation guards, etc.
     * If any pre-middleware throws, the entire mutation is aborted.
     */
    pre_middlewares?: PreMiddlewareFunction[]
    /**
     * Optional list of middlewares to run around the mutation. They run
     * inside the same transaction. See `post_middleware_system.ts`.
     */
    middlewares?: MiddlewareConfig[]
    /**
     * Required if `middlewares` is provided. Used to fetch data needed by
     * middlewares (both for delete-prefetch and the post-run query).
     * Should run within the supplied transaction `connection`.
     */
    orma_query_fn?: OrmaQueryFn
    /** Auth data passed through to each middleware. */
    auth_data?: any
}

export const mutate_handler = (
    mutation: any,
    pool: Required<Pool>,
    orma_schema: OrmaSchema,
    db_adapter: DbAdapter,
    trans: TransFn,
    extra_macros: (mutation: any) => void,
    options: MutateHandlerOptions = {}
) => {
    const { pre_middlewares, middlewares, orma_query_fn, auth_data } = options

    return trans(async connection => {
        extra_macros(mutation)

        await ensure_valid_mutation(mutation, orma_schema)

        // Run pre-middlewares (authorization guards, validation checks, etc.)
        if (pre_middlewares && pre_middlewares.length > 0) {
            for (const pre_middleware of pre_middlewares) {
                await pre_middleware(mutation, auth_data)
            }
        }

        const sql_function = db_adapter(connection)

        if (!middlewares || middlewares.length === 0) {
            return orma_mutate(mutation, sql_function, orma_schema)
        }

        if (!orma_query_fn) {
            throw new Error('mutate_handler: `orma_query_fn` is required when `middlewares` are provided')
        }

        // Prefetch (mainly to capture rows that will be deleted)
        const mutation_plan = orma_mutate_prepare(orma_schema, mutation)
        const prefetch_result = await middleware_system_prefetch(
            orma_schema,
            middlewares,
            mutation_plan,
            connection,
            orma_query_fn
        )

        await orma_mutate_run(orma_schema, sql_function, mutation_plan)

        // After running, every write-guid has a $resolved_value. Make sure
        // every mutation piece has $identifying_fields so the middleware
        // system can build where-clauses for tracked creates whose ids were
        // server-generated (orma's get_identifying_fields returns undefined
        // when the only identifier is a write-guid that hasn't yet been set).
        for (const piece of mutation_plan.mutation_pieces) {
            if (piece.record.$identifying_fields === undefined) {
                const entity = path_to_entity(piece.path)
                piece.record.$identifying_fields = get_primary_keys(entity, orma_schema)
            }
        }

        await run_post_middleware_system(
            orma_schema,
            middlewares,
            prefetch_result,
            mutation_plan,
            mutation,
            connection,
            auth_data,
            orma_query_fn
        )
    }, pool)
}

export const query_handler = (
    query: any,
    orma_schema: OrmaSchema,
    sql_function: SqlFunction,
    connection_edges: ConnectionEdges
) => {
    return orma_query(query, orma_schema, sql_function, connection_edges)
}

/**
 * Returns a copy of `value` with every object's keys sorted alphabetically.
 * orma's introspector queries `INFORMATION_SCHEMA.TABLES`/`COLUMNS` without
 * `ORDER BY`, so Postgres can return rows in any heap order. Without this,
 * the generated `orma_schema.ts` shuffles entity/column ordering across runs
 * even when the underlying schema is unchanged.
 */
const deep_sort_keys = (value: any): any => {
    if (Array.isArray(value)) return value.map(deep_sort_keys)
    if (value && typeof value === 'object') {
        const sorted: any = {}
        for (const key of Object.keys(value).sort()) {
            sorted[key] = deep_sort_keys(value[key])
        }
        return sorted
    }
    return value
}

export const introspect = async (output_path: string, pool: Pool, database_type: DbType) => {
    const sql_function = get_db_adapter(database_type)(pool)
    const orma_schema = await orma_introspect('public', sql_function, {
        database_type
    })
    const sorted = deep_sort_keys(orma_schema)
    const str = `export const orma_schema = ${JSON.stringify(sorted, null, 2)} as const\n`
    writeFileSync(output_path, str)
    return sorted
}
