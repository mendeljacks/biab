export type AppError = {
    message: string
    error_code?: keyof typeof error_status_codes
    path?: (string | number)[]
    invalid_data?: any | undefined
    recommendation?: string
    additional_info?: Record<string, any>
    axios_error?: CleanAxiosError
    timestamp?: string
    stack?: string
}

export type AppErrorRes = AppError | AppError[]

export const error_status_codes = {
    bad_json: 400,
    no_token: 401,
    email_not_verified: 401,
    two_factor_code_invalid: 401,
    two_factor_code_not_verified: 401,
    invalid_token: 401,
    too_many_requests: 429,
    missing_permissions: 403,
    validation_error: 422,
    missing_access_rights: 403,
    data_already_exists: 406,
    missing_reference: 406,
    did_not_complete: 406,
    internal_error: 500,
    external_service_error: 500
}

export const with_stack_trace = (error: AppError): AppError => {
    const e = new Error()
    return {
        ...error,
        stack: e.stack
    }
}

export const add_error_code = <
    E extends Omit<AppError, 'error_code'> | Omit<AppError, 'error_code'>[]
>(
    error_code: keyof typeof error_status_codes,
    error_response: E
): E extends any[] ? AppError[] : AppError => {
    if (Array.isArray(error_response)) {
        return error_response.map(error => ({ ...error, error_code })) as any
    }

    return {
        ...error_response,
        error_code
    } as any
}

export type CleanAxiosError = ReturnType<typeof get_clean_axios_error>
export const get_clean_axios_error = (axios_error: any) => {
    const pick = (keys: string[], obj: Record<string, any>) =>
        keys.reduce((acc, key) => {
            if (obj[key] !== undefined) acc[key] = obj[key]
            return acc
        }, {} as Record<string, any>)

    return {
        config: {
            ...pick(
                [
                    'url',
                    'baseURL',
                    'method',
                    'headers',
                    'params',
                    'data',
                    'timeout',
                    'auth',
                    'responseType',
                    'responseEncoding',
                    'xsrfCookieName',
                    'xsrfHeaderName',
                    'maxContentLength',
                    'maxBodyLength',
                    'maxRedirects',
                    'proxy',
                    'decompress'
                ],
                { ...axios_error.config }
            ),
            ...(axios_error.config?.headers?.Authorization
                ? {
                      headers: {
                          ...axios_error.config.headers,
                          Authorization: undefined
                      }
                  }
                : {}),
            ...(axios_error.config?.auth ? { auth: undefined } : {})
        },
        ...(axios_error.response
            ? {
                  response: {
                      data: axios_error.response?.data as any,
                      status: axios_error.response?.status,
                      statusText: axios_error.response?.statusText,
                      headers: axios_error.response?.headers
                  }
              }
            : {}),
        ...(axios_error.request
            ? {
                  request: {}
              }
            : {}),
        isAxiosError: axios_error.isAxiosError,
        message: axios_error.message,
        name: axios_error.name
    }
}

export const get_external_request_error_message = (
    external_service_name: string,
    error: any,
    message: string | undefined
) => {
    if (error.response) {
        return `External request to ${external_service_name} failed: '${
            message || error.message
        }'`
    }

    if (error.request) {
        return `External request to ${external_service_name} got no response: '${
            message || error.message
        }'`
    }

    return `External request to ${external_service_name} did not send: '${
        message || error.message
    }'`
}

export const get_external_request_error = (
    external_service_name: string,
    axios_error: any,
    message: string | undefined
) => {
    return {
        error_code: 'external_service_error',
        timestamp: new Date().toUTCString(),
        message: get_external_request_error_message(
            external_service_name,
            axios_error,
            message
        ),
        axios_error: get_clean_axios_error(axios_error)
    } as AppError
}

export const map_error_res = <T extends AppErrorRes>(
    error_res: T,
    fn: (error: AppError, i: number | undefined) => AppError
): T =>
    (Array.isArray(error_res)
        ? error_res.map(fn)
        : fn(error_res, undefined)) as T

/**
 * For when the axios error has an AppError inside, e.g. an axios request to the server
 */
export const get_server_response_error = (axios_error: any) => {
    if (axios_error?.isCancel) {
        return axios_error
    }

    const clean_axios_error = get_clean_axios_error(axios_error)
    if (!clean_axios_error.response) {
        return clean_axios_error
    }

    const error_res = clean_axios_error.response?.data ?? ([] as AppErrorRes)
    const app_error = map_error_res(error_res, error =>
        error?.message
            ? {
                  ...error,
                  axios_error: clean_axios_error
              }
            : clean_axios_error
    )

    return app_error
}