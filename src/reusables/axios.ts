import axios_raw, { AxiosRequestConfig } from 'axios'
import stopcock from 'stopcock'

export const create_cancel_token = () => axios_raw.CancelToken.source()

export const axios = stopcock(
    async (config: AxiosRequestConfig) => {
        const response = await axios_raw(config)
        return response
    },
    {
        limit: 200,
        interval: 1000
    }
)
