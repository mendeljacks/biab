import spawn from 'cross-spawn'

export const run_process = async (arg_list: string[]): Promise<any> => {
    return new Promise((resolve, reject) => {
        // @ts-ignore
        console.log(`Executing: ${arg_list.join(' ')}`)
        const child_process = spawn(arg_list[0], arg_list.slice(1), {
            stdio: 'pipe'
        })

        let output = []
        let err = []
        child_process.stdout.on('data', data => {
            // console.log(data.toString())
            output.push(data.toString())
        })
        child_process.stderr.on('data', data => {
            // console.error(data.toString())
            err.push(data.toString())
        })

        child_process.on('close', code => {
            if (code !== 0) reject(err)
            resolve(output)
        })
    })
}
