import { useEffect, useMemo, useState } from 'react'
import {
  Boxes,
  Truck,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  RefreshCw,
  Search,
  Download,
  CheckCircle2,
  AlertTriangle,
  Play,
  Layers,
  ChevronLeft,
  ChevronRight,
  Info,
  X,
  Store,
  DollarSign,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react'
import {
  getInventoryOverview,
  runOptimization,
  getRecommendations,
  getStores
} from '../services/api'

export default function InventoryOptimization() {
  const [overview, setOverview] = useState(null)
  const [storesData, setStoresData] = useState([])
  const [recommendations, setRecommendations] = useState([])
  const [externalReplenishment, setExternalReplenishment] = useState([])
  const [activeTab, setActiveTab] = useState('transfers') // 'transfers' | 'external' | 'network'

  // Filters & Search
  const [storeFilter, setStoreFilter] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRecommendation, setSelectedRecommendation] = useState(null)

  // Loading & State
  const [loading, setLoading] = useState(true)
  const [optimizing, setOptimizing] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState(null)
  const [lastOptimized, setLastOptimized] = useState('')

  // Sorting
  const [sortField, setSortField] = useState('transfer_units')
  const [sortDirection, setSortDirection] = useState('desc')

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 12

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }

  const loadAllData = async () => {
    setLoading(true)
    setError('')
    try {
      const [overviewRes, recRes, storesRes] = await Promise.all([
        getInventoryOverview(),
        getRecommendations(),
        getStores()
      ])

      setOverview(overviewRes.data)
      setRecommendations(recRes.data.transfers || [])
      setExternalReplenishment(recRes.data.external_replenishment || [])
      setStoresData(Array.isArray(storesRes.data) ? storesRes.data : storesRes.data.stores || [])
      setLastOptimized(new Date().toLocaleTimeString())
    } catch (err) {
      console.error(err)
      setError(err.response?.data?.detail || 'Failed to load inventory optimization data from server.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAllData()
  }, [])

  const handleRunOptimization = async () => {
    setOptimizing(true)
    try {
      const response = await runOptimization()
      const data = response.data
      setRecommendations(data.transfers || [])
      setExternalReplenishment(data.external_replenishment || [])
      setLastOptimized(new Date().toLocaleTimeString())
      showToast(
        `OR-Tools solved ${data.total_transfers_count} transfer routes (${data.total_transfer_units.toLocaleString()} units). Estimated savings: $${data.estimated_savings.toLocaleString()}!`,
        'success'
      )
      // Refresh overview and store summaries
      const [overviewRes, storesRes] = await Promise.all([
        getInventoryOverview(),
        getStores()
      ])
      setOverview(overviewRes.data)
      setStoresData(Array.isArray(storesRes.data) ? storesRes.data : storesRes.data.stores || [])
    } catch (err) {
      console.error(err)
      showToast(err.response?.data?.detail || 'Optimization solver failed.', 'error')
    } finally {
      setOptimizing(false)
    }
  }

  const number = (val, dec = 0) =>
    Number(val || 0).toLocaleString('en-IN', { maximumFractionDigits: dec })

  // Filtered & Sorted recommendations
  const filteredTransfers = useMemo(() => {
    return recommendations.filter(item => {
      const matchStore =
        storeFilter === 'All' ||
        item.from_store === storeFilter ||
        item.to_store === storeFilter
      const matchSearch =
        !searchQuery.trim() ||
        item.item_id?.toLowerCase().includes(searchQuery.toLowerCase().trim())
      return matchStore && matchSearch
    })
  }, [recommendations, storeFilter, searchQuery])

  const sortedTransfers = useMemo(() => {
    const list = [...filteredTransfers]
    list.sort((a, b) => {
      let valA = a[sortField]
      let valB = b[sortField]
      if (typeof valA === 'string') {
        const c = valA.localeCompare(valB)
        return sortDirection === 'asc' ? c : -c
      }
      valA = Number(valA || 0)
      valB = Number(valB || 0)
      return sortDirection === 'asc' ? valA - valB : valB - valA
    })
    return list
  }, [filteredTransfers, sortField, sortDirection])

  const paginatedTransfers = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return sortedTransfers.slice(start, start + pageSize)
  }, [sortedTransfers, currentPage])

  const totalPages = Math.max(1, Math.ceil(sortedTransfers.length / pageSize))

  useEffect(() => {
    setCurrentPage(1)
  }, [storeFilter, searchQuery])

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const exportManifestCSV = () => {
    if (!sortedTransfers.length) return
    const headers = [
      'Product SKU',
      'From Store',
      'To Store',
      'Transfer Units',
      'Donor Safe Surplus',
      'Recipient Need',
      'Est Cost ($)',
      'Remaining Shortage',
      'Status',
      'Explanation'
    ]
    const rows = sortedTransfers.map(t => [
      t.item_id,
      t.from_store,
      t.to_store,
      t.transfer_units,
      t.donor_safe_surplus,
      t.recipient_need,
      t.estimated_cost,
      t.remaining_shortage,
      t.status,
      `"${(t.explanation || '').replace(/"/g, '""')}"`
    ])
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map(e => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `RetailPulse_OR_Tools_Transfers_${storeFilter}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    showToast('Transfer manifest exported successfully.')
  }

  // Network topology matrix across 4 stores
  const STORES_LIST = ['CA_1', 'CA_2', 'TX_1', 'WI_1']
  const networkMatrix = useMemo(() => {
    const m = {}
    STORES_LIST.forEach(f => {
      m[f] = {}
      STORES_LIST.forEach(t => {
        m[f][t] = { units: 0, cost: 0, count: 0 }
      })
    })
    recommendations.forEach(t => {
      if (m[t.from_store] && m[t.from_store][t.to_store]) {
        m[t.from_store][t.to_store].units += Number(t.transfer_units || 0)
        m[t.from_store][t.to_store].cost += Number(t.estimated_cost || 0)
        m[t.from_store][t.to_store].count += 1
      }
    })
    return m
  }, [recommendations])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* Toast Alert */}
      {toast && (
        <div className="toast-container">
          <div className={`toast ${toast.type}`}>
            <CheckCircle2 size={16} />
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Header Action Bar */}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="status-dot" />
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-primary)' }}>
              GOOGLE OR-TOOLS CP-SAT ENGINE
            </span>
            <span style={{ color: 'var(--color-text-muted)', fontSize: '12px' }}>·</span>
            <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
              Last executed: <strong>{lastOptimized || 'Synchronized'}</strong>
            </span>
          </div>
          <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
            Optimizes replenishment across <strong>4 stores</strong> (CA_1, CA_2, TX_1, WI_1) and 100 SKUs while strictly preserving safety buffers.
          </div>
        </div>

        <button
          type="button"
          className="primary-button"
          onClick={handleRunOptimization}
          disabled={optimizing}
          style={{ minWidth: '220px' }}
        >
          {optimizing ? (
            <>
              <RefreshCw size={16} className="spin" />
              <span>Solving CP-SAT Model...</span>
            </>
          ) : (
            <>
              <Play size={16} fill="white" />
              <span>Run Inventory Optimization</span>
            </>
          )}
        </button>
      </div>

      {/* A. Summary KPI Cards (Top) */}
      <section className="metrics-grid metrics-grid-5">
        <div className="metric-card">
          <div className="metric-top">
            <span>Total Available Stock</span>
            <div className="metric-icon grey">
              <Boxes size={18} />
            </div>
          </div>
          <div className="metric-value tabular-nums">
            {number(overview?.total_inventory_units)}
          </div>
          <div className="metric-subtitle">Across 400 store-SKUs</div>
        </div>

        <div className="metric-card">
          <div className="metric-top">
            <span>Transferable Surplus</span>
            <div className="metric-icon green">
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="metric-value tabular-nums" style={{ color: 'var(--color-healthy)' }}>
            {number(overview?.total_surplus_units)}
          </div>
          <div className="metric-subtitle">Available excess above safety buffer</div>
        </div>

        <div className="metric-card">
          <div className="metric-top">
            <span>Anticipated Shortage</span>
            <div className="metric-icon red">
              <TrendingDown size={18} />
            </div>
          </div>
          <div className="metric-value tabular-nums" style={{ color: 'var(--color-shortage)' }}>
            {number(overview?.total_shortage_units)}
          </div>
          <div className="metric-subtitle">Risk deficit needing replenishment</div>
        </div>

        <div className="metric-card">
          <div className="metric-top">
            <span>Optimized Transfers</span>
            <div className="metric-icon red">
              <Truck size={18} />
            </div>
          </div>
          <div className="metric-value tabular-nums" style={{ color: 'var(--color-primary)' }}>
            {number(recommendations.length)}
          </div>
          <div className="metric-subtitle">
            {number(overview?.total_transfer_units)} units recommended
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-top">
            <span>External Purchase</span>
            <div className="metric-icon amber">
              <DollarSign size={18} />
            </div>
          </div>
          <div className="metric-value tabular-nums" style={{ color: 'var(--color-warning)' }}>
            {number(overview?.external_replenishment_units)}
          </div>
          <div className="metric-subtitle">
            Est: ${number(overview?.estimated_procurement_cost)} cost
          </div>
        </div>
      </section>

      {/* B. Store Inventory Comparison (4-Store Structured Layout) */}
      <section>
        <div className="panel-heading" style={{ marginBottom: '14px' }}>
          <div>
            <h2>Store Logistics & Stock Health</h2>
            <p>Real-time inventory positions and forecast requirements across all 4 regional stores</p>
          </div>
          <span className="panel-tag">4 ACTIVE NODES</span>
        </div>

        <div className="store-grid-4">
          {STORES_LIST.map(storeId => {
            const sInfo = storesData.find(s => s.store_id === storeId) || {}
            const onHand = Number(sInfo.on_hand_units || 0)
            const demand = Number(sInfo.forecast_demand || 0)
            const surplus = Number(sInfo.surplus_units || 0)
            const shortage = Number(sInfo.shortage_units || 0)
            const healthyCount = Number(sInfo.healthy_count || 0)
            const understockedCount = Number(sInfo.understocked_count || 0)

            const healthStatus =
              understockedCount > 35
                ? 'Understocked'
                : surplus > shortage
                ? 'Surplus Healthy'
                : 'Balanced'

            return (
              <div key={storeId} className="store-card">
                <div className="store-card-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Store size={18} style={{ color: 'var(--color-primary)' }} />
                    <span className="store-card-title">{storeId}</span>
                  </div>
                  <span
                    className={`risk-badge ${
                      healthStatus === 'Understocked'
                        ? 'high'
                        : healthStatus === 'Surplus Healthy'
                        ? 'low'
                        : 'medium'
                    }`}
                  >
                    {healthStatus}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '12px' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Available Stock</div>
                    <div style={{ fontSize: '17px', fontWeight: 700, color: 'var(--color-heading)' }} className="tabular-nums">
                      {number(onHand)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>7D Forecast</div>
                    <div style={{ fontSize: '17px', fontWeight: 700, color: 'var(--color-text-secondary)' }} className="tabular-nums">
                      {number(demand)}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--color-border-light)' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Transfer Surplus</div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-healthy)' }} className="tabular-nums">
                      +{number(surplus)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Shortage Need</div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: shortage > 0 ? 'var(--color-shortage)' : 'var(--color-text-muted)' }} className="tabular-nums">
                      {shortage > 0 ? `-${number(shortage)}` : '0'}
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>
                    <span>SKU Health Ratio</span>
                    <strong>{healthyCount}/100 Healthy</strong>
                  </div>
                  <div className="progress-bar-container">
                    <div
                      className="progress-bar-fill"
                      style={{
                        width: `${healthyCount}%`,
                        background: healthyCount >= 60 ? 'var(--color-healthy)' : 'var(--color-primary)'
                      }}
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Tabs & Table Section */}
      <div className="panel" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
          <div className="tab-group">
            <button
              type="button"
              className={`tab-btn ${activeTab === 'transfers' ? 'active' : ''}`}
              onClick={() => setActiveTab('transfers')}
            >
              <Truck size={14} />
              <span>Recommended Transfers ({recommendations.length})</span>
            </button>
            <button
              type="button"
              className={`tab-btn ${activeTab === 'network' ? 'active' : ''}`}
              onClick={() => setActiveTab('network')}
            >
              <Layers size={14} />
              <span>4-Store Transfer Flow Matrix</span>
            </button>
            <button
              type="button"
              className={`tab-btn ${activeTab === 'external' ? 'active' : ''}`}
              onClick={() => setActiveTab('external')}
            >
              <DollarSign size={14} />
              <span>External Supplier Orders ({externalReplenishment.length})</span>
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <select
              value={storeFilter}
              onChange={e => setStoreFilter(e.target.value)}
              style={{
                padding: '8px 12px',
                fontSize: '12.5px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-border)',
                background: 'var(--color-surface)',
                outline: 'none'
              }}
            >
              <option value="All">All Stores (CA_1, CA_2, TX_1, WI_1)</option>
              {STORES_LIST.map(s => (
                <option key={s} value={s}>Store {s}</option>
              ))}
            </select>

            <div style={{ position: 'relative', minWidth: '180px' }}>
              <input
                type="text"
                placeholder="Search SKU ID..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 30px',
                  fontSize: '12.5px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-border)',
                  outline: 'none'
                }}
              />
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '11px', color: 'var(--color-text-muted)' }} />
            </div>

            <button
              type="button"
              className="action-btn"
              onClick={exportManifestCSV}
              title="Export Transfer Recommendations"
            >
              <Download size={13} />
              Export CSV
            </button>
          </div>
        </div>

        {/* TAB 1: Transfer Recommendations Table */}
        {activeTab === 'transfers' && (
          <div>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th onClick={() => handleSort('item_id')} className="sortable">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        Product SKU
                        {sortField === 'item_id' ? (sortDirection === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={12} style={{ opacity: 0.3 }} />}
                      </div>
                    </th>
                    <th>Source Store</th>
                    <th>Destination Store</th>
                    <th onClick={() => handleSort('transfer_units')} className="sortable">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        Transfer Qty
                        {sortField === 'transfer_units' ? (sortDirection === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={12} style={{ opacity: 0.3 }} />}
                      </div>
                    </th>
                    <th onClick={() => handleSort('donor_safe_surplus')} className="sortable">
                      Source Surplus
                    </th>
                    <th onClick={() => handleSort('recipient_need')} className="sortable">
                      Dest Shortage
                    </th>
                    <th onClick={() => handleSort('estimated_cost')} className="sortable">
                      Est. Freight
                    </th>
                    <th>Remaining Shortage</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedTransfers.map((item, idx) => (
                    <tr key={`${item.item_id}-${item.from_store}-${item.to_store}-${idx}`}>
                      <td>
                        <strong>{item.item_id}</strong>
                      </td>
                      <td>
                        <span style={{ fontWeight: 600, color: 'var(--color-heading)' }}>
                          {item.from_store}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <ArrowRight size={13} style={{ color: 'var(--color-primary)' }} />
                          <span style={{ fontWeight: 600, color: 'var(--color-heading)' }}>
                            {item.to_store}
                          </span>
                        </div>
                      </td>
                      <td className="tabular-nums" style={{ color: 'var(--color-primary)', fontWeight: 700, fontSize: '13.5px' }}>
                        {number(item.transfer_units)} units
                      </td>
                      <td className="tabular-nums" style={{ color: 'var(--color-healthy)' }}>
                        +{number(item.donor_safe_surplus)}
                      </td>
                      <td className="tabular-nums" style={{ color: 'var(--color-shortage)' }}>
                        -{number(item.recipient_need)}
                      </td>
                      <td className="tabular-nums">
                        ${Number(item.estimated_cost || 0).toFixed(2)}
                      </td>
                      <td>
                        {item.remaining_shortage > 0 ? (
                          <span className="risk-badge medium">
                            {item.remaining_shortage} units remaining
                          </span>
                        ) : (
                          <span className="risk-badge low">Fulfilled (0 left)</span>
                        )}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="action-btn"
                          onClick={() => setSelectedRecommendation(item)}
                        >
                          <Info size={12} /> Details
                        </button>
                      </td>
                    </tr>
                  ))}

                  {paginatedTransfers.length === 0 && (
                    <tr>
                      <td colSpan="9" className="empty-state">
                        No transfer recommendations match the current filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {sortedTransfers.length > 0 && (
              <div className="pagination-controls">
                <div>
                  Showing {Math.min(sortedTransfers.length, (currentPage - 1) * pageSize + 1)}–
                  {Math.min(sortedTransfers.length, currentPage * pageSize)} of {sortedTransfers.length} recommendations
                </div>

                <div className="pagination-buttons">
                  <button
                    type="button"
                    className="pagination-btn"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  >
                    <ChevronLeft size={14} style={{ verticalAlign: 'middle' }} /> Previous
                  </button>
                  <button
                    type="button"
                    className="pagination-btn"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  >
                    Next <ChevronRight size={14} style={{ verticalAlign: 'middle' }} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Transfer Flow Matrix Across 4 Stores */}
        {activeTab === 'network' && (
          <div>
            <div className="panel-heading" style={{ margin: '10px 0 16px' }}>
              <div>
                <h3>Inter-Store Rebalancing Matrix</h3>
                <p>Aggregated units transferred between regional retail nodes calculated by OR-Tools CP-SAT</p>
              </div>
            </div>

            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Donor Store \ Recipient</th>
                    {STORES_LIST.map(to => (
                      <th key={to}>To {to}</th>
                    ))}
                    <th>Total Dispatched</th>
                  </tr>
                </thead>
                <tbody>
                  {STORES_LIST.map(from => {
                    const rowUnits = STORES_LIST.reduce((sum, to) => sum + (networkMatrix[from]?.[to]?.units || 0), 0)
                    const rowCost = STORES_LIST.reduce((sum, to) => sum + (networkMatrix[from]?.[to]?.cost || 0), 0)
                    return (
                      <tr key={from}>
                        <td>
                          <strong>{from}</strong>
                        </td>
                        {STORES_LIST.map(to => {
                          const cell = networkMatrix[from]?.[to] || { units: 0, cost: 0 }
                          return (
                            <td key={to} className="tabular-nums">
                              {from === to ? (
                                <span style={{ color: 'var(--color-text-muted)' }}>—</span>
                              ) : cell.units > 0 ? (
                                <div>
                                  <strong style={{ color: 'var(--color-primary)' }}>
                                    {number(cell.units)} units
                                  </strong>
                                  <div style={{ fontSize: '10.5px', color: 'var(--color-text-muted)' }}>
                                    ${cell.cost.toFixed(1)} freight
                                  </div>
                                </div>
                              ) : (
                                <span style={{ color: 'var(--color-text-muted)' }}>0</span>
                              )}
                            </td>
                          )
                        })}
                        <td className="tabular-nums" style={{ fontWeight: 700, color: 'var(--color-heading)' }}>
                          <div>{number(rowUnits)} units</div>
                          <div style={{ fontSize: '10.5px', color: 'var(--color-text-secondary)' }}>
                            ${rowCost.toFixed(2)}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: External Replenishment Requirements */}
        {activeTab === 'external' && (
          <div>
            <div className="panel-heading" style={{ margin: '10px 0 16px' }}>
              <div>
                <h3>Central Warehouse Replenishment Orders</h3>
                <p>Demand deficits where no store in the network possessed transferable surplus</p>
              </div>
            </div>

            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Product SKU</th>
                    <th>Destination Store</th>
                    <th>External Units Needed</th>
                    <th>Risk Classification</th>
                    <th>Procurement Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {externalReplenishment.map((item, idx) => (
                    <tr key={`${item.item_id}-${item.store_id}-${idx}`}>
                      <td><strong>{item.item_id}</strong></td>
                      <td>
                        <span style={{ fontWeight: 600 }}>{item.store_id}</span>
                      </td>
                      <td className="tabular-nums" style={{ color: 'var(--color-warning)', fontWeight: 700 }}>
                        {number(item.external_replenishment)} units
                      </td>
                      <td>
                        <span className={`risk-badge ${String(item.risk_level || '').toLowerCase()}`}>
                          {item.risk_level}
                        </span>
                      </td>
                      <td style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                        {item.reason || 'Network surplus exhausted. Fresh warehouse dispatch required.'}
                      </td>
                    </tr>
                  ))}
                  {externalReplenishment.length === 0 && (
                    <tr>
                      <td colSpan="5" className="empty-state">
                        All store shortages were 100% satisfied by inter-store transfers! Zero external replenishment required.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Recommendation Details Modal */}
      {selectedRecommendation && (
        <div className="modal-overlay" onClick={() => setSelectedRecommendation(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Truck size={18} style={{ color: 'var(--color-primary)' }} />
                <h3>Transfer Recommendation Details</h3>
              </div>
              <button
                type="button"
                className="modal-close"
                onClick={() => setSelectedRecommendation(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <div style={{ display: 'grid', gap: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--color-bg)', borderRadius: 'var(--radius-md)' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>PRODUCT SKU</div>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-heading)' }}>
                      {selectedRecommendation.item_id}
                    </div>
                  </div>
                  <span className="risk-badge low">{selectedRecommendation.status}</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div style={{ padding: '12px', background: 'var(--color-bg)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>DONOR STORE</div>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-heading)', margin: '4px 0' }}>
                      {selectedRecommendation.from_store}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--color-healthy)' }}>
                      Safe Surplus: +{selectedRecommendation.donor_safe_surplus} units
                    </div>
                  </div>

                  <div style={{ padding: '12px', background: 'var(--color-bg)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>RECIPIENT STORE</div>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-heading)', margin: '4px 0' }}>
                      {selectedRecommendation.to_store}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--color-shortage)' }}>
                      Shortage Need: -{selectedRecommendation.recipient_need} units
                    </div>
                  </div>
                </div>

                <div style={{ padding: '14px', background: 'var(--color-primary-light)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-primary-100)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-primary)' }}>
                      TRANSFER QUANTITY
                    </span>
                    <strong style={{ fontSize: '18px', color: 'var(--color-primary)' }}>
                      {selectedRecommendation.transfer_units} units
                    </strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                    <span>Estimated Freight Cost:</span>
                    <strong>${Number(selectedRecommendation.estimated_cost).toFixed(2)} (${selectedRecommendation.unit_cost}/unit)</strong>
                  </div>
                </div>

                <div style={{ padding: '12px', background: 'var(--color-bg)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 600, marginBottom: '4px' }}>
                    ALGORITHMIC EXPLANATION
                  </div>
                  <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                    {selectedRecommendation.explanation}
                  </p>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                  <button
                    type="button"
                    className="primary-button"
                    onClick={() => setSelectedRecommendation(null)}
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
