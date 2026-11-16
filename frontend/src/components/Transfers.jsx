
import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeftRight,
  Package,
  Truck,
  RefreshCw
} from 'lucide-react'
import { getRecommendations } from '../services/api'

function Transfers() {
  const [data, setData] = useState({
    transfers: [],
    external_replenishment: []
  })
  const [store, setStore] = useState('All')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadRecommendations = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await getRecommendations()
      setData(response.data)
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        'Unable to load transfer recommendations.'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRecommendations()
  }, [])

  const number = value =>
    Number(value || 0).toLocaleString('en-IN', {
      maximumFractionDigits: 0
    })

  const filteredTransfers = useMemo(() => {
    return data.transfers.filter(item => {
      const storeMatch =
        store === 'All' ||
        item.from_store === store ||
        item.to_store === store

      const searchMatch =
        item.item_id.toLowerCase().includes(search.toLowerCase())

      return storeMatch && searchMatch
    })
  }, [data.transfers, store, search])

  const filteredExternal = useMemo(() => {
    return data.external_replenishment.filter(item => {
      const storeMatch =
        store === 'All' || item.store_id === store

      const searchMatch =
        item.item_id.toLowerCase().includes(search.toLowerCase())

      return storeMatch && searchMatch
    })
  }, [data.external_replenishment, store, search])

  const totalTransferUnits = data.transfers.reduce(
    (sum, item) => sum + Number(item.transfer_units || 0),
    0
  )

  const totalExternalUnits = data.external_replenishment.reduce(
    (sum, item) => sum + Number(item.external_replenishment || 0),
    0
  )

  const stores = ['CA_1', 'TX_1', 'WI_1']

  return (
    <div className="transfers-page">
      <section className="inventory-filters panel">
        <div>
          <label>Store</label>
          <select
            value={store}
            onChange={e => setStore(e.target.value)}
          >
            <option value="All">All stores</option>
            {stores.map(id => (
              <option key={id} value={id}>{id}</option>
            ))}
          </select>
        </div>

        <div>
          <label>Search product</label>
          <input
            type="text"
            placeholder="Enter product ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <button
          className="refresh-button"
          onClick={loadRecommendations}
          disabled={loading}
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </section>

      {loading ? (
        <div className="message-panel">Loading transfer recommendations...</div>
      ) : error ? (
        <div className="error-panel">{error}</div>
      ) : (
        <>
          <section className="metrics-grid">
            <div className="metric-card">
              <div className="metric-top">
                <span>Recommended transfers</span>
                <ArrowLeftRight size={19} />
              </div>
              <div className="metric-value">
                {number(data.transfers.length)}
              </div>
              <div className="metric-subtitle">Product-store transfer routes</div>
            </div>

            <div className="metric-card">
              <div className="metric-top">
                <span>Transfer units</span>
                <Package size={19} />
              </div>
              <div className="metric-value">
                {number(totalTransferUnits)}
              </div>
              <div className="metric-subtitle">Units moved between stores</div>
            </div>

            <div className="metric-card">
              <div className="metric-top">
                <span>External replenishment</span>
                <Truck size={19} />
              </div>
              <div className="metric-value">
                {number(totalExternalUnits)}
              </div>
              <div className="metric-subtitle">Units still needed externally</div>
            </div>

            <div className="metric-card">
              <div className="metric-top">
                <span>Products needing external stock</span>
                <Package size={19} />
              </div>
              <div className="metric-value">
                {number(data.external_replenishment.length)}
              </div>
              <div className="metric-subtitle">Product-store combinations</div>
            </div>
          </section>

          <section className="panel inventory-table-panel">
            <div className="panel-heading">
              <div>
                <h2>Inter-store transfer recommendations</h2>
                <p>{filteredTransfers.length} recommendations</p>
              </div>
              <span className="panel-tag">OPTIMIZATION ENGINE</span>
            </div>

            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>From store</th>
                    <th>To store</th>
                    <th>Transfer units</th>
                    <th>Donor safe surplus</th>
                    <th>Recipient need</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransfers.map((item, index) => (
                    <tr key={`${item.item_id}-${item.from_store}-${item.to_store}-${index}`}>
                      <td><strong>{item.item_id}</strong></td>
                      <td>{item.from_store}</td>
                      <td>{item.to_store}</td>
                      <td><strong>{number(item.transfer_units)}</strong></td>
                      <td>{number(item.donor_safe_surplus)}</td>
                      <td>{number(item.recipient_need)}</td>
                    </tr>
                  ))}

                  {filteredTransfers.length === 0 && (
                    <tr>
                      <td colSpan="6">No matching transfer recommendations.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="panel inventory-table-panel">
            <div className="panel-heading">
              <div>
                <h2>External replenishment requirements</h2>
                <p>{filteredExternal.length} product-store combinations</p>
              </div>
              <span className="panel-tag">SUPPLY REQUIREMENTS</span>
            </div>

            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Store</th>
                    <th>External units required</th>
                    <th>Risk level</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredExternal.map((item, index) => (
                    <tr key={`${item.item_id}-${item.store_id}-${index}`}>
                      <td><strong>{item.item_id}</strong></td>
                      <td>{item.store_id}</td>
                      <td>{number(item.external_replenishment)}</td>
                      <td>
                        <span className={`risk-badge ${String(item.risk_level).toLowerCase()}`}>
                          {item.risk_level}
                        </span>
                      </td>
                    </tr>
                  ))}

                  {filteredExternal.length === 0 && (
                    <tr>
                      <td colSpan="4">No matching external requirements.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <p className="forecast-disclaimer">
            Recommendations are generated using simulated inventory scenarios
            and an OR-Tools optimization model. They are planning suggestions,
            not executed stock movements.
          </p>
        </>
      )}
    </div>
  )
}

export default Transfers
