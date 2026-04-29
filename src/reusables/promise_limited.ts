import pLimit from 'p-limit'

/**
 * Behaves like Promise.all but limits the concurrency of the promises.
 *
 * @param values An array of promises or values.
 * @param limit The maximum number of promises to run concurrently. Defaults to 10.
 * @returns A promise that resolves to an array of the resolved values.
 */
export const promise_limited = <T extends readonly (() => unknown)[] | []>(
    values: T,
    options?: { limit: number }
): Promise<{ -readonly [P in keyof T]: Awaited<ReturnType<T[P]>> }> => {
    const limiter = pLimit(options?.limit ?? 10)

    const limited_promises = values.map(fn => limiter(() => fn()))

    return Promise.all(limited_promises) as Promise<{
        -readonly [P in keyof T]: Awaited<ReturnType<T[P]>>
    }>
}