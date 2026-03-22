export interface ApiListMeta {
  page?: number
  pageSize?: number
  total?: number
  [key: string]: unknown
}

export function apiData<T>(data: T) {
  return { data }
}

export function apiList<T>(data: T, meta: ApiListMeta) {
  return { data, meta }
}
