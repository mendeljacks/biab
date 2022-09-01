import npmPublish from '@jsdevtools/npm-publish'
import { run_process } from './run_process'

export const deploy = async () => {
    try {
        await npmPublish({
            package: './package.json',
            token: process.env.NPM_TOKEN
        })
    } catch (error) {
        process.exit(1)
    }
}
