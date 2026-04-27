import { Pool } from '../config/orma'

export const fake_db_adapter = (connection: Pool) => async (sqls: { sql_string }[]) => {
    const sql = sqls.map(el => el.sql_string).join(';\n')
    const response = await connection.query(sql)

    if (!Array.isArray(response)) {
        return [response.rows]
    } else {
        return response.map(row => row.rows)
    }
}

/** @deprecated Use fake_db_adapter instead */
export const fake_byo_query_fn = async (sqls: { sql_string }[], connection: Pool) => {
    return fake_db_adapter(connection)(sqls)
}
