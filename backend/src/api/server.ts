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
    const domain = 'dev-oibxrvy6.us.auth0.com'
    const secret = '6bE0w5B25aHQ3wekEv5fwNXGM-j0HJAlL6Mwa-992kcmErGawW6kA_ksrG2LeBwm'
    app.register(require('fastify-auth0-verify'), { domain, secret })

    app.get('/', handler(welcome))
    app.post('/signup', handler(signup))
    app.post('/login', handler(login))
    app.post('/query', handler(query))
    app.post('/mutate', handler(mutate))

    const port = Number(process.env.PORT) || 3001
    await app.listen({ port, host: '0.0.0.0' })
    console.clear()
    console.log(`🟢 Server running on port ${port}`)
}
