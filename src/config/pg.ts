import { types } from 'pg'

export const parse_int = val => parseInt(val)

types.setTypeParser(20, parse_int)

export const identity = el => el
types.setTypeParser(types.builtins.TIMESTAMP, identity)
