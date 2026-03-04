const DEFAULT_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'

function buildUrl(path, params) {
  const base = DEFAULT_BASE_URL.replace(/\/+$/, '')
  const cleanedPath = path.startsWith('/') ? path : `/${path}`
  const url = new URL(base + cleanedPath)

  if (params && typeof params === 'object') {
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return
      url.searchParams.append(key, String(value))
    })
  }

  return url.toString()
}

async function request(path, { method = 'GET', body, params, auth = true, headers: extraHeaders } = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(extraHeaders || {}),
  }

  // Lazy import to avoid tight coupling and handle circular deps gracefully.
  let token
  if (auth) {
    try {
      const authModule = await import('./auth.js')
      if (typeof authModule.getToken === 'function') {
        token = authModule.getToken()
      }
    } catch {
      // ignore token errors – treat as unauthenticated
    }
  }

  if (auth && token) {
    headers.Authorization = `Bearer ${token}`
  }

  const url = buildUrl(path, params)

  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData

  const requestInit = {
    method,
    headers: { ...headers },
    body: undefined,
  }

  if (body != null) {
    if (isFormData) {
      delete requestInit.headers['Content-Type']
      requestInit.body = body
    } else {
      requestInit.body = JSON.stringify(body)
    }
  }

  const response = await fetch(url, requestInit)

  let payload = null
  try {
    payload = await response.json()
  } catch {
    // non‑JSON response
  }

  const successFlag = typeof payload === 'object' && payload !== null && 'success' in payload ? payload.success : undefined
  const data = typeof payload === 'object' && payload !== null && 'data' in payload ? payload.data : payload

  if (!response.ok || successFlag === false) {
    const message =
      (payload && (payload.message || payload.error)) ||
      `Request to ${path} failed with status ${response.status}`

    if (response.status === 401 || response.status === 403) {
      // Best‑effort token cleanup; ignore failures.
      try {
        const authModule = await import('./auth.js')
        if (typeof authModule.clearToken === 'function') {
          authModule.clearToken()
        }
      } catch {
        // ignore
      }

      // For protected requests, send the user back to login on auth failures,
      // but avoid redirect loops on the auth pages themselves.
      if (auth && typeof window !== 'undefined' && window.location) {
        const currentPath = window.location.pathname || ''
        const isAuthPage = currentPath === '/login' || currentPath === '/verify-email'
        if (!isAuthPage) {
          window.location.replace('/login')
        }
      }
    }

    throw new Error(message)
  }

  return data
}

export function apiGet(path, options) {
  return request(path, { ...(options || {}), method: 'GET' })
}

export function apiPost(path, body, options) {
  return request(path, { ...(options || {}), method: 'POST', body })
}

export function apiPut(path, body, options) {
  return request(path, { ...(options || {}), method: 'PUT', body })
}

export function apiDelete(path, options) {
  return request(path, { ...(options || {}), method: 'DELETE' })
}

