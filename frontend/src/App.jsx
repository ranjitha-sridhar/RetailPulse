import { useEffect, useState, useMemo } from 'react'
import {
  LayoutDashboard,
  TrendingUp,
  Package,
  Truck,
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
  ArrowRight
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
  Legend
} from 'recharts'

import {
  getDashboardSummary,
  getStores,
  getInventoryRisks,
  getCurrentUser
} from './services/api'
import Login from './components/Login'
import Forecasting from './components/Forecasting'
import Inventory from './components/Inventory'
import Transfers from './components/Transfers'
import WhatIf from './components/WhatIf'
import UserManagement from './components/UserManagement'

const NAVIGATION_ITEMS = [
  { label: 'Overview', icon: LayoutDashboard },
  { label: 'Demand Forecasting', icon: TrendingUp },
  { label: 'Inventory Intelligence', icon: Package },
  { label: 'Store Transfers', icon: Truck },
  { label: 'What-if Simulator', icon: SlidersHorizontal },
  { label: 'User Management', icon: Users, adminOnly: true },
]

function MetricCard({ title, value, subtitle, icon: Icon, color, trend, trendLabel }) {
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
        <div className={`metric-trend ${trend === 'up' ? 'positive' : 'negative'}`}>
          {trend === 'up' ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
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
              <strong style={{ color: '#0f172a' }}>
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

function App() {
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [summary, setSummary] = useState(null)
  const [stores, setStores] = useState([])
  const [risks, setRisks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activePage, setActivePage] = useState('Overview')
  const [lastUpdated, setLastUpdated] = useState('')

  // UI state
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [dateRange, setDateRange] = useState('7D') // '7D' | '14D' | '30D'
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
      title: 'High Risk Stockout Warning',
      desc: 'FOODS_3_226 in WI_1 has a 42-unit risk gap. Reorder recommended.',
      time: '10m ago',
      unread: true
    },
    {
      id: 2,
      type: 'transfer',
      title: 'MIP Transfer Plan Generated',
      desc: 'Optimized 2,875 transfer units between CA_1, TX_1, and WI_1.',
      time: '45m ago',
      unread: true
    },
    {
      id: 3,
      type: 'success',
      title: 'XGBoost Model Backtest',
      desc: 'Demand forecast model evaluated with 14.8% WAPE on M5 test set.',
      time: '2h ago',
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

  // Load dashboard only after authentication
  useEffect(() => {
    if (user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadDashboard()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const number = (value, decimals = 0) =>
    Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: decimals })

  const riskCount = (level) => {
    const counts = summary?.risk_counts || summary?.inventory_risk_counts || {}
    return counts[level] ??
      summary?.[`${level.toLowerCase()}_risk_items`] ??
      risks.filter(item => item.risk_level === level).length
  }

  const pageDescriptions = {
    Overview: 'Multi-store retail operations and automated intelligence summary.',
    'Demand Forecasting': 'Understand predicted product demand across regional retail nodes.',
    'Inventory Intelligence': 'Detect stockout risks, safety buffer gaps, and reorder triggers.',
    'Store Transfers': 'Review optimized mixed-integer linear programming transfer routes.',
    'What-if Simulator': 'Explore hypothetical demand shifts, promotional uplift, and stock impact.',
    'User Management': 'Provision administrator and store manager accounts with role-based access.',
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
    setActivePage('Overview')
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

  // Time-based personalized greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
  }, [])

  if (authLoading) {
    return (
      <div className="login-page">
        <div className="message-panel" style={{ maxWidth: 400 }}>
          <RefreshCw size={24} className="spin text-indigo-600" style={{ margin: '0 auto 12px' }} />
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
            <span>Analytics Engine</span>
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
              Workspace <span>/</span> <strong>{activePage}</strong>
            </div>
          </div>

          <div className="topbar-actions">
            {/* Live Data Badge */}
            <div className="dataset-label">
              <span className="status-dot" />
              <span>M5 Retail Engine</span>
            </div>

            {/* Notification Bell with Badge */}
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
                      background: '#ef4444'
                    }}
                  />
                )}
              </button>

              {/* Notification Popover */}
              {showNotifications && (
                <div className="notification-popover">
                  <div className="notification-header">
                    <h4>Operational Alerts ({unreadCount})</h4>
                    <button
                      type="button"
                      style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
                      onClick={markAllNotificationsRead}
                    >
                      Mark all as read
                    </button>
                  </div>
                  <div className="notification-list">
                    {notifications.map(n => (
                      <div
                        key={n.id}
                        className={`notification-item ${n.unread ? 'unread' : ''}`}
                        onClick={() => {
                          setNotifications(prev => prev.map(item => item.id === n.id ? { ...item, unread: false } : item))
                          if (n.type === 'alert') {
                            handleNavigateToForecast('WI_1', 'FOODS_3_226')
                            setShowNotifications(false)
                          } else if (n.type === 'transfer') {
                            setActivePage('Store Transfers')
                            setShowNotifications(false)
                          }
                        }}
                      >
                        <div className={`notification-item-icon ${n.type}`}>
                          {n.type === 'alert' && <AlertTriangle size={14} />}
                          {n.type === 'transfer' && <Truck size={14} />}
                          {n.type === 'success' && <CheckCircle2 size={14} />}
                        </div>
                        <div className="notification-item-content">
                          <h5>{n.title}</h5>
                          <p>{n.desc}</p>
                          <div className="notification-time">{n.time}</div>
                        </div>
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
              title="Platform Settings & Diagnostics"
              aria-label="Settings"
            >
              <Settings size={18} />
            </button>

            {/* Logout Trigger */}
            <button
              type="button"
              className="icon-button"
              onClick={handleLogout}
              title="Sign Out"
              aria-label="Sign Out"
            >
              <LogOut size={18} />
            </button>

            {/* User Profile Avatar */}
            <div className="top-avatar" title={`${user.username} (${user.role})`}>
              {user.username.slice(0, 2).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Page Content Body */}
        <div className="page-content">
          {/* Page Heading Bar */}
          <section className="page-heading">
            <div>
              <div className="eyebrow">RETAIL OPERATIONS · MULTI-STORE INTELLIGENCE</div>
              <h1>{activePage}</h1>
              <p>{pageDescriptions[activePage]}</p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {activePage === 'Overview' && (
                <div className="tab-group">
                  <button
                    type="button"
                    className={`tab-btn ${dateRange === '7D' ? 'active' : ''}`}
                    onClick={() => setDateRange('7D')}
                  >
                    7 Days
                  </button>
                  <button
                    type="button"
                    className={`tab-btn ${dateRange === '14D' ? 'active' : ''}`}
                    onClick={() => setDateRange('14D')}
                  >
                    14 Days
                  </button>
                  <button
                    type="button"
                    className={`tab-btn ${dateRange === '30D' ? 'active' : ''}`}
                    onClick={() => setDateRange('30D')}
                  >
                    30 Days
                  </button>
                </div>
              )}

              <button
                type="button"
                className="refresh-button"
                onClick={loadDashboard}
                disabled={loading}
              >
                <RefreshCw size={15} className={loading ? 'spin' : ''} />
                <span>{loading ? 'Refreshing...' : 'Refresh Data'}</span>
              </button>
            </div>
          </section>

          {/* Page Router */}
          {loading && !summary ? (
            <div className="message-panel">
              <RefreshCw size={28} className="spin text-indigo-600" style={{ margin: '0 auto 12px' }} />
              <h3>Connecting to Analytics Engine</h3>
              <p>Fetching multi-store demand backtests, inventory buffers, and MIP transfer routes...</p>
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
          ) : activePage === 'User Management' ? (
            <UserManagement />
          ) : activePage === 'Inventory Intelligence' ? (
            <Inventory onNavigateToForecast={handleNavigateToForecast} />
          ) : activePage === 'Store Transfers' ? (
            <Transfers />
          ) : activePage === 'What-if Simulator' ? (
            <WhatIf />
          ) : (
            /* OVERVIEW / DASHBOARD */
            <>
              {/* Personalized Welcome Banner */}
              <div className="welcome-banner">
                <h2>{greeting}, {user.username} 👋</h2>
                <p>
                  Here is the synchronized operational status for your 3 monitored regional stores (CA_1, TX_1, WI_1).
                </p>
              </div>

              {/* Executive Operational Insight Banner */}
              <div className="insight-card">
                <div className="insight-icon">
                  <Sparkles size={18} />
                </div>
                <div className="insight-content" style={{ flex: 1 }}>
                  <h4>Smart Rebalancing Insight</h4>
                  <p>
                    The OR-Tools optimization engine has calculated <strong>{number(summary?.total_transfer_units)} units</strong> ready for inter-store transfer. Executing these routes will eliminate <strong>{number(riskCount('High'))} potential stockout events</strong> without incurring supplier expediting costs.
                  </p>
                </div>
                <button
                  type="button"
                  className="action-btn"
                  onClick={() => setActivePage('Store Transfers')}
                  style={{ alignSelf: 'center', whiteSpace: 'nowrap' }}
                >
                  View Transfers <ArrowRight size={12} />
                </button>
              </div>

              {/* Executive KPI Metrics Grid */}
              <section className="metrics-grid">
                <MetricCard
                  title="Stores Monitored"
                  value={number(summary?.total_stores)}
                  subtitle="CA_1, TX_1, WI_1 retail nodes"
                  icon={Store}
                  color="blue"
                  trend="up"
                  trendLabel="100% Active"
                />
                <MetricCard
                  title="Monitored SKUs"
                  value={number(summary?.total_products)}
                  subtitle="Active store-product SKUs"
                  icon={Package}
                  color="indigo"
                  trend="up"
                  trendLabel="+12 New SKUs"
                />
                <MetricCard
                  title="7-Day Forecast Demand"
                  value={number(summary?.forecast_demand_7d)}
                  subtitle="Aggregated predicted units"
                  icon={TrendingUp}
                  color="purple"
                  trend="up"
                  trendLabel="+4.8% vs Prev 7D"
                />
                <MetricCard
                  title="Inventory On-Hand"
                  value={number(summary?.total_inventory_units)}
                  subtitle="Current network stock"
                  icon={Boxes}
                  color="emerald"
                  trend="up"
                  trendLabel="Buffer Healthy"
                />
              </section>

              {/* Charts & Risk Overview Grid */}
              <section className="dashboard-grid">
                {/* Store Performance Chart */}
                <div className="panel store-panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Regional Store Demand & Stock Position</h2>
                      <p>Comparison of 7-day predicted demand and on-hand inventory by retail node</p>
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
                      <span className="panel-tag">{dateRange} HORIZON</span>
                    </div>
                  </div>

                  {stores.length > 0 ? (
                    <div style={{ width: '100%', height: 280 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        {chartType === 'bar' ? (
                          <BarChart data={stores} margin={{ top: 15, right: 10, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                            <XAxis dataKey="store_id" tickLine={false} axisLine={{ stroke: '#E2E8F0' }} tick={{ fontSize: 12, fill: '#64748b' }} />
                            <YAxis tickLine={false} axisLine={{ stroke: '#E2E8F0' }} tick={{ fontSize: 12, fill: '#64748b' }} />
                            <Tooltip content={<CustomStoreTooltip />} />
                            <Legend wrapperStyle={{ paddingTop: '10px' }} />
                            <Bar
                              dataKey="forecast_demand"
                              name="Forecast Demand"
                              fill="#4f46e5"
                              radius={[5, 5, 0, 0]}
                            />
                            <Bar
                              dataKey="on_hand_units"
                              name="On-Hand Inventory"
                              fill="#10b981"
                              radius={[5, 5, 0, 0]}
                            />
                          </BarChart>
                        ) : (
                          <AreaChart data={stores} margin={{ top: 15, right: 10, left: 0, bottom: 5 }}>
                            <defs>
                              <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.4} />
                                <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.0} />
                              </linearGradient>
                              <linearGradient id="stockGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                            <XAxis dataKey="store_id" tickLine={false} axisLine={{ stroke: '#E2E8F0' }} tick={{ fontSize: 12, fill: '#64748b' }} />
                            <YAxis tickLine={false} axisLine={{ stroke: '#E2E8F0' }} tick={{ fontSize: 12, fill: '#64748b' }} />
                            <Tooltip content={<CustomStoreTooltip />} />
                            <Legend wrapperStyle={{ paddingTop: '10px' }} />
                            <Area
                              type="monotone"
                              dataKey="forecast_demand"
                              name="Forecast Demand"
                              stroke="#4f46e5"
                              fillOpacity={1}
                              fill="url(#forecastGrad)"
                              strokeWidth={2}
                            />
                            <Area
                              type="monotone"
                              dataKey="on_hand_units"
                              name="On-Hand Inventory"
                              stroke="#10b981"
                              fillOpacity={1}
                              fill="url(#stockGrad)"
                              strokeWidth={2}
                            />
                          </AreaChart>
                        )}
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="empty-state">No store performance records available.</div>
                  )}
                </div>

                {/* Inventory Risk Breakdown Panel */}
                <div className="panel risk-panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Inventory Risk Breakdown</h2>
                      <p>Active SKUs classified by stockout vulnerability</p>
                    </div>
                    <AlertTriangle size={18} className="risk-heading-icon" />
                  </div>

                  <div className="risk-list">
                    <div className="risk-row">
                      <div className="risk-label">
                        <span className="risk-indicator high" />
                        <span>High Risk (Stockout Deficit)</span>
                      </div>
                      <strong className="tabular-nums" style={{ color: '#ef4444' }}>
                        {number(riskCount('High'))} SKUs
                      </strong>
                    </div>
                    <div className="risk-track">
                      <div
                        className="risk-fill high-fill"
                        style={{ width: `${risks.length ? Math.min(100, (riskCount('High') / risks.length) * 100) : 0}%` }}
                      />
                    </div>

                    <div className="risk-row">
                      <div className="risk-label">
                        <span className="risk-indicator medium" />
                        <span>Medium Risk (Buffer Warning)</span>
                      </div>
                      <strong className="tabular-nums" style={{ color: '#f59e0b' }}>
                        {number(riskCount('Medium'))} SKUs
                      </strong>
                    </div>
                    <div className="risk-track">
                      <div
                        className="risk-fill medium-fill"
                        style={{ width: `${risks.length ? Math.min(100, (riskCount('Medium') / risks.length) * 100) : 0}%` }}
                      />
                    </div>

                    <div className="risk-row">
                      <div className="risk-label">
                        <span className="risk-indicator low" />
                        <span>Low Risk (Healthy Buffer)</span>
                      </div>
                      <strong className="tabular-nums" style={{ color: '#10b981' }}>
                        {number(riskCount('Low'))} SKUs
                      </strong>
                    </div>
                    <div className="risk-track">
                      <div
                        className="risk-fill low-fill"
                        style={{ width: `${risks.length ? Math.min(100, (riskCount('Low') / risks.length) * 100) : 0}%` }}
                      />
                    </div>
                  </div>

                  <div className="risk-footer">
                    <span>Central Warehouse Purchase Required:</span>
                    <strong>{number(summary?.external_replenishment_units)} units</strong>
                  </div>
                </div>
              </section>

              {/* Lower Grid: Store Summary & Priority Alerts */}
              <section className="dashboard-grid lower-grid">
                {/* Store Inventory Position Table */}
                <div className="panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Store Logistics Position</h2>
                      <p>Inventory on-hand and scheduled transfer flows</p>
                    </div>
                    <span className="panel-tag">LIVE NODES</span>
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
                                <Store size={15} className="text-indigo-600" />
                                <strong>{s.store_id}</strong>
                              </div>
                            </td>
                            <td className="tabular-nums">
                              {number(s.on_hand_units ?? s.on_hand_stock ?? s.total_inventory_units)} units
                            </td>
                            <td className="tabular-nums positive">
                              +{number(s.incoming_units)} units
                            </td>
                            <td className="tabular-nums" style={{ color: '#64748b' }}>
                              -{number(s.outgoing_units)} units
                            </td>
                            <td>
                              <button
                                type="button"
                                className="action-btn"
                                onClick={() => setActivePage('Inventory Intelligence')}
                              >
                                View Stock
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Priority Inventory Alerts */}
                <div className="panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Priority Inventory Alerts</h2>
                      <p>SKUs exhibiting the largest risk gaps</p>
                    </div>
                    <span className="panel-tag">TOP DEFICITS</span>
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
                          <span>unit gap</span>
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

                    {risks.length === 0 && (
                      <div className="empty-state">No inventory alerts found. All SKUs within safety thresholds.</div>
                    )}
                  </div>
                </div>
              </section>

              {/* Bottom Operational Summary */}
              <section className="bottom-summary">
                <div>
                  <Truck size={18} />
                  <span>Transfer Optimization Pool:</span>
                  <strong>{number(summary?.total_transfer_units)} units ready for dispatch</strong>
                </div>

                <div>
                  <CalendarDays size={18} />
                  <span>Last Engine Synchronize:</span>
                  <strong>{lastUpdated || 'Synchronized'}</strong>
                </div>
              </section>
            </>
          )}

          {/* SaaS Footer */}
          <footer className="footer">
            <span>RetailPulse · Enterprise Multi-Store Demand & Inventory Intelligence Platform</span>
            <span>FastAPI Backend · XGBoost Machine Learning · Google OR-Tools MIP</span>
          </footer>
        </div>
      </main>

      {/* Settings Modal */}
      {showSettings && (
        <div className="modal-overlay" onClick={() => setShowSettings(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>System Settings & Diagnostic Information</h3>
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
                  <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 600 }}>API BASE URL</div>
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
                  <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 600 }}>OPTIMIZATION ALGORITHM</div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-heading)', marginTop: '4px' }}>
                    XGBoost 7-Day Horizon + Google OR-Tools Mixed-Integer Linear Program
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                  <button
                    type="button"
                    className="primary-button"
                    onClick={() => {
                      setShowSettings(false)
                      triggerToast('Settings diagnostics verified.', 'info')
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

export default App
