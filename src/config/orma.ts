import { writeFileSync } from 'fs'
import {
    ConnectionEdges,
    mysql2_adapter,
    orma_introspect,
    orma_mutate,
    orma_query,
    OrmaSchema,
    pg_adapter,
    postgres_promise_transaction
} from 'orma'

import { validate_mutation } from 'orma/build/mutate/verifications/mutate_validation'
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

export const ensure_valid_mutation = async (mutation: any, orma_schema: OrmaSchema) => {
    const errors = validate_mutation(mutation, orma_schema)
    if (errors.length > 0) {
        return Promise.reject(errors)
    }
}

export const mutate_handler = (
    mutation: any,
    pool: Required<Pool>,
    orma_schema: OrmaSchema,
    db_adapter: DbAdapter,
    trans: TransFn,
    extra_macros: (mutation: any) => void
) => {
    return trans(async connection => {
        extra_macros(mutation)

        await ensure_valid_mutation(mutation, orma_schema)

        const mutation_results = await orma_mutate(mutation, db_adapter(connection), orma_schema)
        return mutation_results
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

export const introspect = async (output_path: string, sql_function: SqlFunction, database_type: DbType) => {
    const orma_schema = await orma_introspect('public', sql_function, {
        database_type
    })
    const str = `export const orma_schema = ${JSON.stringify(orma_schema, null, 2)} as const`
    writeFileSync(output_path, str)
    return orma_schema
}
