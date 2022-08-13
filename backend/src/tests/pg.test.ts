import { describe, test } from 'mocha'
import { expect } from 'chai'
import { trans } from '../config/pg'

describe('Pg', () => {
  test(trans.name, async () => {
    let err = undefined
    try {
      const result = await trans(async () => Promise.reject('rollback'))
    } catch (error) {
      err = 'rollback'
    }
    expect(err).to.equal('rollback')

    const result = await trans(async () => Promise.resolve('ok'))
    expect(result).to.equal('ok')
  })
})
