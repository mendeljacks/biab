import { types } from 'pg'

export const parse_int = (val: string) => parseInt(val)

types.setTypeParser(20, parse_int)

export const identity = (el: any) => el
types.setTypeParser(types.builtins.TIMESTAMP, identity)
