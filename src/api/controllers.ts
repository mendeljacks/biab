import { mutate_handler, query_handler } from '../config/orma'
import { authenticate } from './auth/auth'
import { ensure_ownership } from './auth/ownership'
import { ensure_perms } from './auth/perms'

export const welcome = async (to: string) => `Welcome to ${to}`

export const query = async (req, jwt_secret: string) => {
    const token_content = await authenticate(req, jwt_secret)
    await ensure_perms(req.body, token_content, 'query')
    await ensure_ownership(req.body, token_content, 'query')
    return query_handler(req.body)
}

export const mutate = async (req, jwt_secret: string) => {
    const token_content = await authenticate(req, jwt_secret)
    await ensure_perms(req.body, token_content, 'mutate')
    await ensure_ownership(req.body, token_content, 'mutate')
    return mutate_handler(req.body)
}
