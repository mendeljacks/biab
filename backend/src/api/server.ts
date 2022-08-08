import cors from 'cors'
import express from 'express'
import { handler } from 'express_phandler'
import { mutate_handler, query_handler } from '../config/orma'
import { pool } from '../config/pg'
import { introspect } from '../scripts/introspect'

const port = process.env.PORT || 3001

export const start = async (env: string) => {
    const app = express()
    await introspect(env)

    app.use(cors())
    app.use(express.json({ limit: '50mb' }))
    app.use(express.urlencoded({ extended: true, limit: '50mb' }))

    app.post(
        '/query',
        handler(async (req: Request) => {
            const results = await query_handler(req.body)
            return results
        })
    )

    app.post(
        '/mutate',
        handler(async req => mutate_handler(req.body))
    )

    await new Promise(r => app.listen(port, r as any))
    console.log('Listening at http://localhost:' + port)
}
