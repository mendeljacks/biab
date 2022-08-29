import dbMigrate from 'db-migrate'

export const reset = async (config: Object) => {
    try {
        const dbm = dbMigrate.getInstance(true, { config })
        await dbm.silence(true)
        await dbm.reset()
        await dbm.up()
    } catch (error) {
        console.log(error)
    }
}
