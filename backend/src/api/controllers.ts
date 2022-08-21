import { mutate_handler, query_handler } from '../config/orma'
import { authenticate, ensure_perms, login_user, signup_user } from './auth'
import { ensure_ownership } from './auth/ownership'

export const welcome_controller = async _ => 'Welcome!'

export const signup_controller = req => signup_user(req.body.email, req.body.password)

export const login_controller = req => login_user(req.body.email, req.body.password)

export const query_controller = async req => {
    const token_content = await authenticate(req, process.env.jwt_secret)
    await ensure_perms(req.body, token_content, 'query')
    await ensure_ownership(req.body, token_content, 'query')
    return query_handler(req.body)
}

export const mutate_controller = async req => {
    const token_content = await authenticate(req, process.env.jwt_secret)
    await ensure_perms(req.body, token_content, 'mutate')
    await ensure_ownership(req.body, token_content, 'mutate')
    return mutate_handler(req.body)
}
