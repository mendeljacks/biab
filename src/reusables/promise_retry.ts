import { AppError } from './error_handling'
import { operation, RetryOperation, TimeoutsOptions } from 'retry'

export const is_network_error = async (error: any) => {
    if (
        // seen in easypost tracking status fetch
        error?.axios_error?.isAxiosError
    ) {
        return true
    }
    if (error?.isAxiosError && !error?.response) {
        return true
    }
    if (error?.response?.status === 429) {
        return true
    }
    return false
}

export const promise_retry = <T>(
    asyncFn: () => Promise<T>,
    options: TimeoutsOptions,
    should_retry: (error: any) => Promise<boolean>
): Promise<T> => {
    return new Promise((resolve, reject) => {
        const instance = operation({
            randomize: true,
            minTimeout: 3_000,
            maxTimeout: 300_000,
            factor: 1.618,
            ...options
        }) as RetryOperation & {
            _timeouts: number[]
            _originalTimeouts: number[]
        }

        instance.attempt(async current_attempt => {
            try {
                const result = await asyncFn()
                instance.stop()
                resolve(result)
            } catch (error: any) {
                const retry = await should_retry(error).catch(err => {
                    console.error(
                        `Error in should_retry function: ${err.message}`
                    )
                    return false
                })

                const attempt_count = instance.attempts()
                if (!retry) {
                    instance.stop()
                    return reject({
                        message: `${attempt_count} attempts failed`,
                        additional_info: {
                            error
                        }
                    } as const satisfies AppError)
                }

                if (instance.retry(error)) {
                    const times = instance._originalTimeouts
                    const nextDelay = times[attempt_count - 1]
                    console.log(`Retrying in ${nextDelay} ms`)

                    return
                }

                reject({
                    message: `${attempt_count} attempts failed`,
                    additional_info: {
                        error
                    }
                } as const satisfies AppError)
            }
        })
    })
}