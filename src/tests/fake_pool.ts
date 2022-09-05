export const fake_pool = {
    query: () => {
        return []
    },
    connect: () => ({ query: () => {}, release: () => {} })
}
