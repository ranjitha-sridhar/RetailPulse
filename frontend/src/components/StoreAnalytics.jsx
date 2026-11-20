import { useEffect, useMemo, useState } from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts'
import {
  Store,
  TrendingUp,
  BarChart3,
  Target,
  Package,
  Layers,
  ArrowUpDown,
  Filter
} from 'lucide-react'
import { getStoreComparison, getForecastOverview } from '../services/api'

export default function StoreAnalytics() {
  const [storesData, setStoresData] = useState([])
  const [forecastOverview, setForecastOverview] = useState(null)
  const [selectedStore, setSelectedStore] = useState('All')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const [compRes, fcRes] = await Promise.all([
          getStoreComparison(),
          getForecastOverview()
        ])
        setStoresData(compRes.data.stores || [])
        setForecastOverview(fcRes.data || null)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const number = (val, dec = 0) =>
    Number(val || 0).toLocaleString('en-IN', { maximumFractionDigits: dec })

  const filteredStores = useMemo(() => {
    if (selectedStore === 'All') return storesData
    return storesData.filter(s => s.store_id === selectedStore)
  }, [storesData, selectedStore])

  // Chart data for Demand vs Available Inventory across 4 stores
  const demandVsStockData = useMemo(() => {
    return storesData.map(s => ({
      name: s.store_id,
      forecastDemand: Math.round(Number(s.forecast_demand || 0)),
      availableStock: Math.round(Number(s.on_hand_units || 0)),
      surplus: Math.round(Number(s.surplus_units || 0)),
      shortage: Math.round(Number(s.shortage_units || 0))
    }))
  }, [storesData])

  // Pie chart data for aggregate network inventory health
  const networkHealthData = useMemo(() => {
    let healthy = 0
    let overstocked = 0
    let understocked = 0
    filteredStores.forEach(s => {
      healthy += Number(s.healthy_count || 0)
      overstocked += Number(s.overstocked_count || 0)
      understocked += Number(s.understocked_count || 0)
    })
    return [
      { name: 'Healthy Buffer', value: healthy, color: '#2E7D32' },
      { name: 'Overstocked Excess', value: overstocked, color: '#1565C0' },
      { name: 'Understocked Deficit', value: understocked, color: '#C62828' }
    ]
  }, [filteredStores])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* Top Filter Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '14px',
          background: 'var(--color-surface)',
          padding: '16px 20px',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border)'
        }}
      >
        <div>
          <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-heading)' }}>
            Multi-Store Enterprise Analytics & Cross-Comparison
          </div>
          <div style={{ fontSize: '12.5px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
            Comparative demand metrics, forecast precision (WAPE/MAE), and inventory health across all 4 retail nodes.
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Filter size={15} style={{ color: 'var(--color-text-muted)' }} />
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
            Filter Store:
          </span>
          <select
            value={selectedStore}
            onChange={e => setSelectedStore(e.target.value)}
            style={{
              padding: '6px 12px',
              fontSize: '12.5px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--color-border)',
              background: 'var(--color-surface)',
              outline: 'none'
            }}
          >
            <option value="All">All 4 Stores (CA_1, CA_2, TX_1, WI_1)</option>
            {storesData.map(s => (
              <option key={s.store_id} value={s.store_id}>Store {s.store_id}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 4-Store Performance Cards Grid */}
      <div className="store-grid-4">
        {filteredStores.map(s => (
          <div key={s.store_id} className="store-card">
            <div className="store-card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Store size={18} style={{ color: 'var(--color-primary)' }} />
                <span className="store-card-title">{s.store_id}</span>
              </div>
              <span className="risk-badge low">Active Node</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>7D Demand</div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-heading)' }} className="tabular-nums">
                  {number(s.forecast_demand)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>On-Hand Stock</div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-heading)' }} className="tabular-nums">
                  {number(s.on_hand_units)}
                </div>
              </div>
            </div>

            <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--color-border-light)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', marginBottom: '4px' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Forecast WAPE:</span>
                <strong>{s.has_historical_evaluation ? `${s.accuracy_wape}%` : 'Operational Mode'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Net Transfer Flow:</span>
                <strong style={{ color: s.net_transfer >= 0 ? 'var(--color-healthy)' : 'var(--color-primary)' }}>
                  {s.net_transfer >= 0 ? `+${number(s.net_transfer)}` : number(s.net_transfer)} units
                </strong>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Cross-Store Demand & Inventory Charts */}
      <div className="dashboard-grid">
        <div className="panel">
          <div className="panel-heading">
            <div>
              <h2>Store Demand vs On-Hand Inventory</h2>
              <p>Comparison of 7-day predicted demand against available network stock</p>
            </div>
            <span className="panel-tag">4 STORES</span>
          </div>

          <div style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={demandVsStockData} margin={{ top: 15, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E5E5" />
                <XAxis dataKey="name" tickLine={false} axisLine={{ stroke: '#E5E5E5' }} tick={{ fontSize: 12, fill: '#666666' }} />
                <YAxis tickLine={false} axisLine={{ stroke: '#E5E5E5' }} tick={{ fontSize: 12, fill: '#666666' }} />
                <Tooltip
                  formatter={(val, name) => [`${Number(val).toLocaleString()} units`, name === 'forecastDemand' ? '7D Demand' : 'Available Stock']}
                />
                <Legend wrapperStyle={{ paddingTop: '10px' }} />
                <Bar dataKey="forecastDemand" name="7D Forecast Demand" fill="#C62828" radius={[4, 4, 0, 0]} />
                <Bar dataKey="availableStock" name="Available Stock" fill="#9E9E9E" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Network Inventory Health Distribution */}
        <div className="panel">
          <div className="panel-heading">
            <div>
              <h2>Inventory Health Composition</h2>
              <p>SKU distribution across Healthy, Overstocked, and Understocked</p>
            </div>
            <BarChart3 size={18} style={{ color: 'var(--color-primary)' }} />
          </div>

          <div style={{ width: '100%', height: 210 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={networkHealthData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {networkHealthData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => [`${v} SKUs`, 'Count']} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', textAlign: 'center', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--color-border-light)' }}>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--color-healthy)', fontWeight: 600 }}>Healthy</div>
              <div style={{ fontSize: '15px', fontWeight: 700 }}>{networkHealthData[0].value}</div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: '#1565C0', fontWeight: 600 }}>Overstocked</div>
              <div style={{ fontSize: '15px', fontWeight: 700 }}>{networkHealthData[1].value}</div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--color-shortage)', fontWeight: 600 }}>Understocked</div>
              <div style={{ fontSize: '15px', fontWeight: 700 }}>{networkHealthData[2].value}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Store Performance Table */}
      <div className="panel">
        <div className="panel-heading">
          <div>
            <h2>Store Operational Comparison Matrix</h2>
            <p>Comprehensive operational metrics across all 4 stores</p>
          </div>
          <span className="panel-tag">ENTERPRISE AUDIT</span>
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Store Node</th>
                <th>Available Units</th>
                <th>7D Forecast Demand</th>
                <th>Surplus Units</th>
                <th>Shortage Units</th>
                <th>Incoming Transfers</th>
                <th>Outgoing Transfers</th>
                <th>WAPE Precision</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredStores.map(s => (
                <tr key={s.store_id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Store size={15} style={{ color: 'var(--color-primary)' }} />
                      <strong>{s.store_id}</strong>
                    </div>
                  </td>
                  <td className="tabular-nums">{number(s.on_hand_units)} units</td>
                  <td className="tabular-nums">{number(s.forecast_demand)} units</td>
                  <td className="tabular-nums positive">+{number(s.surplus_units)}</td>
                  <td className="tabular-nums" style={{ color: s.shortage_units > 0 ? 'var(--color-shortage)' : undefined }}>
                    {s.shortage_units > 0 ? `-${number(s.shortage_units)}` : '0'}
                  </td>
                  <td className="tabular-nums positive">+{number(s.incoming_units)}</td>
                  <td className="tabular-nums" style={{ color: 'var(--color-text-secondary)' }}>-{number(s.outgoing_units)}</td>
                  <td className="tabular-nums">
                    {s.has_historical_evaluation ? (
                      <strong>{s.accuracy_wape}%</strong>
                    ) : (
                      <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Operational Mode</span>
                    )}
                  </td>
                  <td>
                    <span className="risk-badge low">Optimized</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
