import cuid from 'cuid'
import { mutation_entity_deep_for_each } from 'orma/src/mutate/helpers/mutate_helpers'

export const add_resource_ids = (mutation: any) => {
    mutation_entity_deep_for_each(mutation, (value, path) => {
        if (value.$operation === 'create') {
            const resource_id = cuid()
            value.resource_id = resource_id
        }
    })
}
