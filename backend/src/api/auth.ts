import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { mutation_entity_deep_for_each } from 'orma/src/mutate/helpers/mutate_helpers'
import { query_for_each } from 'orma/src/query/query_helpers'
import { mutate_handler, query_handler } from '../config/orma'

const roles = [
    { id: 1, name: 'admin' },
    { id: 2, name: 'user' }
]
const role_has_perms = {
    club_has_users: { create: [1], read: [1], update: [1], delete: [1] },
    clubs: { create: [1], read: [1], update: [1], delete: [1] },
    review_has_photos: { create: [1], read: [1], update: [1], delete: [1] },
    photos: { create: [1], read: [1], update: [1], delete: [1] },
    reviews: { create: [1], read: [1], update: [1], delete: [1] },
    places: { create: [1], read: [1], update: [1], delete: [1] },
    user_has_roles: { create: [1], read: [1], update: [1], delete: [1] },
    roles: { create: [1], read: [1], update: [1], delete: [1] },
    users: { create: [1], read: [1], update: [1], delete: [1] }
}

type TokenContent = {
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
        users[0].user_has_roles?.map(({ role_id }) => role_id),
        process.env.jwt_secret
    )

    return { token, user_id: users[0].id }
}

export const make_token = async (role_ids, secret): Promise<string> => {
    return new Promise((resolve, reject) => {
        jwt.sign(
            { role_ids } as TokenContent,
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
        jwt.verify(token, jwt_secret, async (err, tokenContent: TokenContent) => {
            if (err) {
                return reject({ message: 'Invalid login credentials. Please sign in again.' })
            } else {
                return resolve(tokenContent as TokenContent)
            }
        })
    })
}

export const ensure_perms = async (query, tokenContent: TokenContent, mode: 'query' | 'mutate') => {
    const { role_ids } = tokenContent
    let needed_perms = {}
    const deep_for_each = mode === 'query' ? query_for_each : mutation_entity_deep_for_each
    deep_for_each(query, (value, path, entity_name) => {
        if (!needed_perms[entity_name]) needed_perms[entity_name] = {}
        needed_perms[entity_name][value.$operation || 'read'] = true
    })

    const table_names = Object.keys(needed_perms)
    const missing_perms = table_names.reduce((acc: string[], table_name: string) => {
        const operation = Object.keys(needed_perms[table_name])
        if (!role_has_perms[table_name][operation].some(role_id => role_ids?.includes(role_id))) {
            acc.push(table_name)
        }
        return acc
    }, [])

    if (missing_perms.length > 0) {
        return Promise.reject({
            message: `Additional read permissions required: ${missing_perms.join(', ')}`,
            additional_data: {
                needed_read_permissions: [...table_names],
                missing_read_permissions: missing_perms
            }
        })
    }

    return Promise.resolve()
}
