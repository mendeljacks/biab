import { types } from 'pg'

export const parse_int = val => parseInt(val)

types.setTypeParser(20, parse_int)

export const identity = el => el
types.setTypeParser(types.builtins.TIMESTAMP, identity)

export const trans = async (fn, pool: { connect: Function }) => {
    const connection = await pool.connect()
    try {
        await connection.query('BEGIN')
        const res = await fn(connection)
        await connection.query('COMMIT')
        await connection.release()
        return res
    } catch (err) {
        await connection.query('ROLLBACK')
        await connection.release()
        return Promise.reject(err)
    }
}
