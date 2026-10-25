// Tiny fetch wrapper. Attaches the JWT from localStorage and turns API
// errors into thrown Error(detail) so pages can `alert(err.message)` —
// the same UX the original site had.
const BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

const TOKEN_KEY = 'feastory_token'
const ROLE_KEY = 'feastory_role'
const USER_KEY = 'feastory_user'

export const session = {
  get token() { return localStorage.getItem(TOKEN_KEY) },
  get role() { return localStorage.getItem(ROLE_KEY) },
  get user() {
    try { return JSON.parse(localStorage.getItem(USER_KEY) || 'null') } catch { return null }
  },
  save({ access_token, role, user }) {
    localStorage.setItem(TOKEN_KEY, access_token)
    localStorage.setItem(ROLE_KEY, role)
    localStorage.setItem(USER_KEY, JSON.stringify(user))
  },
  saveUser(user) { localStorage.setItem(USER_KEY, JSON.stringify(user)) },
  clear() {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(ROLE_KEY)
    localStorage.removeItem(USER_KEY)
  },
}

async function request(path, { method = 'GET', body, form } = {}) {
  const headers = {}
  if (session.token) headers.Authorization = `Bearer ${session.token}`
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: form ? form : body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (res.status === 204) return null
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    if (res.status === 401 && session.token) session.clear()
    throw new Error(data.detail || `Request failed (${res.status})`)
  }
  return data
}

export const api = {
  // auth
  registerStudent: (payload) => request('/api/auth/student/register', { method: 'POST', body: payload }),
  loginStudent: (payload) => request('/api/auth/student/login', { method: 'POST', body: payload }),
  loginStaff: (payload) => request('/api/auth/staff/login', { method: 'POST', body: payload }),
  meStudent: () => request('/api/auth/student/me'),
  meStaff: () => request('/api/auth/staff/me'),

  // menu
  menu: ({ q, category, limit } = {}) => {
    const p = new URLSearchParams()
    if (q) p.set('q', q)
    if (category) p.set('category', category)
    if (limit) p.set('limit', limit)
    const qs = p.toString()
    return request(`/api/menu${qs ? `?${qs}` : ''}`)
  },
  categories: () => request('/api/menu/categories'),

  // cart
  cart: () => request('/api/cart'),
  addToCart: (dish_id, quantity) => request('/api/cart', { method: 'POST', body: { dish_id, quantity } }),
  updateCartItem: (id, quantity) => request(`/api/cart/${id}`, { method: 'PATCH', body: { quantity } }),
  removeCartItem: (id) => request(`/api/cart/${id}`, { method: 'DELETE' }),
  clearCart: () => request('/api/cart', { method: 'DELETE' }),

  // orders / wallet
  checkout: (payment_method) => request('/api/orders/checkout', { method: 'POST', body: { payment_method } }),
  myOrders: () => request('/api/orders'),
  topUp: (amount) => request('/api/wallet/topup', { method: 'POST', body: { amount } }),
  transactions: () => request('/api/wallet/transactions'),

  // feedback (stored + e-mailed + shown as reviews on About)
  feedback: (payload) => request('/api/feedback', { method: 'POST', body: payload }),
  reviews: (limit = 20) => request(`/api/feedback?limit=${limit}`),
  popularToday: (limit = 6) => request(`/api/menu/popular?limit=${limit}`),

  // admin
  adminDishes: () => request('/api/admin/dishes'),
  adminAddDish: (formData) => request('/api/admin/dishes', { method: 'POST', form: formData }),
  adminUpdateDish: (id, patch) => request(`/api/admin/dishes/${id}`, { method: 'PATCH', body: patch }),
  adminDeleteDish: (id) => request(`/api/admin/dishes/${id}`, { method: 'DELETE' }),
  adminOrders: (status) => request(`/api/admin/orders${status ? `?status=${status}` : ''}`),
  adminSetStatus: (id, status) => request(`/api/admin/orders/${id}/status`, { method: 'PATCH', body: { status } }),
}

// Dish images are either "/images/x.jpg" (bundled with the frontend) or a
// full URL (backend uploads / S3). Both work as <img src> directly.
export const imgSrc = (url) => url || '/images/logo.png'

export const money = (v) => Number(v).toFixed(2).replace(/\.00$/, '')
export const fmtDate = (iso) => new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
