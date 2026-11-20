import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api',
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

// Authentication
export const loginUser = (credentials) =>
  api.post('/auth/login', credentials)

export const getCurrentUser = () =>
  api.get('/auth/me')

export const registerUser = (userData) =>
  api.post('/auth/register', userData)

// Dashboard & Core Stores
export const getDashboardSummary = () =>
  api.get('/dashboard/summary')

export const getStores = () =>
  api.get('/stores')

export const getStoreComparison = () =>
  api.get('/analytics/store-comparison')

// Demand Forecasting
export const getForecastStores = () =>
  api.get('/forecast/stores')

export const getForecastOverview = () =>
  api.get('/forecast/overview')

export const getProductForecast = (storeId, productId) =>
  api.get(`/forecast/${storeId}/${productId}`)

// Inventory Intelligence & Risks
export const getInventoryOverview = () =>
  api.get('/inventory/overview')

export const getStoreInventory = (storeId) =>
  api.get(`/inventory/store/${storeId}`)

export const getInventoryRisks = (params = {}) =>
  api.get('/inventory/risks', { params })

// Inter-Store Inventory Optimization (OR-Tools)
export const runOptimization = () =>
  api.post('/inventory/optimize')

export const getRecommendations = () =>
  api.get('/inventory/transfers/recommendations')

export const getOptimizationHistory = () =>
  api.get('/inventory/transfers/history')

export default api
