import { expect } from 'chai'
import { describe, test } from 'mocha'
import sinon from 'sinon'
import { is_network_error, promise_retry } from './promise_retry'

describe('promise_retry', () => {
    afterEach(() => {
        sinon.restore()
    })
    test('should resolve immediately on first success', async () => {
        const successFn = sinon.stub().resolves('success')
        const result = await promise_retry(successFn, { minTimeout: 1 }, is_network_error)
        expect(result).to.equal('success')
        expect(successFn.callCount).to.equal(1)
    })

    test('should retry and eventually succeed', async () => {
        const failingFn = sinon.stub()
        failingFn.onCall(0).rejects(new Error('Failed 1'))
        failingFn.onCall(1).rejects(new Error('Failed 2'))
        failingFn.onCall(2).resolves('success')

        const result = await promise_retry(failingFn, { retries: 3, minTimeout: 1, randomize: false }, async () => true)
        expect(result).to.equal('success')
        expect(failingFn.callCount).to.equal(3)
    })

    test('should exhaust retries and reject', async () => {
        const error = new Error('Persistent error')
        const failingFn = sinon.stub().rejects(error)

        try {
            await promise_retry(
                failingFn,
                {
                    retries: 3,
                    minTimeout: 1,
                    randomize: false
                },
                async () => true
            )
            expect(true).to.equal(false)
        } catch (caughtError: any) {
            expect(caughtError.additional_info.error.message).to.equal('Persistent error')
            expect(failingFn.callCount).to.equal(4)
        }
    })

    test('should use custom should_retry logic', async () => {
        const customError: any = new Error('Custom error')
        customError.code = 429
        const failingFn = sinon.stub().rejects(customError)

        const shouldRetry = sinon.stub().resolves(true)

        try {
            await promise_retry(failingFn, { retries: 2, minTimeout: 1 }, shouldRetry)
            expect(true).to.equal(false)
        } catch (caughtError: any) {
            expect(caughtError.additional_info.error.message).to.equal('Custom error')
            expect(failingFn.callCount).to.equal(3)
            expect(shouldRetry.callCount).to.equal(3)
        }
    })

    test('should stop retrying when should_retry returns false', async () => {
        const error = new Error('Non-retryable error')
        const failingFn = sinon.stub().rejects(error)
        const shouldRetry = sinon.stub().resolves(false)

        try {
            await promise_retry(failingFn, { retries: 3, minTimeout: 1 }, shouldRetry)
            expect(true).to.equal(false)
        } catch (caughtError: any) {
            expect(caughtError.additional_info.error.message).to.equal('Non-retryable error')
            expect(failingFn.callCount).to.equal(1)
            expect(shouldRetry.callCount).to.equal(1)
        }
    })

    test('should handle default should_retry for Axios errors', async () => {
        const axiosError: any = new Error('Axios error')
        axiosError.isAxiosError = true
        const failingFn = sinon.stub().rejects(axiosError)

        try {
            await promise_retry(failingFn, { retries: 1, minTimeout: 1 }, is_network_error)
            expect(true).to.equal(false)
        } catch (caughtError: any) {
            expect(caughtError.additional_info.error.message).to.equal('Axios error')
            expect(failingFn.callCount).to.equal(2)
        }
    })

    test('should not retry non-Axios errors by default', async () => {
        const regularError = new Error('Regular error')
        const failingFn = sinon.stub().rejects(regularError)

        try {
            await promise_retry(failingFn, { retries: 3, minTimeout: 1 }, is_network_error)
            expect(true).to.equal(false)
        } catch (caughtError: any) {
            expect(caughtError.additional_info.error.message).to.equal('Regular error')
            expect(failingFn.callCount).to.equal(1)
        }
    })

    test('should handle errors in should_retry function', async () => {
        const error = new Error('Original error')
        const failingFn = sinon.stub().rejects(error)

        try {
            await promise_retry(failingFn, { retries: 1, minTimeout: 1 }, async () => {
                throw new Error('Retry check failed')
            })
            expect(true).to.equal(false)
        } catch (caughtError: any) {
            expect(failingFn.callCount).to.equal(1)
        }
    })

    test('should respect retry configuration options', async () => {
        const options = {
            retries: 3,
            factor: 2,
            minTimeout: 1
        }

        const failingFn = sinon.stub().rejects(new Error('Failed'))

        try {
            await promise_retry(failingFn, options, async () => true)
            expect(true).to.equal(false)
        } catch (caughtError: any) {
            expect(failingFn.callCount).to.equal(4)
        }
    })

    test('should handle immediate success after previous failures', async () => {
        const failingFn = sinon.stub()
        failingFn.onCall(0).rejects(new Error('Failed 1'))
        failingFn.onCall(1).rejects(new Error('Failed 2'))
        failingFn.onCall(2).resolves('success')

        const result = await promise_retry(failingFn, { retries: 3, minTimeout: 1 }, async () => true)
        expect(result).to.equal('success')
        expect(failingFn.callCount).to.equal(3)
    })

    test('should maintain error stack traces', async () => {
        const error = new Error('Original error')
        const failingFn = sinon.stub().rejects(error)

        try {
            await promise_retry(failingFn, { retries: 1, minTimeout: 1 }, is_network_error)
            expect(true).to.equal(false)
        } catch (caughtError: any) {
            expect(caughtError.additional_info.error).to.equal(error)
            expect(caughtError.additional_info.error.stack).to.include('Original error')
        }
    })
    test('should not retry if not network error', async () => {
        const failingFn = sinon.stub()
        failingFn.onCall(0).callsFake(async () => {
            return Promise.reject(new Error('Failed 0'))
        })
        failingFn.onCall(1).callsFake(async () => {
            return Promise.reject(new Error('Failed 1'))
        })
        failingFn.onCall(2).callsFake(async () => {
            return Promise.reject(new Error('Failed 2'))
        })

        try {
            await promise_retry(failingFn, { retries: 2, minTimeout: 1 }, is_network_error)
            expect(true).to.equal(false)
        } catch (caughtError: any) {
            expect(caughtError.additional_info.error.message).to.equal('Failed 0')
        }
    })
    test('should reject with last error if network error', async () => {
        const failingFn = sinon.stub()
        failingFn.onCall(0).callsFake(async () => {
            const error: any = new Error('Failed 0')
            error.response = { status: 429 }
            return Promise.reject(error)
        })
        failingFn.onCall(1).callsFake(async () => {
            const error: any = new Error('Failed 1')
            error.response = { status: 429 }
            return Promise.reject(error)
        })
        failingFn.onCall(2).callsFake(async () => {
            const error: any = new Error('Failed 2')
            error.response = { status: 429 }
            return Promise.reject(error)
        })

        try {
            await promise_retry(failingFn, { retries: 2, minTimeout: 1 }, is_network_error)
            expect(true).to.equal(false)
        } catch (caughtError: any) {
            expect(caughtError.additional_info.error.message).to.equal('Failed 2')
        }
    })
})
