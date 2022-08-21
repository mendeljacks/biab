import { Edge } from 'orma/src/helpers/schema_helpers'
import {
    add_connection_edges,
    get_upwards_connection_edges,
    remove_connection_edges
} from 'orma/src/query/macros/where_connected_macro'
import { OrmaSchema } from 'orma/src/introspector/introspector'
import { orma_schema } from '../../../../common/orma_schema'

const baseline_edges = get_upwards_connection_edges(orma_schema as any as OrmaSchema)

const add_edges: Edge[] = [
    {
        from_entity: 'photos',
        from_field: 'id',
        to_entity: 'review_has_photos',
        to_field: 'photo_id'
    }
]

const remove_edges: Edge[] = [
    // {
    //     from_entity: 'shipments',
    //     from_field: 'warehouse_id_dest',
    //     to_entity: 'warehouses',
    //     to_field: 'id'
    // },
]

export const connection_edges = add_connection_edges(
    remove_connection_edges(baseline_edges, remove_edges),
    add_edges
)
