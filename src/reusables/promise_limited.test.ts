import { expect } from 'chai'
import { describe, test } from 'mocha'
import { promise_limited } from './promise_limited'

describe(promise_limited.name, () => {
    test('resolves array of promises', async () => {
        const result = await promise_limited(
            [() => Promise.resolve(1), () => Promise.resolve(2), () => Promise.resolve(3)],
            { limit: 10 }
        )
        expect(result).to.deep.equal([1, 2, 3])
    })
    test('limits concurrency', async () => {
        let running = 0
        let maxRunning = 0

        const tasks = Array.from({ length: 5 }, (_, i) => async () => {
            running++
            maxRunning = Math.max(maxRunning, running)
            await new Promise(res => setTimeout(res, 1))
            running--
            return i
        })

        const result = await promise_limited(tasks, { limit: 1 })

        expect(result).to.deep.equal([0, 1, 2, 3, 4])
        expect(maxRunning).to.equal(1)
    })

    test('rejects if any promise rejects', async () => {
        const values = [() => Promise.resolve(1), () => Promise.reject(new Error('fail')), () => Promise.resolve(3)]
        try {
            await promise_limited(values, { limit: 100 })
            expect.fail('Should have thrown')
        } catch (err) {
            expect((err as Error).message).to.equal('fail')
        }
    })
})
