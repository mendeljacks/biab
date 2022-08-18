import Fastify from 'fastify'
import cors from '@fastify/cors'
import { introspect } from '../config/orma'
import {
    login_controller,
    mutate_controller,
    query_controller,
    signup_controller
} from './controllers'
import { handler } from '..'

const port = Number(process.env.PORT) || 3001

export const start = async () => {
    await introspect()
    const app = Fastify()
    await app.register(cors)

    app.get(
        '/',
        handler(_ => 'Welcome! Login at POST /login. Query at POST /query. Mutate at POST /mutate.')
    )
    app.post('/signup', handler(signup_controller))
    app.post('/login', handler(login_controller))
    app.post('/query', handler(query_controller))
    app.post('/mutate', handler(mutate_controller))

    await app.listen({ port })
    console.log(`Server listening on ${port}`)
}
