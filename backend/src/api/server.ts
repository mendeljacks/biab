import cors from '@fastify/cors'
import Fastify from 'fastify'
import { handler } from '..'
import { introspect } from '../config/orma'
import { prepopulate } from '../scripts/prepopulate'
import { google_login_callback, google_login } from './auth/auth_google'
import { mutate, query, welcome } from './controllers'

export const start = async () => {
    await introspect()
    await prepopulate()

    const app = Fastify()
    await app.register(cors)

    app.get('/', handler(welcome))
    app.get('/auth/google/login', handler(google_login))
    app.get('/auth/google/callback', handler(google_login_callback))
    app.post('/query', handler(query))
    app.post('/mutate', handler(mutate))

    const port = Number(process.env.PORT) || 3001
    await app.listen({ port, host: '0.0.0.0' })
    console.clear()
    console.log(`🟢 Server running on port ${port}`)
}
