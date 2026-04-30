export const promise_all_settled = async <T>(promises: Promise<T>[]) => {
    const results = await Promise.allSettled(promises)
    const errors = results.flatMap(el => (el.status === 'rejected' ? [el.reason] : []))
    if (errors.length > 0) {
        throw errors
    }

    const success_values = results.flatMap(el => (el.status === 'fulfilled' ? [el.value] : []))
    return success_values
}
