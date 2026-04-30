import { format, formatRelative } from 'date-fns'
import { enIN } from 'date-fns/locale'

// from https://stackoverflow.com/questions/3075577/convert-mysql-datetime-stamp-into-javascripts-date-format
// should be in UTC timezone
export const mysql_to_js_date = (mysql_date_string: string): Date => {
    let t = mysql_date_string.split(/[- :]/).map(el => Number(el))
    let date = new Date(Date.UTC(t[0], t[1] - 1, t[2], t[3] ?? 0, t[4] ?? 0, t[5] ?? 0))
    return date
}

export const js_to_mysql_date = (js_date: Date) => {
    return js_date.toISOString().slice(0, 19).replace('T', ' ')
}

export const js_to_local_date_string = (js_date: Date) => {
    return js_date.toLocaleDateString('en-CA')
}

export const js_to_utc_date_string = (js_date: Date) => js_date.toISOString().slice(0, 10)

export const get_days_between_dates = (start_date: Date, end_date: Date): number => {
    const start = start_date.getTime()
    const end = end_date.getTime()
    const difference_ms = Math.abs(end - start)
    const full_days = Math.floor(difference_ms / (1000 * 60 * 60 * 24))
    return full_days
}

export const add_days = (date: Date, days: number) => {
    let result = new Date(date)
    result.setDate(result.getDate() + days)
    return result
}

export const date_to_calendar_string = (js_date: Date) => {
    return formatRelative(js_date, new Date(), {
        locale: enIN // to avoid mm-dd-yyyy format of us
    })
}

export const format_date = (date: Date) => format(date, 'dd MMM yyyy')

export const format_mysql_date = (date: string) => format_date(mysql_to_js_date(date))

export const format_time = (date: Date) => format(date, 'h:mm a')

export const format_mysql_time = (date: string) => format_time(mysql_to_js_date(date))

export const format_date_time = (date: Date) => format(date, 'dd MMM yyyy, h:mm a')

export const format_mysql_date_time = (date: string) => format_date_time(mysql_to_js_date(date))
