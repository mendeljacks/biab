declare module 'JSONStream' {
    import { Transform } from 'stream'
    function parse(path?: string | string[]): Transform
    function stringify(open?: string, sep?: string, close?: string, indent?: number): Transform
    export { parse, stringify }
}
