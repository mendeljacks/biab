import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { mutation_entity_deep_for_each } from 'orma/src/mutate/helpers/mutate_helpers'
import { query_for_each } from 'orma/src/query/query_helpers'
import { mutate_handler, query_handler } from '../config/orma'
import { populated_data } from '../scripts/prepopulate'

export const admin = populated_data.roles[0].id
export const user = populated_data.roles[1].id

const everyone = [admin, user]
const admin_only = [admin]
const disabled = []
const role_has_perms = {
    migrations: { create: disabled, read: disabled, update: disabled, delete: disabled },
    club_has_users: { create: everyone, read: everyone, update: everyone, delete: everyone },
    clubs: { create: everyone, read: everyone, update: everyone, delete: everyone },
    review_has_photos: { create: everyone, read: everyone, update: everyone, delete: everyone },
    photos: { create: everyone, read: everyone, update: disabled, delete: everyone },
    reviews: { create: everyone, read: everyone, update: everyone, delete: admin_only },
    places: { create: admin_only, read: everyone, update: admin_only, delete: admin_only },
    user_has_roles: {
        create: admin_only,
        read: admin_only,
        update: admin_only,
        delete: admin_only
    },
    roles: { create: admin_only, read: admin_only, update: admin_only, delete: admin_only },
    users: { create: admin_only, read: everyone, update: everyone, delete: everyone }
}

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

export const ensure_perms = async (
    query,
    token_content: TokenContent,
    mode: 'query' | 'mutate'
) => {
    const { user_id, role_ids } = token_content
    let needed_perms = {}
    const deep_for_each = mode === 'query' ? query_for_each : mutation_entity_deep_for_each
    deep_for_each(query, (value, path, entity_name) => {
        if (!needed_perms[entity_name]) needed_perms[entity_name] = {}
        needed_perms[entity_name][value.$operation || 'read'] = true
    })

    const table_names = Object.keys(needed_perms)
    const missing_perms = table_names.reduce((acc: string[], table_name: string) => {
        const operation = Object.keys(needed_perms[table_name])
        if (!role_has_perms[table_name][operation].some(role_id => role_ids.includes(role_id))) {
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
