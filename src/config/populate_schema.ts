type PrepopulateData = {
    [entity_name: string]: {
        supercede: boolean
        rows: readonly Record<string, any>[]
    }
}

export const populate_schema = <T extends { $entities: Record<string, any> }>(
    schema: T,
    prepopulate_data: PrepopulateData
): T => {
    const new_schema = JSON.parse(JSON.stringify(schema))
    for (const [entity, prepopulate] of Object.entries(prepopulate_data)) {
        if (new_schema.$entities[entity]) {
            new_schema.$entities[entity].$prepopulate = prepopulate
        }
    }
    return new_schema
}
