export const base64_to_buffer = (base64: string) => {
    const trimmed_base_64 = base64.replace(/^data:[^;]*;base64,/, '')
    return Buffer.from(trimmed_base_64, 'base64')
}