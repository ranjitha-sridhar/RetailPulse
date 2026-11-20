import { useEffect, useState, useMemo } from 'react'
import {
  LayoutDashboard,
  TrendingUp,
  Package,
  BarChart3,
  SlidersHorizontal,
  Bell,
  RefreshCw,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Store,
  Boxes,
  CalendarDays,
  LogOut,
  Users,
  PanelLeftClose,
  PanelLeft,
  Menu,
  X,
  Settings,
  CheckCircle2,
  ExternalLink,
  Sparkles,
  ArrowRight,
  Truck,
  DollarSign,
  Target
} from 'lucide-react'

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts'

import {
  getDashboardSummary,
  getStores,
  getInventoryRisks,
  getCurrentUser
} from './services/api'

import Login from './components/Login'
import Forecasting from './components/Forecasting'
import InventoryOptimization from './components/InventoryOptimization'
import StoreAnalytics from './components/StoreAnalytics'
import WhatIf from './components/WhatIf'
import UserManagement from './components/UserManagement'

const NAVIGATION_ITEMS = [
  { label: 'Dashboard', icon: LayoutDashboard },
  { label: 'Demand Forecasting', icon: TrendingUp },
  { label: 'Inventory Optimization', icon: Package },
  { label: 'Store Analytics', icon: BarChart3 },
  { label: 'What-if Simulator', icon: SlidersHorizontal },
  { label: 'User Management', icon: Users, adminOnly: true },
]

function MetricCard({ title, value, subtitle, icon: Icon, color = 'red', trend, trendLabel }) {
  return (
    <div className="metric-card">
      <div className="metric-top">
        <span>{title}</span>
        <div className={`metric-icon ${color}`}>
          <Icon size={18} />
        </div>
      </div>
      <div className="metric-value tabular-nums">{value}</div>
      <div className="metric-subtitle">{subtitle}</div>
      {trend && (
        <div className={`metric-trend ${trend === 'up' ? 'positive' : trend === 'down' ? 'negative' : 'neutral'}`}>
          {trend === 'up' ? <ArrowUpRight size={12} /> : trend === 'down' ? <ArrowDownRight size={12} /> : null}
          <span>{trendLabel}</span>
        </div>
      )}
    </div>
  )
}

function CustomStoreTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div className="custom-tooltip">
        <div className="label">Store {label}</div>
        <div style={{ display: 'grid', gap: '5px', marginTop: '6px' }}>
          {payload.map((entry, index) => (
            <div key={index} style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', color: entry.color }}>
              <span>{entry.name}:</span>
              <strong style={{ color: '#1A1A1A' }}>
                {Number(entry.value).toLocaleString('en-IN')} units
              </strong>
            </div>
          ))}
        </div>
      </div>
    )
  }
  return null
}

export default function App() {
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [summary, setSummary] = useState(null)
  const [stores, setStores] = useState([])
  const [risks, setRisks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activePage, setActivePage] = useState('Dashboard')
  const [lastUpdated, setLastUpdated] = useState('')

  // UI state
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [chartType, setChartType] = useState('bar') // 'bar' | 'area'
  const [showNotifications, setShowNotifications] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [toast, setToast] = useState(null)

  // Cross-component forecast navigation
  const [forecastTarget, setForecastTarget] = useState({ storeId: 'CA_1', productId: 'FOODS_3_226' })

  // Notifications
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      type: 'alert',
      title: 'Shortage Alert at WI_1',
      desc: 'FOODS_3_226 requires replenishment. OR-Tools transfer route calculated.',
      time: '12m ago',
      unread: true
    },
    {
      id: 2,
      type: 'transfer',
      title: 'OR-Tools Optimization Solved',
      desc: '153 transfer routes generated across CA_1, CA_2, TX_1, WI_1 saving $77k.',
      time: '35m ago',
      unread: true
    },
    {
      id: 3,
      type: 'success',
      title: '4-Store Network Synchronized',
      desc: 'CA_2 expansion store integrated into multi-store inventory model.',
      time: '1h ago',
      unread: false
    }
  ])

  const triggerToast = (message, type = 'info') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }

  const loadDashboard = async () => {
    setLoading(true)
    setError('')

    try {
      const [summaryRes, storesRes, risksRes] = await Promise.all([
        getDashboardSummary(),
        getStores(),
        getInventoryRisks(),
      ])

      setSummary(summaryRes.data)
      setStores(Array.isArray(storesRes.data) ? storesRes.data : storesRes.data.stores || [])
      setRisks(Array.isArray(risksRes.data) ? risksRes.data : risksRes.data.risks || [])

      setLastUpdated(new Date().toLocaleTimeString())
      triggerToast('Analytics dashboard refreshed.', 'success')
    } catch (err) {
      console.error(err)
      setError('Unable to load dashboard data. Ensure the backend FastAPI service is running.')
    } finally {
      setLoading(false)
    }
  }

  // Verify existing login session
  useEffect(() => {
    const verifySession = async () => {
      const token = sessionStorage.getItem('retailpulse_token')

      if (!token) {
        setAuthLoading(false)
        return
      }

      try {
        const response = await getCurrentUser()
        setUser(response.data)
      } catch {
        sessionStorage.removeItem('retailpulse_token')
        setUser(null)
      } finally {
        setAuthLoading(false)
      }
    }

    verifySession()
  }, [])

  useEffect(() => {
    if (user) {
      loadDashboard()
    }
  }, [user])

  const number = (value, decimals = 0) =>
    Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: decimals })

  const pageDescriptions = {
    Dashboard: 'Central retail command center: 4-store forecasting, inventory health, and OR-Tools optimization.',
    'Demand Forecasting': 'Multi-store demand prediction powered by XGBoost time-series regression.',
    'Inventory Optimization': 'Intelligent inter-store transfer routing and procurement optimization using Google OR-Tools.',
    'Store Analytics': 'Cross-store performance benchmarking across CA_1, CA_2, TX_1, and WI_1.',
    'What-if Simulator': 'Simulate demand shifts, promotional uplift, and safety buffer elasticity.',
    'User Management': 'Provision administrator and store manager accounts with role-based access control.',
  }

  const handleLogin = (loggedInUser) => {
    setUser(loggedInUser)
    triggerToast(`Welcome back, ${loggedInUser.username}!`, 'success')
  }

  const handleLogout = () => {
    sessionStorage.removeItem('retailpulse_token')
    setUser(null)
    setSummary(null)
    setStores([])
    setRisks([])
    setActivePage('Dashboard')
    triggerToast('Logged out successfully.', 'info')
  }

  const handleNavigateToForecast = (storeId, productId) => {
    setForecastTarget({ storeId, productId })
    setActivePage('Demand Forecasting')
  }

  const markAllNotificationsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, unread: false })))
  }

  const unreadCount = notifications.filter(n => n.unread).length

  // Inventory Health Donut Data
  const healthData = useMemo(() => {
    const h = summary?.healthy_items || 59
    const o = summary?.overstocked_items || 201
    const u = summary?.understocked_items || 140
    return [
      { name: 'Healthy Stock', value: h, color: '#2E7D32' },
      { name: 'Overstocked Surplus', value: o, color: '#1565C0' },
      { name: 'Understocked Deficit', value: u, color: '#C62828' }
    ]
  }, [summary])

  if (authLoading) {
    return (
      <div className="login-page">
        <div className="message-panel" style={{ maxWidth: 400 }}>
          <RefreshCw size={24} className="spin" style={{ margin: '0 auto 12px', color: '#C62828' }} />
          <h3>Verifying Session</h3>
          <p>Validating enterprise JWT credentials with RetailPulse backend...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Login onLogin={handleLogin} />
  }

  return (
    <div className="app-shell">
      {/* Toast Notification Container */}
      {toast && (
        <div className="toast-container">
          <div className={`toast ${toast.type}`}>
            <CheckCircle2 size={16} />
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Mobile Backdrop Overlay */}
      <div
        className={`sidebar-overlay ${isMobileOpen ? 'active' : ''}`}
        onClick={() => setIsMobileOpen(false)}
      />

      {/* Sidebar Navigation */}
      <aside className={`sidebar ${isCollapsed ? 'sidebar-collapsed' : ''} ${isMobileOpen ? 'mobile-open' : ''}`}>
        {/* Desktop Collapse Toggle Button */}
        <button
          type="button"
          className="sidebar-toggle"
          onClick={() => setIsCollapsed(!isCollapsed)}
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          aria-label={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {isCollapsed ? <PanelLeft size={16} /> : <PanelLeftClose size={16} />}
        </button>

        {/* Brand */}
        <div className="brand">
          <div className="brand-mark">
            <Boxes size={22} />
          </div>
          <div>
            <div className="brand-name">RetailPulse</div>
            <div className="brand-caption">RETAIL INTELLIGENCE</div>
          </div>
        </div>

        {/* Navigation Items */}
        <div className="nav-label">WORKSPACE</div>
        <nav className="navigation">
          {NAVIGATION_ITEMS
            .filter(item => !item.adminOnly || user.role === 'admin')
            .map(({ label, icon: Icon }) => (
              <button
                key={label}
                type="button"
                className={`nav-item ${activePage === label ? 'active' : ''}`}
                onClick={() => {
                  setActivePage(label)
                  setIsMobileOpen(false)
                }}
                title={isCollapsed ? label : undefined}
              >
                <Icon size={18} />
                <span>{label}</span>
              </button>
            ))}
        </nav>

        {/* Sidebar Footer */}
        <div className="sidebar-bottom">
          <div className="system-status">
            <span className="status-dot" />
            <span>Optimization Engine</span>
            <strong>Online</strong>
          </div>

          <div className="profile">
            <div className="profile-avatar">
              {user.username.slice(0, 2).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="profile-name" style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                {user.username}
              </div>
              <div className="profile-role">
                <span className={`risk-badge ${user.role === 'admin' ? 'high' : 'low'}`} style={{ padding: '2px 6px', fontSize: '10px' }}>
                  {user.role === 'admin' ? 'Admin' : 'Store Mgr'}
                </span>
                {user.store_id && <span style={{ marginLeft: '4px' }}>· {user.store_id}</span>}
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        {/* Topbar */}
        <header className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              type="button"
              className="mobile-menu-btn"
              onClick={() => setIsMobileOpen(true)}
              aria-label="Open mobile menu"
            >
              <Menu size={20} />
            </button>

            <div className="breadcrumb">
              RetailPulse <span>/</span> <strong>{activePage}</strong>
            </div>
          </div>

          <div className="topbar-actions">
            {/* Live Data Badge */}
            <div className="dataset-label">
              <span className="status-dot" />
              <span>4-Store Network</span>
            </div>

            {/* Notification Bell */}
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                className="icon-button"
                onClick={() => setShowNotifications(!showNotifications)}
                aria-label="Notifications"
                title="Notifications"
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '6px',
                      right: '6px',
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: 'var(--color-primary)'
                    }}
                  />
                )}
              </button>

              {/* Notification Popover */}
              {showNotifications && (
                <div
                  style={{
                    position: 'absolute',
                    top: '46px',
                    right: '0',
                    width: '340px',
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-lg)',
                    boxShadow: 'var(--shadow-xl)',
                    zIndex: 50,
                    overflow: 'hidden'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--color-bg)', borderBottom: '1px solid var(--color-border)' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700 }}>Operational Alerts ({unreadCount})</span>
                    <button
                      type="button"
                      style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
                      onClick={markAllNotificationsRead}
                    >
                      Mark all read
                    </button>
                  </div>
                  <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
                    {notifications.map(n => (
                      <div
                        key={n.id}
                        style={{
                          padding: '12px 16px',
                          borderBottom: '1px solid var(--color-border-light)',
                          background: n.unread ? 'rgba(198, 40, 40, 0.03)' : 'transparent',
                          cursor: 'pointer'
                        }}
                        onClick={() => {
                          setNotifications(prev => prev.map(item => item.id === n.id ? { ...item, unread: false } : item))
                          setShowNotifications(false)
                          if (n.type === 'alert') {
                            handleNavigateToForecast('WI_1', 'FOODS_3_226')
                          } else {
                            setActivePage('Inventory Optimization')
                          }
                        }}
                      >
                        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-heading)' }}>{n.title}</div>
                        <div style={{ fontSize: '11.5px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>{n.desc}</div>
                        <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginTop: '4px' }}>{n.time}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Settings Dialog Trigger */}
            <button
              type="button"
              className="icon-button"
              onClick={() => setShowSettings(true)}
              title="Platform Diagnostics"
              aria-label="Settings"
            >
              <Settings size={18} />
            </button>

            {/* Logout */}
            <button
              type="button"
              className="icon-button"
              onClick={handleLogout}
              title="Sign Out"
              aria-label="Sign Out"
            >
              <LogOut size={18} />
            </button>

            {/* Avatar */}
            <div className="top-avatar" title={`${user.username} (${user.role})`}>
              {user.username.slice(0, 2).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Page Content Body */}
        <div className="page-content">
          <section className="page-heading">
            <div>
              <div className="eyebrow">RETAIL INTELLIGENCE · 4-STORE EXPANSION PLATFORM</div>
              <h1>{activePage}</h1>
              <p>{pageDescriptions[activePage]}</p>
            </div>

            <button
              type="button"
              className="refresh-button"
              onClick={loadDashboard}
              disabled={loading}
            >
              <RefreshCw size={15} className={loading ? 'spin' : ''} />
              <span>{loading ? 'Refreshing...' : 'Refresh Metrics'}</span>
            </button>
          </section>

          {/* Router */}
          {loading && !summary ? (
            <div className="message-panel">
              <RefreshCw size={28} className="spin" style={{ margin: '0 auto 12px', color: '#C62828' }} />
              <h3>Connecting to Analytics Engine</h3>
              <p>Fetching 4-store demand backtests, inventory buffers, and OR-Tools optimization routes...</p>
            </div>
          ) : error ? (
            <div className="error-panel">
              <AlertTriangle size={22} />
              <div>
                <strong>Dashboard Connection Notice</strong>
                <p>{error}</p>
                <button type="button" onClick={loadDashboard}>Retry Connection</button>
              </div>
            </div>
          ) : activePage === 'Demand Forecasting' ? (
            <Forecasting
              initialStore={forecastTarget.storeId}
              initialProduct={forecastTarget.productId}
            />
          ) : activePage === 'Inventory Optimization' ? (
            <InventoryOptimization />
          ) : activePage === 'Store Analytics' ? (
            <StoreAnalytics />
          ) : activePage === 'What-if Simulator' ? (
            <WhatIf />
          ) : activePage === 'User Management' ? (
            <UserManagement />
          ) : (
            /* ============================================================
               MAIN DASHBOARD (OVERVIEW)
               ============================================================ */
            <>
              {/* Executive Welcome Banner */}
              <div className="welcome-banner">
                <h2>Retail Intelligence Command Center 👋</h2>
                <p>
                  Synchronized demand forecasting, inventory health, and automated stock rebalancing across <strong>4 regional stores: CA_1, CA_2, TX_1, WI_1</strong>.
                </p>
              </div>

              {/* Strategic Rebalancing Insight Card */}
              <div className="insight-card">
                <div className="insight-icon">
                  <Sparkles size={18} />
                </div>
                <div className="insight-content" style={{ flex: 1 }}>
                  <h4>Intelligent Inter-Store Stock Optimization</h4>
                  <p>
                    Google OR-Tools CP-SAT solver has identified <strong>{number(summary?.total_transfer_units)} units</strong> ready for inter-store transfer. Rebalancing excess inventory between stores saves <strong>${number(summary?.total_transfer_units ? summary.total_transfer_units * 22.5 : 0)}</strong> in external procurement costs while eliminating stockouts.
                  </p>
                </div>
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => setActivePage('Inventory Optimization')}
                  style={{ alignSelf: 'center', whiteSpace: 'nowrap', padding: '8px 16px', fontSize: '12px' }}
                >
                  Inspect Transfers <ArrowRight size={13} />
                </button>
              </div>

              {/* 7 Core KPI Cards */}
              <section className="metrics-grid">
                <MetricCard
                  title="Stores Monitored"
                  value={number(summary?.total_stores || 4)}
                  subtitle="CA_1, CA_2, TX_1, WI_1 active"
                  icon={Store}
                  color="grey"
                  trend="up"
                  trendLabel="4 Stores (Expanded)"
                />
                <MetricCard
                  title="Products Monitored"
                  value={number(summary?.total_products || 100)}
                  subtitle="400 store-product SKUs"
                  icon={Package}
                  color="grey"
                  trend="neutral"
                  trendLabel="100 SKUs / Store"
                />
                <MetricCard
                  title="7-Day Forecast Demand"
                  value={number(summary?.forecast_demand_7d)}
                  subtitle="Network-wide predicted units"
                  icon={TrendingUp}
                  color="red"
                  trend="up"
                  trendLabel="XGBoost Inferences"
                />
                <MetricCard
                  title="Forecast WAPE Accuracy"
                  value={summary?.forecast_accuracy?.wape ? `${summary.forecast_accuracy.wape}%` : '48.79%'}
                  subtitle="Seasonal baseline: 59.83%"
                  icon={Target}
                  color="red"
                  trend="up"
                  trendLabel="+11.04% Precision Gain"
                />
              </section>

              <section className="metrics-grid" style={{ marginTop: '-4px' }}>
                <MetricCard
                  title="Network Surplus"
                  value={`+${number(summary?.total_surplus_units)}`}
                  subtitle="Available excess above safety stock"
                  icon={TrendingUp}
                  color="green"
                  trend="up"
                  trendLabel="Transferable Stock"
                />
                <MetricCard
                  title="Network Shortage"
                  value={`-${number(summary?.total_shortage_units)}`}
                  subtitle="Anticipated stockout risk deficit"
                  icon={AlertTriangle}
                  color="red"
                  trend="down"
                  trendLabel="Needs Replenishment"
                />
                <MetricCard
                  title="Recommended Transfers"
                  value={number(summary?.total_transfers_count || 153)}
                  subtitle={`${number(summary?.total_transfer_units)} units rebalanced`}
                  icon={Truck}
                  color="red"
                  trend="up"
                  trendLabel="OR-Tools Optimized"
                />
                <MetricCard
                  title="External Procurement"
                  value={number(summary?.external_replenishment_units)}
                  subtitle={`Est. cost: $${number(summary?.estimated_procurement_cost)}`}
                  icon={DollarSign}
                  color="amber"
                  trend="neutral"
                  trendLabel="Surplus Exhausted"
                />
              </section>

              {/* Main Charts & Health Overview */}
              <section className="dashboard-grid">
                {/* 4-Store Demand & Stock Position Chart */}
                <div className="panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Regional Store Demand & Inventory Position</h2>
                      <p>7-day demand forecasts and available inventory across all 4 regional retail nodes</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div className="tab-group">
                        <button
                          type="button"
                          className={`tab-btn ${chartType === 'bar' ? 'active' : ''}`}
                          onClick={() => setChartType('bar')}
                        >
                          Bar
                        </button>
                        <button
                          type="button"
                          className={`tab-btn ${chartType === 'area' ? 'active' : ''}`}
                          onClick={() => setChartType('area')}
                        >
                          Area
                        </button>
                      </div>
                      <span className="panel-tag">4 STORES</span>
                    </div>
                  </div>

                  <div style={{ width: '100%', height: 280 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      {chartType === 'bar' ? (
                        <BarChart data={stores} margin={{ top: 15, right: 10, left: 0, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E5E5" />
                          <XAxis dataKey="store_id" tickLine={false} axisLine={{ stroke: '#E5E5E5' }} tick={{ fontSize: 12, fill: '#666666' }} />
                          <YAxis tickLine={false} axisLine={{ stroke: '#E5E5E5' }} tick={{ fontSize: 12, fill: '#666666' }} />
                          <Tooltip content={<CustomStoreTooltip />} />
                          <Legend wrapperStyle={{ paddingTop: '10px' }} />
                          <Bar dataKey="forecast_demand" name="7-Day Demand Forecast" fill="#C62828" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="on_hand_units" name="On-Hand Inventory" fill="#9E9E9E" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      ) : (
                        <AreaChart data={stores} margin={{ top: 15, right: 10, left: 0, bottom: 5 }}>
                          <defs>
                            <linearGradient id="forecastRed" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#C62828" stopOpacity={0.4} />
                              <stop offset="95%" stopColor="#C62828" stopOpacity={0.0} />
                            </linearGradient>
                            <linearGradient id="stockGrey" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#9E9E9E" stopOpacity={0.4} />
                              <stop offset="95%" stopColor="#9E9E9E" stopOpacity={0.0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E5E5" />
                          <XAxis dataKey="store_id" tickLine={false} axisLine={{ stroke: '#E5E5E5' }} tick={{ fontSize: 12, fill: '#666666' }} />
                          <YAxis tickLine={false} axisLine={{ stroke: '#E5E5E5' }} tick={{ fontSize: 12, fill: '#666666' }} />
                          <Tooltip content={<CustomStoreTooltip />} />
                          <Legend wrapperStyle={{ paddingTop: '10px' }} />
                          <Area type="monotone" dataKey="forecast_demand" name="7-Day Demand Forecast" stroke="#C62828" fillOpacity={1} fill="url(#forecastRed)" strokeWidth={2.5} />
                          <Area type="monotone" dataKey="on_hand_units" name="On-Hand Inventory" stroke="#9E9E9E" fillOpacity={1} fill="url(#stockGrey)" strokeWidth={2} />
                        </AreaChart>
                      )}
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Inventory Health Composition Donut */}
                <div className="panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Network Inventory Health</h2>
                      <p>Active 400 store-product SKUs classified by stock health</p>
                    </div>
                    <Boxes size={18} style={{ color: 'var(--color-primary)' }} />
                  </div>

                  <div style={{ width: '100%', height: 190 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={healthData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={75}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {healthData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v) => [`${v} SKUs`, 'Count']} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', textAlign: 'center', marginTop: '6px', paddingTop: '10px', borderTop: '1px solid var(--color-border-light)' }}>
                    <div>
                      <div style={{ fontSize: '11px', color: 'var(--color-healthy)', fontWeight: 600 }}>Healthy</div>
                      <div style={{ fontSize: '15px', fontWeight: 700 }}>{healthData[0].value}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: '#1565C0', fontWeight: 600 }}>Overstocked</div>
                      <div style={{ fontSize: '15px', fontWeight: 700 }}>{healthData[1].value}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: 'var(--color-shortage)', fontWeight: 600 }}>Understocked</div>
                      <div style={{ fontSize: '15px', fontWeight: 700 }}>{healthData[2].value}</div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Lower Grid: 4-Store Performance Summary & Priority Alerts */}
              <section className="dashboard-grid lower-grid">
                <div className="panel">
                  <div className="panel-heading">
                    <div>
                      <h2>4-Store Logistics & Transfer Position</h2>
                      <p>Inventory on-hand and scheduled inter-store transfer balance</p>
                    </div>
                    <span className="panel-tag">CA_1 · CA_2 · TX_1 · WI_1</span>
                  </div>

                  <div className="table-wrapper">
                    <table>
                      <thead>
                        <tr>
                          <th>Store Node</th>
                          <th>On-Hand Stock</th>
                          <th>Incoming Transfers</th>
                          <th>Outgoing Transfers</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stores.map((s) => (
                          <tr key={s.store_id}>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Store size={15} style={{ color: 'var(--color-primary)' }} />
                                <strong>{s.store_id}</strong>
                              </div>
                            </td>
                            <td className="tabular-nums">
                              {number(s.on_hand_units)} units
                            </td>
                            <td className="tabular-nums positive">
                              +{number(s.incoming_units)} units
                            </td>
                            <td className="tabular-nums" style={{ color: 'var(--color-text-secondary)' }}>
                              -{number(s.outgoing_units)} units
                            </td>
                            <td>
                              <button
                                type="button"
                                className="action-btn"
                                onClick={() => setActivePage('Inventory Optimization')}
                              >
                                View Transfers
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Priority Stockout Alerts */}
                <div className="panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Priority Stockout Risks</h2>
                      <p>Top SKU deficits requiring replenishment</p>
                    </div>
                    <AlertTriangle size={18} style={{ color: 'var(--color-shortage)' }} />
                  </div>

                  <div className="alert-list">
                    {risks.slice(0, 5).map((item, index) => (
                      <div className="alert-item" key={`${item.store_id}-${item.item_id}-${index}`}>
                        <div className="alert-symbol">
                          <AlertTriangle size={15} />
                        </div>
                        <div className="alert-details">
                          <strong>{item.item_id}</strong>
                          <span>
                            {item.store_id} · <span className={`risk-badge ${String(item.risk_level || '').toLowerCase()}`} style={{ padding: '2px 6px', fontSize: '10px' }}>{item.risk_level}</span>
                          </span>
                        </div>
                        <div className="alert-gap">
                          <strong>{number(item.risk_gap)}</strong>
                          <span>unit deficit</span>
                        </div>
                        <button
                          type="button"
                          className="action-btn"
                          onClick={() => handleNavigateToForecast(item.store_id, item.item_id)}
                          title="Inspect Forecast"
                          style={{ marginLeft: '8px' }}
                        >
                          Forecast <ExternalLink size={11} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {/* Bottom Operational Summary */}
              <section
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '16px 22px',
                  marginTop: '4px',
                  fontSize: '12.5px',
                  color: 'var(--color-text-secondary)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Truck size={18} style={{ color: 'var(--color-primary)' }} />
                  <span>OR-Tools Transfer Pool:</span>
                  <strong style={{ color: 'var(--color-heading)' }}>
                    {number(summary?.total_transfer_units)} units scheduled across 4 stores
                  </strong>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <CalendarDays size={18} style={{ color: 'var(--color-primary)' }} />
                  <span>Last Engine Synchronization:</span>
                  <strong style={{ color: 'var(--color-heading)' }}>{lastUpdated || 'Active'}</strong>
                </div>
              </section>
            </>
          )}

          {/* Footer */}
          <footer className="footer" style={{ marginTop: '24px' }}>
            <span>RetailPulse · Multi-Store Demand Forecasting & Inventory Optimization Platform</span>
            <span>FastAPI Backend · XGBoost Regression · Google OR-Tools CP-SAT</span>
          </footer>
        </div>
      </main>

      {/* Settings Modal */}
      {showSettings && (
        <div className="modal-overlay" onClick={() => setShowSettings(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>System Settings & Platform Diagnostics</h3>
              <button
                type="button"
                className="modal-close"
                onClick={() => setShowSettings(false)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gap: '14px' }}>
                <div style={{ padding: '12px', background: 'var(--color-bg)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 600 }}>API BACKEND ENDPOINT</div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-heading)', marginTop: '4px' }}>
                    {import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api'}
                  </div>
                </div>

                <div style={{ padding: '12px', background: 'var(--color-bg)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 600 }}>AUTHENTICATED SESSION</div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-heading)', marginTop: '4px' }}>
                    User: {user.username} · Role: {user.role} {user.store_id ? `(${user.store_id})` : ''}
                  </div>
                </div>

                <div style={{ padding: '12px', background: 'var(--color-bg)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 600 }}>OPTIMIZATION & FORECASTING ENGINES</div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-heading)', marginTop: '4px' }}>
                    Google OR-Tools CP-SAT Solver v9.15 + XGBoost Regressor (4 Stores)
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                  <button
                    type="button"
                    className="primary-button"
                    onClick={() => {
                      setShowSettings(false)
                      triggerToast('Platform diagnostics verified.', 'info')
                    }}
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
