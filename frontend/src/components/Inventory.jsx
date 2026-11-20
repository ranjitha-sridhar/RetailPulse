import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  Package,
  TrendingDown,
  RefreshCw,
  Search,
  Download,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Boxes,
  ExternalLink
} from 'lucide-react'
import { getInventoryRisks } from '../services/api'

function Inventory({ onNavigateToForecast }) {
  const [inventory, setInventory] = useState([])
  const [store, setStore] = useState('All')
  const [risk, setRisk] = useState('All')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Sorting
  const [sortField, setSortField] = useState('risk_gap')
  const [sortDirection, setSortDirection] = useState('desc') // 'asc' or 'desc'

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(15)

  const loadInventory = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await getInventoryRisks({ limit: 300 })
      const data = response.data

      setInventory(
        Array.isArray(data) ? data : data.risks || []
      )
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        'Unable to load inventory data from the server.'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadInventory()
  }, [])

  // Filtered list
  const filteredInventory = useMemo(() => {
    return inventory.filter(item => {
      const storeMatch = store === 'All' || item.store_id === store
      const riskMatch = risk === 'All' || item.risk_level?.toLowerCase() === risk.toLowerCase()
      const searchMatch = !search.trim() || item.item_id?.toLowerCase().includes(search.toLowerCase().trim())

      return storeMatch && riskMatch && searchMatch
    })
  }, [inventory, store, risk, search])

  // Sorted list
  const sortedInventory = useMemo(() => {
    const list = [...filteredInventory]
    list.sort((a, b) => {
      let valA = a[sortField]
      let valB = b[sortField]

      if (typeof valA === 'string') {
        const comp = valA.localeCompare(valB)
        return sortDirection === 'asc' ? comp : -comp
      }

      valA = Number(valA || 0)
      valB = Number(valB || 0)
      return sortDirection === 'asc' ? valA - valB : valB - valA
    })
    return list
  }, [filteredInventory, sortField, sortDirection])

  // Paginated slice
  const paginatedInventory = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return sortedInventory.slice(start, start + pageSize)
  }, [sortedInventory, currentPage, pageSize])

  const totalPages = Math.max(1, Math.ceil(sortedInventory.length / pageSize))

  // Reset to page 1 whenever filters or search change
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentPage(1)
  }, [store, risk, search, pageSize])

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const number = (value, decimals = 0) =>
    Number(value || 0).toLocaleString('en-IN', {
      maximumFractionDigits: decimals
    })

  const totalStock = filteredInventory.reduce(
    (sum, item) => sum + Number(item.on_hand_stock || 0), 0
  )

  const totalReorder = filteredInventory.reduce(
    (sum, item) => sum + Number(item.reorder_quantity || 0), 0
  )

  const highRisk = filteredInventory.filter(
    item => item.risk_level === 'High'
  ).length

  const mediumRisk = filteredInventory.filter(
    item => item.risk_level === 'Medium'
  ).length

  const exportInventoryCSV = () => {
    if (!sortedInventory.length) return
    const headers = [
      'Product SKU',
      'Store ID',
      'On Hand Stock',
      '7-Day Demand',
      'Safety Stock',
      'Target Stock',
      'Risk Gap',
      'Reorder Quantity',
      'Stockout Risk',
      'Risk Level',
      'Recommendation'
    ]
    const rows = sortedInventory.map(item => [
      item.item_id,
      item.store_id,
      item.on_hand_stock,
      item.forecast_7d_demand,
      item.safety_stock,
      item.target_stock,
      item.risk_gap,
      item.reorder_quantity,
      item.stockout_risk,
      item.risk_level,
      `"${item.recommendation || ''}"`
    ])
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `RetailPulse_Inventory_${store}_${risk}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="inventory-page">
      {/* Top Filter & Search Controls */}
      <section className="inventory-filters panel">
        <div>
          <label>Store Region</label>
          <select value={store} onChange={e => setStore(e.target.value)}>
            <option value="All">All 4 Stores (CA_1, CA_2, TX_1, WI_1)</option>
            <option value="CA_1">CA_1 (California Store 1)</option>
            <option value="CA_2">CA_2 (California Store 2)</option>
            <option value="TX_1">TX_1 (Texas Store 1)</option>
            <option value="WI_1">WI_1 (Wisconsin Store 1)</option>
          </select>
        </div>

        <div>
          <label>Risk Classification</label>
          <select value={risk} onChange={e => setRisk(e.target.value)}>
            <option value="All">All risk levels</option>
            <option value="High">High risk (Stockout imminent)</option>
            <option value="Medium">Medium risk (Buffer warning)</option>
            <option value="Low">Low risk (Healthy buffer)</option>
          </select>
        </div>

        <div style={{ flex: '1 1 200px' }}>
          <label>Search SKU</label>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="Search product ID e.g. FOODS..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', paddingLeft: '34px' }}
            />
            <Search size={15} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--color-text-muted)' }} />
          </div>
        </div>

        <button
          type="button"
          className="refresh-button"
          onClick={loadInventory}
          disabled={loading}
          style={{ height: '42px' }}
        >
          <RefreshCw size={15} className={loading ? 'spin' : ''} />
          {loading ? 'Updating...' : 'Refresh'}
        </button>
      </section>

      {loading ? (
        <div className="message-panel">
          <RefreshCw size={24} className="spin text-indigo-600" style={{ margin: '0 auto 12px' }} />
          <h3>Analyzing Multi-Store Inventory</h3>
          <p>Calculating stock coverage, safety stock thresholds, and stockout risk gaps...</p>
        </div>
      ) : error ? (
        <div className="error-panel">
          <AlertTriangle size={20} />
          <div>
            <strong>Inventory Service Error</strong>
            <p>{error}</p>
            <button onClick={loadInventory}>Try Again</button>
          </div>
        </div>
      ) : (
        <>
          {/* Summary KPI Cards */}
          <section className="metrics-grid">
            <div className="metric-card">
              <div className="metric-top">
                <span>Total On-Hand Stock</span>
                <div className="metric-icon indigo">
                  <Package size={18} />
                </div>
              </div>
              <div className="metric-value tabular-nums">{number(totalStock)}</div>
              <div className="metric-subtitle">Across {filteredInventory.length} monitored SKUs</div>
            </div>

            <div className="metric-card">
              <div className="metric-top">
                <span>High-Risk SKUs</span>
                <div className="metric-icon red">
                  <ShieldAlert size={18} />
                </div>
              </div>
              <div className="metric-value tabular-nums" style={{ color: highRisk > 0 ? '#ef4444' : undefined }}>
                {number(highRisk)}
              </div>
              <div className="metric-subtitle">Risk gap &gt; safety threshold</div>
              {highRisk > 0 && (
                <div className="metric-trend negative" style={{ marginTop: '8px' }}>
                  Urgent Rebalance Required
                </div>
              )}
            </div>

            <div className="metric-card">
              <div className="metric-top">
                <span>Medium-Risk SKUs</span>
                <div className="metric-icon amber">
                  <TrendingDown size={18} />
                </div>
              </div>
              <div className="metric-value tabular-nums">{number(mediumRisk)}</div>
              <div className="metric-subtitle">Projected deficit in 4-7 days</div>
            </div>

            <div className="metric-card">
              <div className="metric-top">
                <span>Total Reorder Needed</span>
                <div className="metric-icon emerald">
                  <Boxes size={18} />
                </div>
              </div>
              <div className="metric-value tabular-nums">{number(totalReorder)}</div>
              <div className="metric-subtitle">Units to restore target baseline</div>
            </div>
          </section>

          {/* Comprehensive Inventory Table */}
          <section className="panel inventory-table-panel">
            <div className="panel-heading">
              <div>
                <h2>Inventory Intelligence Matrix</h2>
                <p>
                  Showing {sortedInventory.length} product-store records · Page {currentPage} of {totalPages}
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <select
                  value={pageSize}
                  onChange={e => setPageSize(Number(e.target.value))}
                  style={{
                    padding: '5px 10px',
                    fontSize: '12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-surface)',
                    color: 'var(--color-text-secondary)',
                    outline: 'none'
                  }}
                >
                  <option value={10}>10 per page</option>
                  <option value={15}>15 per page</option>
                  <option value={25}>25 per page</option>
                  <option value={50}>50 per page</option>
                </select>

                <button
                  type="button"
                  className="action-btn"
                  onClick={exportInventoryCSV}
                  title="Export records to CSV"
                >
                  <Download size={13} />
                  Export CSV
                </button>
              </div>
            </div>

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
                    <th onClick={() => handleSort('store_id')} className="sortable">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        Store
                        {sortField === 'store_id' ? (sortDirection === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={12} style={{ opacity: 0.3 }} />}
                      </div>
                    </th>
                    <th onClick={() => handleSort('on_hand_stock')} className="sortable">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        On-Hand
                        {sortField === 'on_hand_stock' ? (sortDirection === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={12} style={{ opacity: 0.3 }} />}
                      </div>
                    </th>
                    <th onClick={() => handleSort('forecast_7d_demand')} className="sortable">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        7D Demand
                        {sortField === 'forecast_7d_demand' ? (sortDirection === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={12} style={{ opacity: 0.3 }} />}
                      </div>
                    </th>
                    <th onClick={() => handleSort('safety_stock')} className="sortable">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        Safety Stock
                        {sortField === 'safety_stock' ? (sortDirection === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={12} style={{ opacity: 0.3 }} />}
                      </div>
                    </th>
                    <th onClick={() => handleSort('risk_gap')} className="sortable">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        Risk Gap
                        {sortField === 'risk_gap' ? (sortDirection === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={12} style={{ opacity: 0.3 }} />}
                      </div>
                    </th>
                    <th onClick={() => handleSort('reorder_quantity')} className="sortable">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        Reorder Qty
                        {sortField === 'reorder_quantity' ? (sortDirection === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={12} style={{ opacity: 0.3 }} />}
                      </div>
                    </th>
                    <th onClick={() => handleSort('risk_level')} className="sortable">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        Risk Level
                        {sortField === 'risk_level' ? (sortDirection === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={12} style={{ opacity: 0.3 }} />}
                      </div>
                    </th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {paginatedInventory.map((item, index) => {
                    const targetStock = Number(item.target_stock || (Number(item.on_hand_stock || 0) + Number(item.reorder_quantity || 0)))
                    const fillPct = targetStock > 0 ? Math.min(100, Math.round((Number(item.on_hand_stock || 0) / targetStock) * 100)) : 100

                    return (
                      <tr key={`${item.store_id}-${item.item_id}-${index}`}>
                        <td>
                          <strong>{item.item_id}</strong>
                          <div style={{ fontSize: '10.5px', color: 'var(--color-text-muted)' }}>
                            {item.recommendation || 'Standard inventory monitor'}
                          </div>
                        </td>
                        <td>
                          <span style={{ fontWeight: 600, color: 'var(--color-heading)' }}>
                            {item.store_id}
                          </span>
                        </td>
                        <td className="tabular-nums">
                          <div>{number(item.on_hand_stock)}</div>
                          <div className="progress-bar-container" title={`Stock ratio: ${fillPct}%`}>
                            <div
                              className="progress-bar-fill"
                              style={{
                                width: `${fillPct}%`,
                                background: fillPct < 40 ? '#ef4444' : fillPct < 70 ? '#f59e0b' : '#10b981'
                              }}
                            />
                          </div>
                        </td>
                        <td className="tabular-nums">{number(item.forecast_7d_demand)}</td>
                        <td className="tabular-nums">{number(item.safety_stock)}</td>
                        <td className="tabular-nums" style={{ color: Number(item.risk_gap) > 0 ? '#ef4444' : undefined, fontWeight: Number(item.risk_gap) > 0 ? 600 : 400 }}>
                          {number(item.risk_gap)}
                        </td>
                        <td className="tabular-nums" style={{ color: Number(item.reorder_quantity) > 0 ? '#4f46e5' : undefined, fontWeight: Number(item.reorder_quantity) > 0 ? 600 : 400 }}>
                          {number(item.reorder_quantity)}
                        </td>
                        <td>
                          <span className={`risk-badge ${String(item.risk_level || '').toLowerCase()}`}>
                            {item.risk_level === 'High' && <span className="status-dot" style={{ background: '#ef4444', marginRight: 4 }} />}
                            {item.risk_level}
                          </span>
                        </td>
                        <td>
                          {onNavigateToForecast ? (
                            <button
                              type="button"
                              className="action-btn"
                              onClick={() => onNavigateToForecast(item.store_id, item.item_id)}
                              title="Inspect ML Forecast for this SKU"
                            >
                              Forecast <ExternalLink size={11} />
                            </button>
                          ) : (
                            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Monitored</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}

                  {paginatedInventory.length === 0 && (
                    <tr>
                      <td colSpan="9" className="empty-state">
                        No inventory records match the selected store, risk, or search filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {sortedInventory.length > 0 && (
              <div className="pagination-controls">
                <div>
                  Showing {Math.min(sortedInventory.length, (currentPage - 1) * pageSize + 1)}–
                  {Math.min(sortedInventory.length, currentPage * pageSize)} of {sortedInventory.length} items
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
          </section>

          <p className="forecast-disclaimer">
            Safety stock thresholds and risk levels are computed via statistical service level modeling using historical M5 demand variances.
          </p>
        </>
      )}
    </div>
  )
}

export default Inventory
