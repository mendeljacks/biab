import cors from 'cors'
import express from 'express'
import { handler } from 'express_phandler'
import { introspect } from '../config/orma'
import {
    login_controller,
    mutate_controller,
    query_controller,
    signup_controller
} from './controllers'

const port = process.env.PORT || 3001

export const start = async (env: string) => {
    const app = express()
    await introspect()

    app.use(cors())
    app.use(express.json({ limit: '50mb' }))
    app.use(express.urlencoded({ extended: true, limit: '50mb' }))

    app.post('/signup', handler(signup_controller))
    app.post('/login', handler(login_controller))
    app.post('/query', handler(query_controller))
    app.post('/mutate', handler(mutate_controller))

    await new Promise(r => app.listen(port, r as any))
    console.log('Listening at http://localhost:' + port)
}
