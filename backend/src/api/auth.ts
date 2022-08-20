import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { mutation_entity_deep_for_each } from 'orma/src/mutate/helpers/mutate_helpers'
import { query_for_each } from 'orma/src/query/query_helpers'
import { mutate_handler, query_handler } from '../config/orma'
import { populated_data } from '../scripts/prepopulate'

const admin = populated_data.roles[0].id
const user = populated_data.roles[0].id

const role_has_perms = {
    club_has_users: {
        create: [admin, user],
        read: [admin, user],
        update: [admin, user],
        delete: [admin, user]
    },
    clubs: {
        create: [admin, user],
        read: [admin, user],
        update: [admin, user],
        delete: [admin, user]
    },
    review_has_photos: {
        create: [admin, user],
        read: [admin, user],
        update: [admin, user],
        delete: [admin, user]
    },
    photos: { create: [admin, user], read: [admin, user], update: [], delete: [admin, user] },
    reviews: { create: [admin, user], read: [admin, user], update: [admin, user], delete: [admin] },
    places: { create: [admin], read: [admin, user], update: [admin], delete: [admin] },
    user_has_roles: {
        create: [admin],
        read: [admin],
        update: [admin],
        delete: [admin]
    },
    roles: { create: [admin], read: [admin], update: [admin], delete: [admin] },
    users: { create: [admin], read: [admin, user], update: [admin, user], delete: [admin, user] }
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
