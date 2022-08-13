import { Pool, types } from 'pg'

types.setTypeParser(20, function (val) {
    return parseInt(val, 10)
})

export const identity = el => el
types.setTypeParser(types.builtins.TIMESTAMP, identity)

export const pool = new Pool({
    connectionString: process.env.pg,
    types,
    ssl: { rejectUnauthorized: false }
})

export const trans = async fn => {
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
