import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { mutate_handler, query_handler } from '../../config/orma'

export type TokenContent = {
    user_id: number
    role_ids: number[]
}

export const login_user = async (email: string, password: string) => {
    if (!email) {
        return Promise.reject('Must enter an email')
    }
    if (!password) {
        return Promise.reject('Must enter a password')
    }

    const $where: any = {
        $eq: ['email', { $escape: email }]
    }
    const query = {
        users: {
            id: true,
            email: true,
            password: true,
            user_has_roles: {
                role_id: true
            },
            $where
        }
    }

    const { users } = (await query_handler(query)) as any
    if (users.length !== 1) {
        return Promise.reject('Incorrect email')
    }
    if (!bcrypt.compareSync(password, users[0].password)) {
        return Promise.reject('Incorrect password')
    }

    const token = await make_token(
        users[0].id,
        users[0].user_has_roles?.map(({ role_id }) => role_id) || [],
        process.env.jwt_secret
    )

    return { token, user_id: users[0].id }
}

export const make_token = async (
    user_id: number,
    role_ids: number[],
    secret: string
): Promise<string> => {
    return new Promise((resolve, reject) => {
        jwt.sign(
            { user_id, role_ids } as TokenContent,
            secret,
            /*{expiresIn: 60},*/ (err, token) => {
                if (err) {
                    reject(err)
                } else {
                    resolve(token)
                }
            }
        )
    })
}

export const signup_user = async (email: string, password: string) => {
    if (!email) {
        return Promise.reject('Must enter a email')
    }
    if (!password) {
        return Promise.reject('Must enter a password')
    }

    const mutation = {
        $operation: 'create',
        users: [
            {
                email,
                password: bcrypt.hashSync(password, 10)
            }
        ]
    }

    return mutate_handler(mutation)
}

export const authenticate = async (req, jwt_secret): Promise<TokenContent> => {
    const token = req.headers?.authorization?.split(' ')[1]
    if (!token) return Promise.reject('No token')

    // Verify the token
    return new Promise((resolve, reject) => {
        jwt.verify(token, jwt_secret, async (err, token_content: TokenContent) => {
            if (err) {
                return reject({ message: 'Invalid login credentials. Please sign in again.' })
            } else {
                return resolve(token_content)
            }
        })
    })
}
