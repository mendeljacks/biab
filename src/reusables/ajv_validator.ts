import Ajv, { ErrorObject } from 'ajv/dist/2020'
import { AppError } from './error_handling'

const ajv = new Ajv({ discriminator: true, coerceTypes: true })
const compiledSchemas = new Map<any, ReturnType<typeof ajv.compile>>()

// Compiles schema on first call
export const ajv_validator = (schema: any, data: any) => {
    let validate: ReturnType<typeof ajv.compile>

    if (compiledSchemas.has(schema)) {
        validate = compiledSchemas.get(schema)!
    } else {
        validate = ajv.compile(schema)
        compiledSchemas.set(schema, validate)
    }

    validate(data)

    if ((validate.errors?.length || 0) > 0) {
        throw validate.errors?.map(error => {
            return get_ajv_validation_error(error)
        }) as AppError[]
    }
    return true
}

const get_ajv_validation_error = (error: ErrorObject, base_message?: string) => {
    return {
        error_code: 'validation_error',
        message: base_message ? `${base_message}: ${error.message}` : error.message,
        path: error.instancePath
            ?.split('/')
            .filter(el => el !== '')
            .map(el => (isNaN(Number(el)) ? el : Number(el))),
        additional_info: {
            ajv_error: error
        }
    } as AppError
}
