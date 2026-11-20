import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeftRight,
  Package,
  Truck,
  RefreshCw,
  Search,
  Download,
  CheckCircle,
  ArrowRight,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  Layers
} from 'lucide-react'
import { getRecommendations } from '../services/api'

function Transfers() {
  const [data, setData] = useState({
    transfers: [],
    external_replenishment: []
  })
  const [activeTab, setActiveTab] = useState('transfers') // 'transfers' | 'external' | 'matrix'
  const [store, setStore] = useState('All')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Pagination for transfers
  const [transferPage, setTransferPage] = useState(1)
  const [transferPageSize] = useState(15)

  // Pagination for external
  const [externalPage, setExternalPage] = useState(1)
  const [externalPageSize] = useState(15)

  // Toast feedback
  const [toastMessage, setToastMessage] = useState('')

  const showToast = (msg) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(''), 3500)
  }

  const loadRecommendations = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await getRecommendations()
      setData(response.data)
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        'Unable to load transfer recommendations from optimization service.'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadRecommendations()
  }, [])

  const number = (value, decimals = 0) =>
    Number(value || 0).toLocaleString('en-IN', {
      maximumFractionDigits: decimals
    })

  // Filtered transfers
  const filteredTransfers = useMemo(() => {
    return (data.transfers || []).filter(item => {
      const storeMatch =
        store === 'All' ||
        item.from_store === store ||
        item.to_store === store

      const searchMatch =
        !search.trim() || item.item_id?.toLowerCase().includes(search.toLowerCase().trim())

      return storeMatch && searchMatch
    })
  }, [data.transfers, store, search])

  // Filtered external
  const filteredExternal = useMemo(() => {
    return (data.external_replenishment || []).filter(item => {
      const storeMatch =
        store === 'All' || item.store_id === store

      const searchMatch =
        !search.trim() || item.item_id?.toLowerCase().includes(search.toLowerCase().trim())

      return storeMatch && searchMatch
    })
  }, [data.external_replenishment, store, search])

  // Paginated transfers
  const paginatedTransfers = useMemo(() => {
    const start = (transferPage - 1) * transferPageSize
    return filteredTransfers.slice(start, start + transferPageSize)
  }, [filteredTransfers, transferPage, transferPageSize])

  // Paginated external
  const paginatedExternal = useMemo(() => {
    const start = (externalPage - 1) * externalPageSize
    return filteredExternal.slice(start, start + externalPageSize)
  }, [filteredExternal, externalPage, externalPageSize])

  const totalTransferPages = Math.max(1, Math.ceil(filteredTransfers.length / transferPageSize))
  const totalExternalPages = Math.max(1, Math.ceil(filteredExternal.length / externalPageSize))

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTransferPage(1)
    setExternalPage(1)
  }, [store, search])

  const totalTransferUnits = (data.transfers || []).reduce(
    (sum, item) => sum + Number(item.transfer_units || 0),
    0
  )

  const totalExternalUnits = (data.external_replenishment || []).reduce(
    (sum, item) => sum + Number(item.external_replenishment || 0),
    0
  )

  // Store-to-store matrix calculation
  const transferMatrix = useMemo(() => {
    const matrix = {}
    const stores = ['CA_1', 'CA_2', 'TX_1', 'WI_1']
    stores.forEach(from => {
      matrix[from] = {}
      stores.forEach(to => {
        matrix[from][to] = 0
      })
    })

    ;(data.transfers || []).forEach(t => {
      if (matrix[t.from_store] && matrix[t.from_store][t.to_store] !== undefined) {
        matrix[t.from_store][t.to_store] += Number(t.transfer_units || 0)
      }
    })
    return matrix
  }, [data.transfers])

  const exportTransfersCSV = () => {
    if (!filteredTransfers.length) return
    const headers = ['Product SKU', 'From Store', 'To Store', 'Transfer Units', 'Donor Safe Surplus', 'Recipient Need']
    const rows = filteredTransfers.map(t => [
      t.item_id,
      t.from_store,
      t.to_store,
      t.transfer_units,
      t.donor_safe_surplus,
      t.recipient_need
    ])
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `RetailPulse_Transfers_${store}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    showToast('Transfer manifest exported to CSV.')
  }

  const exportExternalCSV = () => {
    if (!filteredExternal.length) return
    const headers = ['Product SKU', 'Store ID', 'External Units Required', 'Risk Level']
    const rows = filteredExternal.map(e => [
      e.item_id,
      e.store_id,
      e.external_replenishment,
      e.risk_level
    ])
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `RetailPulse_External_Replenishment_${store}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    showToast('External replenishment manifest exported to CSV.')
  }

  const stores = ['CA_1', 'CA_2', 'TX_1', 'WI_1']

  return (
    <div className="transfers-page">
      {toastMessage && (
        <div className="toast-container">
          <div className="toast success">
            <CheckCircle size={16} />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <section className="inventory-filters panel">
        <div>
          <label>Filter by Store</label>
          <select
            value={store}
            onChange={e => setStore(e.target.value)}
          >
            <option value="All">All Store Nodes</option>
            {stores.map(id => (
              <option key={id} value={id}>{id}</option>
            ))}
          </select>
        </div>

        <div style={{ flex: '1 1 220px' }}>
          <label>Search Product SKU</label>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="Filter by SKU e.g. FOODS..."
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
          onClick={loadRecommendations}
          disabled={loading}
          style={{ height: '42px' }}
        >
          <RefreshCw size={15} className={loading ? 'spin' : ''} />
          {loading ? 'Solving...' : 'Re-run Optimization'}
        </button>
      </section>

      {loading ? (
        <div className="message-panel">
          <RefreshCw size={24} className="spin text-indigo-600" style={{ margin: '0 auto 12px' }} />
          <h3>Running Mixed-Integer Linear Optimization</h3>
          <p>Solving inter-store transfer routing to minimize logistics costs and eliminate stockouts...</p>
        </div>
      ) : error ? (
        <div className="error-panel">{error}</div>
      ) : (
        <>
          {/* Executive Metrics */}
          <section className="metrics-grid">
            <div className="metric-card">
              <div className="metric-top">
                <span>Recommended Transfers</span>
                <div className="metric-icon indigo">
                  <ArrowLeftRight size={18} />
                </div>
              </div>
              <div className="metric-value tabular-nums">{number(data.transfers?.length)}</div>
              <div className="metric-subtitle">Optimized inter-store movement routes</div>
            </div>

            <div className="metric-card">
              <div className="metric-top">
                <span>Total Transfer Units</span>
                <div className="metric-icon blue">
                  <Package size={18} />
                </div>
              </div>
              <div className="metric-value tabular-nums">{number(totalTransferUnits)}</div>
              <div className="metric-subtitle">Internal rebalancing inventory</div>
              <div className="metric-trend positive" style={{ marginTop: '8px' }}>
                Zero Supplier Lead-Time
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-top">
                <span>External Replenishment</span>
                <div className="metric-icon amber">
                  <Truck size={18} />
                </div>
              </div>
              <div className="metric-value tabular-nums">{number(totalExternalUnits)}</div>
              <div className="metric-subtitle">Units needed from primary supplier</div>
            </div>

            <div className="metric-card">
              <div className="metric-top">
                <span>Supplier Purchase SKUs</span>
                <div className="metric-icon red">
                  <ShieldAlert size={18} />
                </div>
              </div>
              <div className="metric-value tabular-nums">{number(data.external_replenishment?.length)}</div>
              <div className="metric-subtitle">Products lacking donor store surplus</div>
            </div>
          </section>

          {/* Tab Navigation */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
            <div className="tab-group">
              <button
                type="button"
                className={`tab-btn ${activeTab === 'transfers' ? 'active' : ''}`}
                onClick={() => setActiveTab('transfers')}
              >
                <ArrowLeftRight size={14} />
                Inter-Store Transfers ({filteredTransfers.length})
              </button>
              <button
                type="button"
                className={`tab-btn ${activeTab === 'external' ? 'active' : ''}`}
                onClick={() => setActiveTab('external')}
              >
                <Truck size={14} />
                External Replenishment ({filteredExternal.length})
              </button>
              <button
                type="button"
                className={`tab-btn ${activeTab === 'matrix' ? 'active' : ''}`}
                onClick={() => setActiveTab('matrix')}
              >
                <Layers size={14} />
                Transfer Flow Matrix
              </button>
            </div>

            {activeTab === 'transfers' && (
              <button
                type="button"
                className="action-btn"
                onClick={exportTransfersCSV}
              >
                <Download size={13} /> Export Transfer Manifest
              </button>
            )}

            {activeTab === 'external' && (
              <button
                type="button"
                className="action-btn"
                onClick={exportExternalCSV}
              >
                <Download size={13} /> Export Replenishment Manifest
              </button>
            )}
          </div>

          {/* TAB 1: Inter-store Transfers */}
          {activeTab === 'transfers' && (
            <section className="panel inventory-table-panel">
              <div className="panel-heading">
                <div>
                  <h2>Optimized Inter-Store Transfer Routes</h2>
                  <p>
                    Rebalancing excess inventory to deficit stores without risking stockouts at the donor location
                  </p>
                </div>
                <span className="panel-tag">OR-TOOLS MIP ENGINE</span>
              </div>

              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Product SKU</th>
                      <th>Transfer Route</th>
                      <th>Transfer Units</th>
                      <th>Donor Safe Surplus</th>
                      <th>Recipient Deficit</th>
                      <th>Fulfillment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedTransfers.map((item, index) => {
                      const fulfillmentPct = item.recipient_need > 0
                        ? Math.min(100, Math.round((item.transfer_units / item.recipient_need) * 100))
                        : 100

                      return (
                        <tr key={`${item.item_id}-${item.from_store}-${item.to_store}-${index}`}>
                          <td>
                            <strong>{item.item_id}</strong>
                          </td>
                          <td>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#f1f5f9', padding: '4px 10px', borderRadius: '16px', fontSize: '11.5px' }}>
                              <span style={{ fontWeight: 600, color: 'var(--color-heading)' }}>{item.from_store}</span>
                              <ArrowRight size={13} className="text-indigo-600" />
                              <span style={{ fontWeight: 600, color: 'var(--color-heading)' }}>{item.to_store}</span>
                            </div>
                          </td>
                          <td className="tabular-nums" style={{ color: 'var(--color-primary)', fontWeight: 700, fontSize: '14px' }}>
                            {number(item.transfer_units)} units
                          </td>
                          <td className="tabular-nums">
                            <span style={{ color: '#059669', fontWeight: 500 }}>{number(item.donor_safe_surplus)}</span>
                          </td>
                          <td className="tabular-nums">
                            <span style={{ color: '#dc2626', fontWeight: 500 }}>{number(item.recipient_need)}</span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div className="progress-bar-container" style={{ width: 80, margin: 0 }}>
                                <div
                                  className="progress-bar-fill"
                                  style={{
                                    width: `${fulfillmentPct}%`,
                                    background: fulfillmentPct >= 100 ? '#10b981' : '#f59e0b'
                                  }}
                                />
                              </div>
                              <span style={{ fontSize: '11px', fontWeight: 600 }}>{fulfillmentPct}%</span>
                            </div>
                          </td>
                        </tr>
                      )
                    })}

                    {paginatedTransfers.length === 0 && (
                      <tr>
                        <td colSpan="6" className="empty-state">
                          No matching inter-store transfer recommendations found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {filteredTransfers.length > 0 && (
                <div className="pagination-controls">
                  <div>
                    Showing {Math.min(filteredTransfers.length, (transferPage - 1) * transferPageSize + 1)}–
                    {Math.min(filteredTransfers.length, transferPage * transferPageSize)} of {filteredTransfers.length} routes
                  </div>
                  <div className="pagination-buttons">
                    <button
                      type="button"
                      className="pagination-btn"
                      disabled={transferPage === 1}
                      onClick={() => setTransferPage(p => Math.max(1, p - 1))}
                    >
                      <ChevronLeft size={14} style={{ verticalAlign: 'middle' }} /> Previous
                    </button>
                    <button
                      type="button"
                      className="pagination-btn"
                      disabled={transferPage >= totalTransferPages}
                      onClick={() => setTransferPage(p => Math.min(totalTransferPages, p + 1))}
                    >
                      Next <ChevronRight size={14} style={{ verticalAlign: 'middle' }} />
                    </button>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* TAB 2: External Replenishment */}
          {activeTab === 'external' && (
            <section className="panel inventory-table-panel">
              <div className="panel-heading">
                <div>
                  <h2>External Supplier Replenishment Orders</h2>
                  <p>
                    Stock deficits that cannot be covered by donor stores and require central warehouse dispatch
                  </p>
                </div>
                <span className="panel-tag">SUPPLY CHAIN PURCHASE</span>
              </div>

              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Product SKU</th>
                      <th>Destination Store</th>
                      <th>External Units Required</th>
                      <th>Risk Classification</th>
                      <th>Action Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedExternal.map((item, index) => (
                      <tr key={`${item.item_id}-${item.store_id}-${index}`}>
                        <td><strong>{item.item_id}</strong></td>
                        <td>
                          <span style={{ fontWeight: 600, color: 'var(--color-heading)' }}>{item.store_id}</span>
                        </td>
                        <td className="tabular-nums" style={{ color: '#d97706', fontWeight: 700, fontSize: '14px' }}>
                          {number(item.external_replenishment)} units
                        </td>
                        <td>
                          <span className={`risk-badge ${String(item.risk_level || '').toLowerCase()}`}>
                            {item.risk_level}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', background: '#f8fafc', padding: '4px 8px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                            Order Requisition Generated
                          </span>
                        </td>
                      </tr>
                    ))}

                    {paginatedExternal.length === 0 && (
                      <tr>
                        <td colSpan="5" className="empty-state">
                          No external replenishment requirements match the selected filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {filteredExternal.length > 0 && (
                <div className="pagination-controls">
                  <div>
                    Showing {Math.min(filteredExternal.length, (externalPage - 1) * externalPageSize + 1)}–
                    {Math.min(filteredExternal.length, externalPage * externalPageSize)} of {filteredExternal.length} requirements
                  </div>
                  <div className="pagination-buttons">
                    <button
                      type="button"
                      className="pagination-btn"
                      disabled={externalPage === 1}
                      onClick={() => setExternalPage(p => Math.max(1, p - 1))}
                    >
                      <ChevronLeft size={14} style={{ verticalAlign: 'middle' }} /> Previous
                    </button>
                    <button
                      type="button"
                      className="pagination-btn"
                      disabled={externalPage >= totalExternalPages}
                      onClick={() => setExternalPage(p => Math.min(totalExternalPages, p + 1))}
                    >
                      Next <ChevronRight size={14} style={{ verticalAlign: 'middle' }} />
                    </button>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* TAB 3: Transfer Flow Matrix */}
          {activeTab === 'matrix' && (
            <section className="panel inventory-table-panel">
              <div className="panel-heading">
                <div>
                  <h2>Store-to-Store Transfer Flow Matrix</h2>
                  <p>Aggregated units transferred between regional retail nodes</p>
                </div>
                <span className="panel-tag">NETWORK TOPOLOGY</span>
              </div>

              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>From (Donor) \ To (Recipient)</th>
                      <th>CA_1</th>
                      <th>CA_2</th>
                      <th>TX_1</th>
                      <th>WI_1</th>
                      <th>Total Outgoing</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stores.map(from => {
                      const rowTotal = stores.reduce((sum, to) => sum + (transferMatrix[from]?.[to] || 0), 0)
                      return (
                        <tr key={from}>
                          <td><strong>{from}</strong></td>
                          {stores.map(to => {
                            const val = transferMatrix[from]?.[to] || 0
                            return (
                              <td key={to} className="tabular-nums">
                                {from === to ? (
                                  <span style={{ color: 'var(--color-text-muted)' }}>—</span>
                                ) : val > 0 ? (
                                  <strong style={{ color: 'var(--color-primary)' }}>{number(val)} units</strong>
                                ) : (
                                  <span>0</span>
                                )}
                              </td>
                            )
                          })}
                          <td className="tabular-nums" style={{ fontWeight: 700, color: 'var(--color-heading)' }}>
                            {number(rowTotal)} units
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          <p className="forecast-disclaimer">
            Transfer recommendations utilize linear programming constraints to ensure donor stores do not fall below their calculated safety stock threshold during transit.
          </p>
        </>
      )}
    </div>
  )
}

export default Transfers
