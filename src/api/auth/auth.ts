import jwt from 'jsonwebtoken'

export type TokenContent = {
    user_id: string | number
}
export const make_token = async (user_id: string | number, secret: string, expiry?: string): Promise<string> => {
    return jwt.sign({ user_id } as TokenContent, secret, expiry ? { expiresIn: expiry } : {})
}

export const authenticate = async (req: Record<string, any>, jwt_secret: string): Promise<TokenContent> => {
    const token = req.headers?.authorization?.split(' ')[1]
    if (!token) return Promise.reject('No token')

    const token_content: TokenContent = jwt.verify(token, jwt_secret)
    return token_content
}
