import dbMigrate from 'db-migrate'
import { default as config } from '../../database.json'

export const reset = async () => {
    try {
        const dbm = dbMigrate.getInstance(true, { config })
        await dbm.silence(true)
        await dbm.reset()
        await dbm.up()
    } catch (error) {
        console.log(error)
    }
}
