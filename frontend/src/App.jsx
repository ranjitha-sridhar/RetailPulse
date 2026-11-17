
import { useEffect, useState } from 'react'
import {
  LayoutDashboard, TrendingUp, Package, Truck, SlidersHorizontal,
  Bell, RefreshCw, AlertTriangle, ArrowUpRight, Search, 
ArrowDownRight, Store, Boxes, Activity, CalendarDays, LogOut, Users
} from 'lucide-react'

import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  Tooltip, CartesianGrid
} from 'recharts'

import {
  getDashboardSummary, getStores, getInventoryRisks
} from './services/api'
import Login from './components/Login'
import { getCurrentUser } from './services/api'
import Forecasting from './components/Forecasting'
import Inventory from './components/Inventory'
import Transfers from './components/Transfers'
import WhatIf from './components/WhatIf'
import UserManagement from './components/UserManagement'

const navigation = [
  { label: 'Overview', icon: LayoutDashboard },
  { label: 'Demand Forecasting', icon: TrendingUp },
  { label: 'Inventory Intelligence', icon: Package },
  { label: 'Store Transfers', icon: Truck },
  { label: 'What-if Simulator', icon: SlidersHorizontal },
  { label: 'User Management', icon: Users },
]

function MetricCard({ title, value, subtitle, icon: Icon, color }) {
  return (
    <div className="metric-card">
      <div className="metric-top">
        <span>{title}</span>
        <div className={`metric-icon ${color}`}>
          <Icon size={19} />
        </div>
      </div>
      <div className="metric-value">{value}</div>
      <div className="metric-subtitle">{subtitle}</div>
    </div>
  )
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
    } catch (err) {
      console.error(err)
      setError('Unable to load dashboard data. Check that the backend is running and the API endpoints are accessible.')
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
    } catch (error) {
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
    loadDashboard()
  }
}, [user])

  const number = (value) =>
    Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })

  const riskCount = (level) => {
    const counts = summary?.risk_counts || summary?.inventory_risk_counts || {}
    return counts[level] ??
      summary?.[`${level.toLowerCase()}_risk_items`] ??
      risks.filter(item => item.risk_level === level).length
  }

  const pageDescriptions = {
    Overview: 'Your multi-store retail operations at a glance.',
    'Demand Forecasting': 'Understand expected product demand across stores.',
    'Inventory Intelligence': 'Identify stockout risks and excess inventory.',
    'Store Transfers': 'Review inventory movement between stores.',
    'What-if Simulator': 'Explore alternative demand and inventory scenarios.',
  }
  const handleLogin = (loggedInUser) => {
  setUser(loggedInUser)
}

const handleLogout = () => {
  sessionStorage.removeItem('retailpulse_token')
  setUser(null)
  setSummary(null)
  setStores([])
  setRisks([])
  setActivePage('Overview')
}
if (authLoading) {
  return <div className="message-panel">Verifying your session...</div>
}

if (!user) {
  return <Login onLogin={handleLogin} />
}
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"><Boxes size={23} /></div>
          <div>
            <div className="brand-name">RetailPulse</div>
            <div className="brand-caption">RETAIL INTELLIGENCE</div>
          </div>
        </div>

        <div className="nav-label">WORKSPACE</div>
        <nav className="navigation">
          {navigation
            .filter(({ label }) => label !== 'User Management' || user.role === 'admin')
            .map(({ label, icon: Icon }) => (
            <button
              key={label}
              className={`nav-item ${activePage === label ? 'active' : ''}`}
              onClick={() => setActivePage(label)}
            >
              <Icon size={18} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="system-status">
            <span className="status-dot" />
            <span>Analytics system</span>
            <strong>Online</strong>
          </div>
          <div className="profile">
            <div className="profile-avatar">RP</div>
            <div>
              <div className="profile-name">{user.username}</div>
              <div className="profile-role">{user.role}</div>
            </div>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumb">
            Workspace <span>/</span> <strong>{activePage}</strong>
          </div>
          <div className="topbar-actions">
            <div className="dataset-label">
              <span className="status-dot" />
              Public dataset
            </div>
            <button className="icon-button" aria-label="Notifications">
              <Bell size={19} />
            </button>
            <button className="icon-button" onClick={handleLogout} title="Logout" aria-label="Logout">
            <LogOut size={19} />
            </button>
            <div className="top-avatar">RP</div>
          </div>
        </header>

        <div className="page-content">
          <section className="page-heading">
            <div>
              <div className="eyebrow">RETAIL OPERATIONS / ANALYTICS</div>
              <h1>{activePage}</h1>
              <p>{pageDescriptions[activePage]}</p>
            </div>
            <button className="refresh-button" onClick={loadDashboard}>
              <RefreshCw size={16} />
              Refresh data
            </button>
          </section>

          {loading ? (
            <div className="message-panel">Loading your retail analytics...</div>
          ) : error ? (
            <div className="error-panel">
              <AlertTriangle size={20} />
              <div>
                <strong>Dashboard connection error</strong>
                <p>{error}</p>
                <button onClick={loadDashboard}>Try again</button>
              </div>
            </div>
          ) : activePage === 'Demand Forecasting' ? (<Forecasting />
          ) : activePage === 'User Management' ? (<UserManagement />
          ) : activePage === 'Inventory Intelligence' ? (<Inventory />
          ) : activePage === 'Store Transfers' ? (<Transfers />
          ) : activePage === 'What-if Simulator' ? (<WhatIf />
          ) : activePage !== 'Overview' ? (
            <div className="message-panel">
                <Activity size={25} />
                <h3>{activePage}</h3>
                <p>
                This module will be built next using your existing forecasting, inventory and transfer data.
                </p>
            </div>
          ) : (
            <>
              <section className="metrics-grid">
                <MetricCard
                  title="Stores monitored"
                  value={number(summary?.total_stores)}
                  subtitle="Across selected regions"
                  icon={Store}
                  color="red"
                />
                <MetricCard
                  title="Products monitored"
                  value={number(summary?.total_products)}
                  subtitle="Store-product combinations"
                  icon={Package}
                  color="blue"
                />
                <MetricCard
                  title="7-day forecast demand"
                  value={number(summary?.forecast_demand_7d)}
                  subtitle="Predicted units"
                  icon={TrendingUp}
                  color="purple"
                />
                <MetricCard
                  title="Inventory units"
                  value={number(summary?.total_inventory_units)}
                  subtitle="Current scenario stock"
                  icon={Boxes}
                  color="green"
                />
              </section>

              <section className="dashboard-grid">
                <div className="panel store-panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Store performance</h2>
                      <p>Forecast demand across monitored stores</p>
                    </div>
                    <span className="panel-tag">7-DAY VIEW</span>
                  </div>

                  {stores.length > 0 ? (
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={stores} margin={{ top: 15, right: 10, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E9EAED" />
                        <XAxis dataKey="store_id" tickLine={false} axisLine={false} />
                        <YAxis tickLine={false} axisLine={false} />
                        <Tooltip />
                        <Bar
                          dataKey="forecast_demand"
                          name="Forecast demand"
                          fill="#CC0000"
                          radius={[5, 5, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="empty-state">No store performance data available.</div>
                  )}
                </div>

                <div className="panel risk-panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Inventory risk overview</h2>
                      <p>Items requiring attention</p>
                    </div>
                    <AlertTriangle size={19} className="risk-heading-icon" />
                  </div>

                  <div className="risk-list">
                    <div className="risk-row">
                      <div className="risk-label">
                        <span className="risk-indicator high" />
                        High risk
                      </div>
                      <strong>{number(riskCount('High'))}</strong>
                    </div>
                    <div className="risk-track"><div className="risk-fill high-fill" style={{ width: `${risks.length ? Math.min(100, riskCount('High') / risks.length * 100) : 0}%` }} /></div>

                    <div className="risk-row">
                      <div className="risk-label">
                        <span className="risk-indicator medium" />
                        Medium risk
                      </div>
                      <strong>{number(riskCount('Medium'))}</strong>
                    </div>
                    <div className="risk-track"><div className="risk-fill medium-fill" style={{ width: `${risks.length ? Math.min(100, riskCount('Medium') / risks.length * 100) : 0}%` }} /></div>

                    <div className="risk-row">
                      <div className="risk-label">
                        <span className="risk-indicator low" />
                        Low risk
                      </div>
                      <strong>{number(riskCount('Low'))}</strong>
                    </div>
                    <div className="risk-track"><div className="risk-fill low-fill" style={{ width: `${risks.length ? Math.min(100, riskCount('Low') / risks.length * 100) : 0}%` }} /></div>
                  </div>

                  <div className="risk-footer">
                    <span>External replenishment required</span>
                    <strong>{number(summary?.external_replenishment_units)} units</strong>
                  </div>
                </div>
              </section>

              <section className="dashboard-grid lower-grid">
                <div className="panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Store inventory summary</h2>
                      <p>Stock and transfer position by store</p>
                    </div>
                  </div>
                  <div className="table-wrapper">
                    <table>
                      <thead>
                        <tr>
                          <th>Store</th>
                          <th>Inventory</th>
                          <th>Incoming</th>
                          <th>Outgoing</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stores.map((store) => (
                          <tr key={store.store_id}>
                            <td><strong>{store.store_id}</strong></td>
                            <td>{number(store.on_hand_stock ?? store.total_inventory_units)}</td>
                            <td className="positive">{number(store.incoming_units)}</td>
                            <td>{number(store.outgoing_units)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Priority inventory alerts</h2>
                      <p>Products with the largest risk gaps</p>
                    </div>
                    <span className="panel-tag">TOP ALERTS</span>
                  </div>
                  <div className="alert-list">
                    {risks.slice(0, 5).map((item, index) => (
                      <div className="alert-item" key={`${item.store_id}-${item.item_id}-${index}`}>
                        <div className="alert-symbol">
                          <AlertTriangle size={16} />
                        </div>
                        <div className="alert-details">
                          <strong>{item.item_id}</strong>
                          <span>{item.store_id} · {item.risk_level} risk</span>
                        </div>
                        <div className="alert-gap">
                          <strong>{number(item.risk_gap)}</strong>
                          <span>unit gap</span>
                        </div>
                      </div>
                    ))}
                    {risks.length === 0 && <div className="empty-state">No inventory alerts available.</div>}
                  </div>
                </div>
              </section>

              <section className="bottom-summary">
                <div>
                  <Truck size={19} />
                  <span>Optimized transfer recommendations</span>
                  <strong>{number(summary?.total_transfer_units)} units</strong>
                </div>
                <div>
                  <CalendarDays size={19} />
                  <span>Last refreshed</span>
                  <strong>{lastUpdated}</strong>
                </div>
              </section>
            </>
          )}

          <footer className="footer">
            <span>RetailPulse · Multi-Store Demand & Inventory Intelligence</span>
            <span>Prototype using public M5 data and simulated inventory</span>
          </footer>
        </div>
      </main>
    </div>
  )
}

export default App
