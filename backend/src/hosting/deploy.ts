import cuid from 'cuid'
import git from 'git-rev-sync'
import { run_tests } from './helpers/promise_mocha'
import { run_process } from './helpers/run_process'

export const deploy = async () => {
    try {
        process.chdir('../')
        const version = 'GIT_' + git.short() + '_GID_' + cuid()

        const result = await run_tests(
            {
                timeout: 20000,
                bail: false,
                checkLeaks: true,
                color: true,
                fullTrace: true,
                inlineDiffs: true,
                require: ['ts-node/register', 'dotenv/config'],
                spec: ['**/src/**/*.test.ts']
            },
            file => file.slice(-8) === '.test.ts',
            './backend/src'
        )

        await Promise.all([aws(version)])

        await run_process(['docker', 'image', 'prune', '-af'])
        console.log('Done')
    } catch (error) {
        console.error(error)
        process.exit(1)
    }
}

const aws = async version => {
    try {
        // Run aws configure
        // Login with: aws ecr get-login-password --region eu-central-1 | docker login --username AWS --password-stdin 684954451958.dkr.ecr.eu-central-1.amazonaws.com

        const image = `684954451958.dkr.ecr.eu-central-1.amazonaws.com/clubs:latest`

        await run_process([
            'docker',
            'build',
            '-f',
            'backend/src/hosting/Dockerfile',
            '--tag',
            image,
            '.'
        ])
        await run_process(['docker', 'push', image])
    } catch (error) {
        console.error('Failed to deploy')
        console.error(error)
        process.exit(1)
    }
}
