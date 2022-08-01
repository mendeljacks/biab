import cors from 'cors'
import express from 'express'
import { handler } from 'express_phandler'

const port = process.env.PORT || 3001

export const start = async (env: string) => {
    const app = express()

    app.use(cors())
    app.use(express.json({ limit: '50mb' }))
    app.use(express.urlencoded({ extended: true, limit: '50mb' }))

    app.get(
        '/',
        handler(() => 'Welcome')
    )

    await new Promise(r => app.listen(port, r as any))
    console.log('Listening at http://localhost:' + port)
}
