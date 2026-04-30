import pLimit, { type LimitFunction } from 'p-limit'

export type Running = Record<string, LimitFunction>
export const drop_if_busy = async (fn: () => Promise<any>, key: string, running: Running) => {
    if (running[key]) {
        return
    }

    running[key] = pLimit(1)
    try {
        const result = await running[key](fn)
        return result
    } finally {
        delete running[key]
    }
}
