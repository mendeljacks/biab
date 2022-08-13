import { mutate_handler, query_handler } from '../config/orma'
import { authenticate, login_user, signup_user } from './auth'

export const signup_controller = req => signup_user(req.body.email, req.body.password)

export const login_controller = req => login_user(req.body.email, req.body.password)

export const query_controller = async req => {
    const tokenContent = await authenticate(req, process.env.jwt_secret)
    return query_handler(req.body)
}

export const mutate_controller = async req => {
    const tokenContent = await authenticate(req, process.env.jwt_secret)
    return mutate_handler(req.body)
}
