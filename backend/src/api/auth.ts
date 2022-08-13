import jwt from 'jsonwebtoken'
import { mutate_handler, query_handler } from '../config/orma'
import bcrypt from 'bcrypt'

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

    const token = await new Promise((resolve, reject) => {
        jwt.sign(
            { username: email },
            process.env.jwt_secret,
            /*{expiresIn: 60},*/ (err, token) => {
                if (err) {
                    reject(err)
                } else {
                    console.log(`${email} Logged in`)
                    resolve(token)
                }
            }
        )
    })

    return { token, user_id: users[0].id }
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

export const authenticate = async (req, jwt_secret) => {
    const token = req.headers?.authorization?.split(' ')[1]
    if (!token) return Promise.reject('No token')

    // Verify the token
    jwt.verify(token, jwt_secret, async (err, tokenContent) => {
        if (err) {
            return Promise.reject({
                message: 'Invalid login credentials.',
                recommendation: 'Please sign in again'
            })
        } else {
            return tokenContent
        }
    })
}
