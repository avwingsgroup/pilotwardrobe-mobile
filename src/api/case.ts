/**
 * Key-case conversion between the Laravel wire format (snake_case) and the app's
 * domain model (camelCase). Only object KEYS change — string values (ids, slugs,
 * enum values such as "like_new") are never touched. Ported from the web client.
 */
const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && Object.prototype.toString.call(value) === '[object Object]'

export const snakeToCamel = (key: string): string => key.replace(/_([a-z0-9])/g, (_, ch: string) => ch.toUpperCase())

export const camelToSnake = (key: string): string =>
  key
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1_$2')
    .toLowerCase()

function convertKeys(value: unknown, convert: (key: string) => string): unknown {
  if (Array.isArray(value)) return value.map((item) => convertKeys(item, convert))
  if (!isPlainObject(value)) return value
  const out: Record<string, unknown> = {}
  for (const [key, val] of Object.entries(value)) out[convert(key)] = convertKeys(val, convert)
  return out
}

export const toCamel = <T = unknown>(value: unknown): T => convertKeys(value, snakeToCamel) as T
export const toSnake = <T = unknown>(value: unknown): T => convertKeys(value, camelToSnake) as T

/** Laravel error keys use dot paths (`items.0.size`); convert each segment. */
export const camelPath = (path: string) => path.split('.').map(snakeToCamel).join('.')
