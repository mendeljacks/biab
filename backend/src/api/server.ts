import cors from 'cors'
import express from 'express'
import { handler } from 'express_phandler'
import { mutate_handler, query_handler } from '../config/orma'
import { introspect } from '../scripts/introspect'
import { login_user, signup_user } from './auth'

const port = process.env.PORT || 3001

export const start = async (env: string) => {
  const app = express()
  await introspect(env)

  app.use(cors())
  app.use(express.json({ limit: '50mb' }))
  app.use(express.urlencoded({ extended: true, limit: '50mb' }))

  app.post(
    '/signup',
    handler(req => signup_user(req.body.email, req.body.password))
  )
  app.post(
    '/login',
    handler(req => login_user(req.body.email, req.body.password))
  )

  app.post(
    '/query',
    handler(req => query_handler(req.body))
  )

  app.post(
    '/mutate',
    handler(req => mutate_handler(req.body))
  )

  await new Promise(r => app.listen(port, r as any))
  console.log('Listening at http://localhost:' + port)
}
