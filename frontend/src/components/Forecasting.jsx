import { useEffect, useState, useMemo } from 'react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts'
import {
  RefreshCw,
  TrendingUp,
  Target,
  BarChart3,
  Calendar,
  Download,
  Check,
  Sparkles,
  Info
} from 'lucide-react'
import { getProductForecast } from '../services/api'

const QUICK_PRODUCTS = [
  'FOODS_3_226',
  'FOODS_1_004',
  'FOODS_1_018',
  'FOODS_1_032',
  'FOODS_1_043'
]

function CustomForecastTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    const actual = payload.find(p => p.dataKey === 'actual_sales')?.value
    const predicted = payload.find(p => p.dataKey === 'predicted_sales')?.value
    const baseline = payload.find(p => p.dataKey === 'seasonal_prediction')?.value
    const diff = (predicted !== undefined && actual !== undefined) ? predicted - actual : null
    const diffPct = (actual && diff !== null) ? ((diff / actual) * 100).toFixed(1) : null

    return (
      <div className="custom-tooltip">
        <div className="label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Calendar size={13} className="text-indigo-500" />
          <span>{label}</span>
        </div>
        <div style={{ display: 'grid', gap: '5px', marginTop: '6px' }}>
          {actual !== undefined && (
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', color: '#64748b' }}>
              <span>Actual sales:</span>
              <strong style={{ color: '#0f172a' }}>{Number(actual).toFixed(1)} units</strong>
            </div>
          )}
          {predicted !== undefined && (
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', color: '#4f46e5' }}>
              <span>XGBoost ML forecast:</span>
              <strong style={{ color: '#4f46e5' }}>{Number(predicted).toFixed(1)} units</strong>
            </div>
          )}
          {baseline !== undefined && (
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', color: '#0284c7' }}>
              <span>Seasonal baseline:</span>
              <strong style={{ color: '#0284c7' }}>{Number(baseline).toFixed(1)} units</strong>
            </div>
          )}
          {diff !== null && (
            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '4px', marginTop: '2px', display: 'flex', justifyContent: 'space-between', gap: '16px', fontSize: '11px' }}>
              <span>Variance:</span>
              <span style={{ color: diff >= 0 ? '#10b981' : '#ef4444', fontWeight: 600 }}>
                {diff >= 0 ? `+${diff.toFixed(1)}` : diff.toFixed(1)} ({diffPct > 0 ? `+${diffPct}` : diffPct}%)
              </span>
            </div>
          )}
        </div>
      </div>
    )
  }
  return null
}

function Forecasting({ initialStore = 'CA_1', initialProduct = 'FOODS_3_226' }) {
  const [storeId, setStoreId] = useState(initialStore)
  const [productId, setProductId] = useState(initialProduct)
  const [forecastData, setForecastData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [visibleSeries, setVisibleSeries] = useState({
    actual: true,
    predicted: true,
    seasonal: true
  })
  const [tableSearch, setTableSearch] = useState('')

  const loadForecast = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await getProductForecast(storeId, productId.trim())
      setForecastData(response.data)
    } catch (err) {
      setForecastData(null)
      setError(
        err.response?.data?.detail ||
        'Unable to load forecast for this store and product. Check the product ID.'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadForecast()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId, productId])

  const formatNumber = (value, decimals = 1) =>
    Number(value || 0).toLocaleString('en-IN', {
      maximumFractionDigits: decimals,
      minimumFractionDigits: decimals
    })

  const totalDemand = useMemo(() => {
    if (!forecastData?.forecasts) return 0
    return forecastData.forecasts.reduce((sum, item) => sum + Number(item.predicted_sales || 0), 0)
  }, [forecastData])

  const peakDay = useMemo(() => {
    if (!forecastData?.forecasts?.length) return null
    return [...forecastData.forecasts].sort((a, b) => b.predicted_sales - a.predicted_sales)[0]
  }, [forecastData])

  const filteredForecasts = useMemo(() => {
    if (!forecastData?.forecasts) return []
    if (!tableSearch.trim()) return forecastData.forecasts
    const query = tableSearch.toLowerCase()
    return forecastData.forecasts.filter(
      item => item.date.toLowerCase().includes(query) || String(item.forecast_horizon).includes(query)
    )
  }, [forecastData, tableSearch])

  const exportForecastCSV = () => {
    if (!forecastData?.forecasts?.length) return
    const headers = ['Store', 'Product', 'Date', 'Day Horizon', 'Actual Sales', 'XGBoost Prediction', 'Seasonal Baseline', 'Variance']
    const rows = forecastData.forecasts.map(f => [
      storeId,
      productId,
      f.date,
      f.forecast_horizon,
      f.actual_sales,
      Number(f.predicted_sales).toFixed(2),
      Number(f.seasonal_prediction).toFixed(2),
      (Number(f.predicted_sales) - Number(f.actual_sales)).toFixed(2)
    ])
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `RetailPulse_Forecast_${storeId}_${productId}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const toggleSeries = (key) => {
    setVisibleSeries(prev => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <div className="forecast-page">
      {/* Top Filter & Selector Panel */}
      <section className="panel forecast-filters">
        <div>
          <label htmlFor="forecast-store">Select Store Region</label>
          <select
            id="forecast-store"
            value={storeId}
            onChange={(e) => setStoreId(e.target.value)}
          >
            <option value="CA_1">CA_1 (California Store 1)</option>
            <option value="TX_1">TX_1 (Texas Store 1)</option>
            <option value="WI_1">WI_1 (Wisconsin Store 1)</option>
          </select>
        </div>

        <div style={{ flex: '1 1 240px' }}>
          <label htmlFor="forecast-product">Product SKU</label>
          <input
            id="forecast-product"
            value={productId}
            onChange={(e) => setProductId(e.target.value.toUpperCase())}
            placeholder="e.g. FOODS_3_226"
          />
        </div>

        <button
          type="button"
          className="refresh-button"
          onClick={loadForecast}
          disabled={loading}
        >
          <RefreshCw size={15} className={loading ? 'spin' : ''} />
          {loading ? 'Refreshing...' : 'Refresh Forecast'}
        </button>

        {/* Quick SKU Chips */}
        <div style={{ width: '100%', marginTop: '6px' }}>
          <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '6px', fontWeight: 500 }}>
            Quick select popular SKUs:
          </div>
          <div className="chip-group">
            {QUICK_PRODUCTS.map(sku => (
              <button
                key={sku}
                type="button"
                className={`chip ${productId === sku ? 'active' : ''}`}
                onClick={() => setProductId(sku)}
              >
                {sku}
              </button>
            ))}
          </div>
        </div>
      </section>

      {loading ? (
        <div className="message-panel">
          <RefreshCw size={24} className="spin text-indigo-600" style={{ margin: '0 auto 12px' }} />
          <h3>Generating Demand Forecast</h3>
          <p>Running XGBoost two-stage model inferences for {storeId} · {productId}...</p>
        </div>
      ) : error ? (
        <div className="error-panel">
          <Info size={20} />
          <div style={{ flex: 1 }}>
            <strong>Forecast Lookup Notice</strong>
            <p>{error}</p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setProductId('FOODS_3_226')}>
                Try FOODS_3_226
              </button>
              <button onClick={() => setProductId('FOODS_1_004')}>
                Try FOODS_1_004
              </button>
            </div>
          </div>
        </div>
      ) : forecastData ? (
        <>
          {/* Executive Forecast Performance Metrics */}
          <section className="metrics-grid">
            <div className="metric-card">
              <div className="metric-top">
                <span>Mean Absolute Error</span>
                <div className="metric-icon blue">
                  <Target size={18} />
                </div>
              </div>
              <div className="metric-value tabular-nums">{formatNumber(forecastData.mae, 2)}</div>
              <div className="metric-subtitle">
                Average deviation per day in units
              </div>
              <div className="metric-trend positive" style={{ marginTop: '8px' }}>
                <Check size={12} />
                <span>High Precision</span>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-top">
                <span>WAPE Accuracy Score</span>
                <div className="metric-icon emerald">
                  <TrendingUp size={18} />
                </div>
              </div>
              <div className="metric-value tabular-nums">{formatNumber(forecastData.wape, 1)}%</div>
              <div className="metric-subtitle">
                Weighted percentage error across horizon
              </div>
              <div className="metric-trend positive" style={{ marginTop: '8px' }}>
                {forecastData.wape <= 20 ? 'Optimal (<20%)' : 'Standard (<35%)'}
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-top">
                <span>Total 7-Day Forecast</span>
                <div className="metric-icon indigo">
                  <BarChart3 size={18} />
                </div>
              </div>
              <div className="metric-value tabular-nums">{formatNumber(totalDemand, 0)}</div>
              <div className="metric-subtitle">
                Aggregated predicted unit demand
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--color-primary)', fontWeight: 600, marginTop: '8px' }}>
                ~{formatNumber(totalDemand / 7, 1)} units/day
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-top">
                <span>Peak Demand Day</span>
                <div className="metric-icon purple">
                  <Calendar size={18} />
                </div>
              </div>
              <div className="metric-value" style={{ fontSize: '20px' }}>
                {peakDay ? peakDay.date : 'N/A'}
              </div>
              <div className="metric-subtitle">
                Projected peak: {peakDay ? `${formatNumber(peakDay.predicted_sales, 1)} units` : '-'}
              </div>
              <div className="metric-trend" style={{ background: '#f1f5f9', color: '#475569', marginTop: '8px' }}>
                Day {peakDay ? peakDay.forecast_horizon : 1} of 7
              </div>
            </div>
          </section>

          {/* Interactive Forecast Chart */}
          <section className="panel forecast-chart-panel">
            <div className="panel-heading">
              <div>
                <h2>Demand Forecast Trajectory</h2>
                <p>
                  Store: <strong>{storeId}</strong> · SKU: <strong>{productId}</strong> · 7-Day Horizon
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                {/* Series Toggles */}
                <div className="tab-group">
                  <button
                    type="button"
                    className={`tab-btn ${visibleSeries.actual ? 'active' : ''}`}
                    onClick={() => toggleSeries('actual')}
                  >
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#64748b', display: 'inline-block' }} />
                    Actual
                  </button>
                  <button
                    type="button"
                    className={`tab-btn ${visibleSeries.predicted ? 'active' : ''}`}
                    onClick={() => toggleSeries('predicted')}
                  >
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#4f46e5', display: 'inline-block' }} />
                    XGBoost ML
                  </button>
                  <button
                    type="button"
                    className={`tab-btn ${visibleSeries.seasonal ? 'active' : ''}`}
                    onClick={() => toggleSeries('seasonal')}
                  >
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#0284c7', display: 'inline-block' }} />
                    Baseline
                  </button>
                </div>

                <span className="panel-tag">BACKTEST VALIDATION</span>
              </div>
            </div>

            <div style={{ width: '100%', height: 340 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={forecastData.forecasts}
                  margin={{ top: 15, right: 20, left: 0, bottom: 5 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#E2E8F0"
                  />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={{ stroke: '#E2E8F0' }}
                    tick={{ fontSize: 12, fill: '#64748b' }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={{ stroke: '#E2E8F0' }}
                    tick={{ fontSize: 12, fill: '#64748b' }}
                  />
                  <Tooltip content={<CustomForecastTooltip />} />
                  <Legend wrapperStyle={{ paddingTop: '10px' }} />

                  {visibleSeries.actual && (
                    <Line
                      type="monotone"
                      dataKey="actual_sales"
                      name="Actual Sales"
                      stroke="#64748b"
                      strokeWidth={2}
                      dot={{ r: 4, fill: '#64748b' }}
                      activeDot={{ r: 6 }}
                    />
                  )}

                  {visibleSeries.predicted && (
                    <Line
                      type="monotone"
                      dataKey="predicted_sales"
                      name="XGBoost ML Model"
                      stroke="#4f46e5"
                      strokeWidth={3}
                      dot={{ r: 4, fill: '#4f46e5' }}
                      activeDot={{ r: 7 }}
                    />
                  )}

                  {visibleSeries.seasonal && (
                    <Line
                      type="monotone"
                      dataKey="seasonal_prediction"
                      name="Seasonal Naive Baseline"
                      stroke="#0284c7"
                      strokeWidth={2}
                      strokeDasharray="4 4"
                      dot={{ r: 3, fill: '#0284c7' }}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Daily Forecast Breakdown Table */}
          <section className="panel forecast-table-panel">
            <div className="panel-heading">
              <div>
                <h2>Daily Forecast Breakdown</h2>
                <p>Day-by-day actual versus predicted demand comparison</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  type="text"
                  placeholder="Filter by date..."
                  value={tableSearch}
                  onChange={(e) => setTableSearch(e.target.value)}
                  style={{
                    padding: '6px 12px',
                    fontSize: '12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--color-border)',
                    outline: 'none',
                    width: '150px'
                  }}
                />
                <button
                  type="button"
                  className="action-btn"
                  onClick={exportForecastCSV}
                  title="Export Forecast to CSV"
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
                    <th>Date</th>
                    <th>Horizon</th>
                    <th>Actual Demand</th>
                    <th>XGBoost Forecast</th>
                    <th>Seasonal Baseline</th>
                    <th>Variance (Units)</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredForecasts.map((item) => {
                    const variance = Number(item.predicted_sales) - Number(item.actual_sales)
                    const absVariancePct = item.actual_sales > 0 ? (Math.abs(variance) / item.actual_sales) * 100 : 0
                    return (
                      <tr key={item.forecast_horizon}>
                        <td><strong>{item.date}</strong></td>
                        <td>Day {item.forecast_horizon}</td>
                        <td className="tabular-nums">{formatNumber(item.actual_sales, 1)}</td>
                        <td className="tabular-nums" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
                          {formatNumber(item.predicted_sales, 1)}
                        </td>
                        <td className="tabular-nums">{formatNumber(item.seasonal_prediction, 1)}</td>
                        <td className="tabular-nums" style={{ color: variance >= 0 ? '#10b981' : '#ef4444', fontWeight: 600 }}>
                          {variance >= 0 ? `+${formatNumber(variance, 1)}` : formatNumber(variance, 1)}
                        </td>
                        <td>
                          <span className={`risk-badge ${absVariancePct <= 20 ? 'low' : absVariancePct <= 40 ? 'medium' : 'high'}`}>
                            {absVariancePct <= 20 ? 'Accurate' : absVariancePct <= 40 ? 'Moderate' : 'Review'}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* Model Explanation Insight */}
          <div className="insight-card">
            <div className="insight-icon">
              <Sparkles size={18} />
            </div>
            <div className="insight-content">
              <h4>Two-Stage Machine Learning Model Architecture</h4>
              <p>
                Demand predictions are powered by an XGBoost regressor trained with time-series feature engineering (lagged sales, rolling means, day-of-week seasonality, and price elasticity) on the M5 Walmart retail benchmark. Historical backtest evaluation validates accuracy before feeding forecasts to the OR-Tools inventory optimization engine.
              </p>
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}

export default Forecasting
