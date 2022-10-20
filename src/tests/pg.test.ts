import { expect } from 'chai'
import { describe, test } from 'mocha'
import { parse_int } from '../config/pg'

describe('Pg', () => {
    test(parse_int.name, () => {
        expect(parse_int('1.23')).to.equal(1)
    })
})
