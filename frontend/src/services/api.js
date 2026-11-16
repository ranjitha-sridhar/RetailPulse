
import axios from 'axios'

const api = axios.create({
  baseURL: 'http://127.0.0.1:8000/api',
  timeout: 15000
})

// Attach JWT to requests when available
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('retailpulse_token')

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

export const loginUser = (credentials) =>
  api.post('/auth/login', credentials)

export const getCurrentUser = () =>
  api.get('/auth/me')

export const getDashboardSummary = () =>
  api.get('/dashboard/summary')

export const getStores = () =>
  api.get('/stores')

export const getInventoryRisks = (params = {}) =>
  api.get('/inventory/risks', { params })

export const getRecommendations = () =>
  api.get('/recommendations')

export const getProductForecast = (storeId, productId) =>
  api.get(`/forecast/${storeId}/${productId}`)

export default api
