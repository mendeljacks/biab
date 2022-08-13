import dbMigrate from 'db-migrate'

export const reset = async () => {
  try {
    var dbm = dbMigrate.getInstance(true, {
      config: {
        dev: {
          driver: 'pg',
          connectionString: process.env.pg,
          ssl: true
        }
      }
    })
    await dbm.silence(true)
    await dbm.reset()
    await dbm.up()
  } catch (error) {
    console.log(error)
  }
}
