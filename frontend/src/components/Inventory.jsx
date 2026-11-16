
import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  Package,
  TrendingDown,
  RefreshCw
} from 'lucide-react'
import { getInventoryRisks } from '../services/api'

function Inventory() {
  const [inventory, setInventory] = useState([])
  const [store, setStore] = useState('All')
  const [risk, setRisk] = useState('All')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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
        'Unable to load inventory data.'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadInventory()
  }, [])

  const filteredInventory = useMemo(() => {
    return inventory.filter(item => {
      const storeMatch = store === 'All' || item.store_id === store
      const riskMatch = risk === 'All' || item.risk_level === risk

      return storeMatch && riskMatch
    })
  }, [inventory, store, risk])

  const number = value =>
    Number(value || 0).toLocaleString('en-IN', {
      maximumFractionDigits: 0
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

  return (
    <div className="inventory-page">

      <section className="inventory-filters panel">
        <div>
          <label>Store</label>
          <select value={store} onChange={e => setStore(e.target.value)}>
            <option value="All">All stores</option>
            <option value="CA_1">CA_1</option>
            <option value="TX_1">TX_1</option>
            <option value="WI_1">WI_1</option>
          </select>
        </div>

        <div>
          <label>Risk level</label>
          <select value={risk} onChange={e => setRisk(e.target.value)}>
            <option value="All">All risk levels</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>

        <button
          className="refresh-button"
          onClick={loadInventory}
          disabled={loading}
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </section>

      {loading ? (
        <div className="message-panel">Loading inventory...</div>
      ) : error ? (
        <div className="error-panel">{error}</div>
      ) : (
        <>
          <section className="metrics-grid">

            <div className="metric-card">
              <div className="metric-top">
                <span>Inventory units</span>
                <Package size={19} />
              </div>
              <div className="metric-value">{number(totalStock)}</div>
              <div className="metric-subtitle">Current simulated stock</div>
            </div>

            <div className="metric-card">
              <div className="metric-top">
                <span>High-risk products</span>
                <AlertTriangle size={19} />
              </div>
              <div className="metric-value">{number(highRisk)}</div>
              <div className="metric-subtitle">Require urgent attention</div>
            </div>

            <div className="metric-card">
              <div className="metric-top">
                <span>Medium-risk products</span>
                <TrendingDown size={19} />
              </div>
              <div className="metric-value">{number(mediumRisk)}</div>
              <div className="metric-subtitle">Require monitoring</div>
            </div>

            <div className="metric-card">
              <div className="metric-top">
                <span>Reorder quantity</span>
                <Package size={19} />
              </div>
              <div className="metric-value">{number(totalReorder)}</div>
              <div className="metric-subtitle">Units to restore target stock</div>
            </div>

          </section>

          <section className="panel inventory-table-panel">
            <div className="panel-heading">
              <div>
                <h2>Inventory risk analysis</h2>
                <p>
                  {filteredInventory.length} product-store combinations
                </p>
              </div>
              <span className="panel-tag">INVENTORY MONITOR</span>
            </div>

            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Store</th>
                    <th>On-hand</th>
                    <th>7-day demand</th>
                    <th>Safety stock</th>
                    <th>Risk gap</th>
                    <th>Reorder qty</th>
                    <th>Risk</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredInventory.map((item, index) => (
                    <tr key={`${item.store_id}-${item.item_id}-${index}`}>
                      <td><strong>{item.item_id}</strong></td>
                      <td>{item.store_id}</td>
                      <td>{number(item.on_hand_stock)}</td>
                      <td>{number(item.forecast_7d_demand)}</td>
                      <td>{number(item.safety_stock)}</td>
                      <td>{number(item.risk_gap)}</td>
                      <td>{number(item.reorder_quantity)}</td>
                      <td>
                        <span className={`risk-badge ${String(item.risk_level || '').toLowerCase()}`}>
                          {item.risk_level}
                        </span>
                      </td>
                    </tr>
                  ))}

                  {filteredInventory.length === 0 && (
                    <tr>
                      <td colSpan="8">No matching inventory records.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <p className="forecast-disclaimer">
            Inventory levels are simulated planning scenarios derived from
            public M5 sales data, not actual retailer inventory records.
          </p>
        </>
      )}
    </div>
  )
}

export default Inventory
