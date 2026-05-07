export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

const API_ORIGIN = API_URL.replace(/\/api\/?$/, '')

export const resolveImageUrl = (url, fallback = '/college_stub.svg') => {
  if (!url) return fallback
  if (/^(https?:)?\/\//i.test(url) || url.startsWith('data:') || url.startsWith('blob:')) return url
  if (url.startsWith('/uploads/')) return `${API_ORIGIN}${url}`
  if (url.startsWith('/')) return url
  return `${API_ORIGIN}/${url.replace(/^\/+/, '')}`
}
