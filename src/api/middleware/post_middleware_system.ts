/**
 * Generic post-mutation middleware system
 *
 * Concept:
 *   1. The user defines a list of `MiddlewareConfig` objects. Each describes:
 *       - which mutation pieces it tracks (`tracking_predicate`)
 *       - what data it needs to operate on (`get_query`, parameterized on
 *         a wheres-by-root-entity object derived from the tracked mutation
 *         pieces)
 *       - the function to actually run after the mutation (`middleware`)
 *       - any extra `connection_edges` linking tracked entities to query roots
 *   2. Before the mutation runs, we run `middleware_system_prefetch` so that
 *      we still have copies of soon-to-be-deleted rows.
 *   3. After the mutation runs, we run `run_post_middleware_system` which
 *      re-fetches updated/created rows, merges in the prefetched deleted
 *      rows, and invokes each middleware with the result data.
 *
 */

import { add_connection_edges, ConnectionEdges, mutation_path_to_entity, OrmaSchema } from 'orma'
import { group_by, key_by, last, map_object } from 'orma/build/helpers/helpers'
import { Edge, is_reserved_keyword, reverse_edge } from 'orma/build/helpers/schema_helpers'
import { sort_database_rows } from 'orma/build/mutate/database_results/sort_database_rows'
import { path_to_entity } from 'orma/build/mutate/helpers/mutate_helpers'
import { generate_identifying_where, get_identifying_where } from 'orma/build/mutate/helpers/record_searching'
import {
    get_identifying_fields,
    get_possible_identifying_keys
} from 'orma/build/mutate/macros/identifying_fields_macro'
import { apply_nesting_mutation_macro } from 'orma/build/mutate/macros/nesting_mutation_macro'
import { MutationPiece, MutationPlan } from 'orma/build/mutate/plan/mutation_batches'
import {
    get_edge_paths_by_destination,
    get_where_connected_clauses
} from 'orma/build/query/macros/where_connected_macro'
import { get_real_entity_name } from 'orma/build/query/query'
import { combine_wheres } from 'orma/build/query/query_helpers'

// ramda's `path` replacement
const get_path = (keys: (string | number)[], obj: any): any =>
    keys.reduce((acc: any, key) => (acc == null ? acc : acc[key]), obj)

export type OrmaQueryFn = (query: Record<string, any>, connection: any) => Promise<any>

export type MiddlewareFunction = (
    query_result: any,
    mutation: any,
    connection: any,
    auth_data: any
) => any | Promise<any>

export type MiddlewareConfig = {
    name: string
    tracking_predicate: (mutation_piece: MutationPiece) => boolean
    get_query: (wheres_by_root_entity: Record<string, any> | undefined) => Record<string, any>
    middleware: MiddlewareFunction
    /**
     * Connection edges should go from tracking_predicate entities to
     * `get_query` root entities. Use `add_connection_edges({}, [])` for the
     * default schema-derived connections.
     */
    connection_edges: ConnectionEdges
}

type TrackingConfig = {
    [entity_name: string]: {
        create?: boolean
        delete?: boolean
        update?: string[]
    }
}

export const generate_middleware_tracking_predicate = (tracking_config: TrackingConfig) => {
    return (mutation_piece: MutationPiece) => {
        const entity = path_to_entity(mutation_piece.path)
        const operation = mutation_piece.record.$operation

        const config = tracking_config[entity]
        if (!config) return false

        const is_configured_create = operation === 'create' && !!config.create
        const is_configured_delete = operation === 'delete' && !!config.delete

        const identifying_fields = mutation_piece.record.$identifying_fields ?? []

        const configured_update_fields = Object.keys(mutation_piece.record).filter(
            key => !is_reserved_keyword(key) && !identifying_fields.includes(key) && config?.update?.includes(key)
        )

        const is_configured_update = operation === 'update' && configured_update_fields.length > 0

        return is_configured_create || is_configured_delete || is_configured_update
    }
}

export const middleware_system_prefetch = async (
    orma_schema: OrmaSchema,
    middleware_configs: MiddlewareConfig[],
    mutation_plan: MutationPlan,
    connection: any,
    orma_query_fn: OrmaQueryFn
) => {
    const queries = middleware_configs.map(middleware_config => {
        const wheres_by_root_entity = get_middleware_wheres_by_root_entity(
            orma_schema,
            middleware_config,
            ['delete'],
            mutation_plan
        )

        const query = middleware_config.get_query(wheres_by_root_entity)

        return get_query_with_unique_keys(orma_schema, query, wheres_by_root_entity)
    })

    const results = (await Promise.all(
        queries.map(query => (query ? orma_query_fn(query, connection) : Promise.resolve([])))
    )) as { [entity: string]: Record<string, any>[] }[]

    const results_by_middleware_name = key_by(results, (_result, i) => middleware_configs[i].name)

    return { results_by_middleware_name }
}

/**
 * Make sure the query has primary keys and any other unique key, since we will
 * need them for lookup purposes later.
 */
const get_query_with_unique_keys = (
    orma_schema: OrmaSchema,
    query: Record<string, any>,
    wheres_by_root_entity: { [entity: string]: Record<string, any> }
) => {
    const query_with_keys = map_object(query, (root_entity: any, subquery: any) => {
        const re = root_entity as string
        const identifying_keys = get_possible_identifying_keys(orma_schema, re)
        const unique_key_obj: Record<string, true> = identifying_keys.reduce(
            (acc, key) => {
                key.forEach(field => (acc[field] = true))
                return acc
            },
            {} as Record<string, true>
        )
        return [re, wheres_by_root_entity[re] ? { ...subquery, ...unique_key_obj } : undefined]
    })

    const query_is_empty = Object.values(query_with_keys).every(el => el === undefined)
    return query_is_empty ? undefined : query_with_keys
}

/**
 * For each entity required by a given middleware, returns a where clause which
 * gets all the records that are
 *   1. tracked by the middleware (through the middleware's tracking predicate)
 *   2. have one of the given operations
 */
export const get_middleware_wheres_by_root_entity = (
    orma_schema: OrmaSchema,
    middleware_config: Pick<MiddlewareConfig, 'get_query' | 'tracking_predicate' | 'connection_edges'>,
    fetch_operations: ('create' | 'update' | 'delete')[],
    mutation_plan: MutationPlan
) => {
    const tracked_piece_indices = mutation_plan.mutation_pieces.flatMap((mutation_piece, piece_index) => {
        const has_included_operation = (fetch_operations as string[]).includes(mutation_piece.record.$operation)
        const is_tracked = middleware_config.tracking_predicate(mutation_piece)
        return has_included_operation && is_tracked ? [piece_index] : []
    })

    const base_query = middleware_config.get_query({})
    const root_entities = Object.keys(base_query).filter(key => !is_reserved_keyword(key))

    const piece_indices_by_entity = group_by(tracked_piece_indices, piece_index =>
        mutation_path_to_entity(mutation_plan.mutation_pieces[piece_index].path)
    )

    const reversed_connection_edges = get_reversed_connection_edges(middleware_config.connection_edges)

    const wheres_by_root_entity = root_entities.reduce(
        (acc, root_entity) => {
            const edge_paths_by_destination = get_edge_paths_by_destination(reversed_connection_edges, root_entity)

            const wheres = Object.keys(piece_indices_by_entity).flatMap(tracked_entity => {
                const piece_indices = piece_indices_by_entity[tracked_entity] ?? []
                if (piece_indices.length === 0) return []

                const identifying_where = get_identifying_where(
                    orma_schema,
                    mutation_plan.guid_map,
                    mutation_plan.mutation_pieces,
                    piece_indices
                )

                return get_where_connected_clauses(
                    orma_schema,
                    edge_paths_by_destination,
                    root_entity,
                    tracked_entity,
                    identifying_where as Record<string, any>
                )
            })

            const where = combine_wheres(wheres, '$or')

            // an undefined where here means 'don't make a query', not 'make a
            // query with no where' (which would fetch the entire table).
            acc[root_entity] = where as Record<string, any>
            return acc
        },
        {} as { [entity: string]: Record<string, any> }
    )

    return wheres_by_root_entity
}

const get_reversed_connection_edges = (connection_edges: ConnectionEdges) => {
    const edges: Edge[] = Object.keys(connection_edges).flatMap(from_entity =>
        connection_edges[from_entity].map(el => ({ from_entity, ...el }))
    )

    const reversed_edges = edges.map(edge => reverse_edge(edge))
    return add_connection_edges({}, reversed_edges)
}

export const run_post_middleware_system = async (
    orma_schema: OrmaSchema,
    middleware_configs: MiddlewareConfig[],
    middleware_prefetch_result: Awaited<ReturnType<typeof middleware_system_prefetch>>,
    mutation_plan: MutationPlan,
    mutation: any,
    connection: any,
    auth_data: any,
    orma_query_fn: OrmaQueryFn
) => {
    const queries = get_queries_for_running_middlewares(
        orma_schema,
        middleware_configs,
        middleware_prefetch_result,
        mutation_plan
    )

    for (const [i, middleware_config] of middleware_configs.entries()) {
        /*
         * We fetch sequentially (rather than in parallel) for two reasons:
         *   1. sort_database_rows mishandles records that appear multiple times
         *      across queries (which can happen when middlewares share root rows).
         *   2. We don't know which middlewares depend on others' updates, so
         *      sequential fetching is the safe default.
         */
        const query = queries[i]
        if (!query) continue

        const query_result = await orma_query_fn(query, connection)

        const prefetch_data = middleware_prefetch_result.results_by_middleware_name?.[middleware_config.name]

        const deleted_prefetch_results = get_deleted_prefetch_results(
            orma_schema,
            prefetch_data,
            mutation_plan.mutation_pieces
        )
        const merged_data = merge_middleware_system_query_results(
            query,
            query_result as any,
            deleted_prefetch_results as any
        )
        const has_data = Object.values(merged_data).some(el => el.length > 0)
        if (has_data) {
            add_mutation_pieces_to_middleware_results(
                orma_schema,
                mutation_plan.mutation_pieces,
                [query],
                [query_result as any]
            )
            await middleware_config.middleware(merged_data, mutation, connection, auth_data)
        }
    }
}

export const get_deleted_prefetch_results = (
    orma_schema: OrmaSchema,
    prefetch_rows_by_entity:
        | Awaited<ReturnType<typeof middleware_system_prefetch>>['results_by_middleware_name'][string]
        | undefined,
    mutation_pieces: MutationPiece[]
) => {
    if (!prefetch_rows_by_entity) return {}
    const root_entities = Object.keys(prefetch_rows_by_entity)

    const sorted_result_records = sort_database_rows(
        mutation_pieces,
        new Map(),
        { start_index: 0, end_index: mutation_pieces.length },
        root_entities,
        root_entities.map(root_entity => prefetch_rows_by_entity[root_entity]),
        orma_schema
    )

    mutation_pieces.forEach((mutation_piece, i) => {
        const result_record = sorted_result_records[i] as any
        if (result_record && Object.keys(result_record)?.length) {
            result_record._mutation_piece = mutation_piece
        }
    })

    const result_records_from_deletes = (sorted_result_records as any[]).filter(record => record?._mutation_piece)

    const deleted_records_by_entity = group_by(result_records_from_deletes, record =>
        mutation_path_to_entity(record!._mutation_piece.path)
    )

    return deleted_records_by_entity
}

export const merge_middleware_system_query_results = (
    query: Record<string, any>,
    results1: { [entity: string]: Record<string, any>[] },
    results2: { [entity: string]: Record<string, any>[] }
) => {
    return Object.keys(query).reduce(
        (acc, key) => {
            if (is_reserved_keyword(key)) return acc
            acc[key] = [...(results1?.[key] ?? []), ...(results2?.[key] ?? [])]
            return acc
        },
        {} as { [entity: string]: Record<string, any>[] }
    )
}

export const get_queries_for_running_middlewares = (
    orma_schema: OrmaSchema,
    middleware_configs: MiddlewareConfig[],
    middleware_prefetch_result: Awaited<ReturnType<typeof middleware_system_prefetch>>,
    mutation_plan: MutationPlan
) => {
    return middleware_configs.map(middleware_config => {
        const base_wheres_by_root_entity = get_middleware_wheres_by_root_entity(
            orma_schema,
            middleware_config,
            ['create', 'update'],
            mutation_plan
        )

        const wheres_by_root_entity = map_object(base_wheres_by_root_entity, (entity: any, where: any) => {
            const e = entity as string
            const records_from_delete =
                middleware_prefetch_result.results_by_middleware_name?.[middleware_config.name]?.[e] ?? []

            const wheres_from_delete = records_from_delete.map((record: any) => {
                const identifying_fields =
                    record.$identifying_fields ?? get_identifying_fields(orma_schema, e, record, false)
                return generate_identifying_where(
                    orma_schema,
                    new Map(),
                    // synthetic mutation_pieces is fine because there
                    // are no guids in the deleted prefetch rows.
                    [{ record, path: [e, 0] }],
                    identifying_fields,
                    0
                )
            })

            return [e, combine_wheres([where, ...wheres_from_delete], '$or')]
        })

        const query = middleware_config.get_query(wheres_by_root_entity)
        const filtered_query = map_object(query, (entity: any, subquery: any) => [
            entity as string,
            wheres_by_root_entity[entity as string] ? subquery : undefined
        ])
        const query_is_empty = Object.values(filtered_query).every(el => el === undefined)
        return query_is_empty ? undefined : filtered_query
    })
}

/**
 * MUTATES THE INPUT root_results: tags each result row with the
 * `_mutation_piece` that created/updated it (when applicable).
 */
export const add_mutation_pieces_to_middleware_results = (
    orma_schema: OrmaSchema,
    mutation_pieces: MutationPiece[],
    queries: any[],
    root_results: { [entity: string]: Record<string, any>[] }[]
) => {
    const result_pieces_with_entity = root_results.flatMap((result, i) => {
        const sub_pieces = apply_nesting_mutation_macro(result)
        const query = queries[i]
        return sub_pieces.map(piece => {
            const query_path = piece.path.filter(el => typeof el !== 'number')
            const query_entity = get_real_entity_name(last(query_path) as string, get_path(query_path as any, query))
            return { entity: query_entity, ...piece }
        })
    })

    const result_pieces_by_entity = group_by(result_pieces_with_entity, ({ entity }) => entity)

    const sorted_result_records = sort_database_rows(
        mutation_pieces,
        new Map(),
        { start_index: 0, end_index: mutation_pieces.length },
        Object.keys(result_pieces_by_entity),
        Object.values(result_pieces_by_entity).map(pieces => pieces.map((piece: any) => piece.record)),
        orma_schema
    )

    mutation_pieces.forEach((mutation_piece, i) => {
        const result_record = sorted_result_records[i] as any
        if (result_record) {
            result_record._mutation_piece = mutation_piece
        }
    })
}

export type MiddlewareQueryResult<T> = T extends any[]
    ? MiddlewareQueryResult<T[number]>[]
    : T extends object
      ? { -readonly [P in keyof T]?: MiddlewareQueryResult<T[P]> } & {
            _mutation_piece?: MutationPiece
        }
      : T
