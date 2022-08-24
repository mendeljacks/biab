import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { mutate_handler, query_handler } from '../../config/orma'

export type TokenContent = {
    user_id: number
    role_ids: number[]
}

export const make_token = async (
    user_id: number,
    role_ids: number[],
    secret: string
): Promise<string> => {
    return jwt.sign({ user_id, role_ids } as TokenContent, secret)
}

export const authenticate = async (req, jwt_secret): Promise<TokenContent> => {
    const token = req.headers?.authorization?.split(' ')[1]
    if (!token) return Promise.reject('No token')

    const token_content: TokenContent = jwt.verify(token, jwt_secret)
    return token_content
}
