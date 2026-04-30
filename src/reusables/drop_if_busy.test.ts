import { expect } from 'chai'
import { stub } from 'sinon'
import { drop_if_busy, type Running } from './drop_if_busy'

describe('drop_if_busy', () => {
    let running = {} as Running

    beforeEach(() => {
        running = {} as Running
    })

    it('executes function when not busy', async () => {
        const mockFn = stub().resolves('result')
        const result = await drop_if_busy(mockFn, 'test', running)

        expect(mockFn.called).to.equal(true)
        expect(result).to.equal('result')
        expect(running['test']).to.equal(undefined)
    })

    it('skips execution when busy', async () => {
        const delayPromise = new Promise(resolve => setTimeout(resolve, 10))
        const mockFn1 = stub().resolves(delayPromise)
        const promise1 = drop_if_busy(mockFn1, 'test', running)

        const mockFn2 = stub().resolves('result2')
        const result2 = await drop_if_busy(mockFn2, 'test', running)

        expect(result2).to.equal(undefined)
        expect(mockFn2.called).to.equal(false)

        await promise1
        expect(running['test']).to.equal(undefined)
    })

    it('removes key after successful execution', async () => {
        const mockFn = stub().resolves(null)
        await drop_if_busy(mockFn, 'test', running)
        expect(running['test']).to.equal(undefined)
    })

    it('removes key after failed execution', async () => {
        const mockFn = stub().resolves(new Error())
        await drop_if_busy(mockFn, 'test', running)
        expect(running['test']).to.equal(undefined)
    })

    it('returns function result on success', async () => {
        const mockFn = stub().resolves(42)
        const result = await drop_if_busy(mockFn, 'test', running)
        expect(result).to.equal(42)
    })

    it('returns undefined on error', async () => {
        const mockFn = stub().rejects('oops')
        try {
            const result = await drop_if_busy(mockFn, 'test', running)
            expect(true).to.equal(false)
        } catch (error: any) {
            expect(error.name).to.equal('oops')
        }
    })

    it('allows concurrent different keys', async () => {
        const mockFn1 = stub().resolves('key1')
        const mockFn2 = stub().resolves('key2')

        const results = await Promise.all([
            drop_if_busy(mockFn1, 'key1', running),
            drop_if_busy(mockFn2, 'key2', running)
        ])

        expect(results).to.deep.equal(['key1', 'key2'])
        expect(running['key1']).to.equal(undefined)
        expect(running['key2']).to.equal(undefined)
    })
})
