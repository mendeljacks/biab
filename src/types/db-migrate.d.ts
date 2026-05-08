declare module 'db-migrate' {
    interface DBMigrateInstance {
        up(): Promise<void>
        down(): Promise<void>
        reset(): Promise<void>
        silence(verbose: boolean): Promise<void>
    }
    function getInstance(verbose: boolean, config?: { config: Object }): DBMigrateInstance
    export { getInstance }
}