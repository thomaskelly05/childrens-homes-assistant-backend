/** Coerce unknown API values to arrays before .map — prevents runtime "p.map is not a function". */
export function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : []
}

export function mapArray<T, U>(value: unknown, mapper: (item: T, index: number) => U): U[] {
  return asArray<T>(value).map(mapper)
}
