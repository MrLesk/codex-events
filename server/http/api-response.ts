export interface ApiListMeta {
  page?: number
  pageSize?: number
  total?: number
}

export function apiData<T>(data: T) {
  return { data }
}

export function apiList<T, TMeta extends ApiListMeta>(data: T, meta: TMeta) {
  return { data, meta }
}
