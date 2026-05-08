declare module 'stopcock' {
    interface StopcockOptions {
        limit?: number
    }
    function stopcock(fn: (...args: any[]) => any, opts?: StopcockOptions): (...args: any[]) => any
    export = stopcock
}