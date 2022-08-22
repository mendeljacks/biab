import Fastify from 'fastify'
import cors from '@fastify/cors'
import { introspect } from '../config/orma'
import { login, mutate, query, signup, welcome } from './controllers'
import { handler } from '..'
import { prepopulate } from '../scripts/prepopulate'

export const start = async () => {
    await introspect()
    await prepopulate()

    const app = Fastify()
    await app.register(cors)

    app.get('/', handler(welcome))
    app.post('/signup', handler(signup))
    app.post('/login', handler(login))
    app.post('/query', handler(query))
    app.post('/mutate', handler(mutate))

    const port = Number(process.env.PORT) || 3001
    await app.listen({ port, host: '0.0.0.0' })
    console.log(`🟢 Server running on port ${port}`)
}
