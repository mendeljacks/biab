export type { DbType } from './config/orma'
export { dehydrate } from './scripts/dehydrate'
export { hydrate } from './scripts/hydrate'

process.on('unhandledRejection', err => {
    console.log(err)
})

export const handler = (promiseFn: (req: any, res: any) => Promise<any>) => (req: any, res: any) =>
    promiseFn(req, res)
        .then((result: any) => res.status(200).send(result))
        .catch((err: any) => res.status(400).send(err))
