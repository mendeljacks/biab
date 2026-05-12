export type { DbType } from './config/orma'
export type { MutateHandlerOptions } from './config/orma'
export {
    generate_middleware_tracking_predicate,
    middleware_system_prefetch,
    run_post_middleware_system
} from './api/middleware/post_middleware_system'
export type {
    MiddlewareConfig,
    MiddlewareFunction,
    MiddlewareQueryResult,
    OrmaQueryFn
} from './api/middleware/post_middleware_system'
export { dehydrate } from './scripts/dehydrate'
export { hydrate } from './scripts/hydrate'

process.on('unhandledRejection', err => {
    console.log(err)
})

export const handler = (promiseFn: (req: any, res: any) => Promise<any>) => (req: any, res: any) =>
    promiseFn(req, res)
        .then((result: any) => res.status(200).send(result))
        .catch((err: any) => res.status(400).send(err))
