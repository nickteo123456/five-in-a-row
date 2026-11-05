// Errors are always logged. Everything else stays silent in production.
const isProduction = process.env.NODE_ENV === 'production'

export const logger = {
  info(...args: unknown[]) {
    if (!isProduction) console.info(...args)
  },
  warn(...args: unknown[]) {
    if (!isProduction) console.warn(...args)
  },
  error(...args: unknown[]) {
    console.error(...args)
  },
}
