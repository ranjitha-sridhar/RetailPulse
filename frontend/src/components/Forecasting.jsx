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
  Info,
  Store,
  AlertCircle
} from 'lucide-react'
import { getProductForecast, getForecastStores } from '../services/api'

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
    const diff = (predicted !== undefined && actual !== null && actual !== undefined) ? predicted - actual : null
    const diffPct = (actual && diff !== null) ? ((diff / actual) * 100).toFixed(1) : null

    return (
      <div className="custom-tooltip">
        <div className="label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Calendar size={13} style={{ color: '#C62828' }} />
          <span>{label}</span>
        </div>
        <div style={{ display: 'grid', gap: '5px', marginTop: '6px' }}>
          {actual !== null && actual !== undefined && (
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', color: '#666666' }}>
              <span>Actual sales:</span>
              <strong style={{ color: '#1A1A1A' }}>{Number(actual).toFixed(1)} units</strong>
            </div>
          )}
          {predicted !== undefined && (
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', color: '#C62828' }}>
              <span>XGBoost ML forecast:</span>
              <strong style={{ color: '#C62828' }}>{Number(predicted).toFixed(1)} units</strong>
            </div>
          )}
          {baseline !== undefined && actual !== null && (
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', color: '#9E9E9E' }}>
              <span>Seasonal baseline:</span>
              <strong style={{ color: '#666666' }}>{Number(baseline).toFixed(1)} units</strong>
            </div>
          )}
          {diff !== null && (
            <div style={{ borderTop: '1px solid #E5E5E5', paddingTop: '4px', marginTop: '2px', display: 'flex', justifyContent: 'space-between', gap: '16px', fontSize: '11px' }}>
              <span>Variance:</span>
              <span style={{ color: diff >= 0 ? '#2E7D32' : '#C62828', fontWeight: 600 }}>
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

export default function Forecasting({ initialStore = 'CA_1', initialProduct = 'FOODS_3_226' }) {
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
    loadForecast()
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
    const headers = ['Store', 'Product', 'Date', 'Day Horizon', 'Actual Sales', 'XGBoost Prediction', 'Seasonal Baseline']
    const rows = forecastData.forecasts.map(f => [
      storeId,
      productId,
      f.date,
      f.forecast_horizon,
      f.actual_sales ?? 'N/A',
      Number(f.predicted_sales).toFixed(2),
      Number(f.seasonal_prediction).toFixed(2)
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* Top Filter & Store Selector */}
      <section className="panel" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '16px', flexWrap: 'wrap' }}>
          <div>
            <label htmlFor="forecast-store" style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
              Select Regional Store (4 Available)
            </label>
            <select
              id="forecast-store"
              value={storeId}
              onChange={(e) => setStoreId(e.target.value)}
              style={{
                padding: '9px 12px',
                fontSize: '13px',
                borderRadius: 'var(--radius-md)',
                border: '1.5px solid var(--color-border)',
                background: 'var(--color-surface)',
                outline: 'none',
                minWidth: '220px'
              }}
            >
              <option value="CA_1">CA_1 (California Store 1 - Historical)</option>
              <option value="CA_2">CA_2 (California Store 2 - Expansion)</option>
              <option value="TX_1">TX_1 (Texas Store 1 - Historical)</option>
              <option value="WI_1">WI_1 (Wisconsin Store 1 - Historical)</option>
            </select>
          </div>

          <div style={{ flex: '1 1 240px' }}>
            <label htmlFor="forecast-product" style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
              Product SKU ID
            </label>
            <input
              id="forecast-product"
              value={productId}
              onChange={(e) => setProductId(e.target.value.toUpperCase())}
              placeholder="e.g. FOODS_3_226"
              style={{
                width: '100%',
                padding: '9px 12px',
                fontSize: '13px',
                borderRadius: 'var(--radius-md)',
                border: '1.5px solid var(--color-border)',
                background: 'var(--color-surface)',
                outline: 'none'
              }}
            />
          </div>

          <button
            type="button"
            className="refresh-button"
            onClick={loadForecast}
            disabled={loading}
            style={{ height: '40px' }}
          >
            <RefreshCw size={15} className={loading ? 'spin' : ''} />
            {loading ? 'Generating...' : 'Refresh Forecast'}
          </button>
        </div>

        {/* Quick SKU Chips */}
        <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid var(--color-border-light)' }}>
          <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '6px', fontWeight: 500 }}>
            Quick select top historical SKUs:
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

      {/* CA_2 Expansion Node Info Banner */}
      {storeId === 'CA_2' && (
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            padding: '14px 18px',
            background: 'var(--color-info-bg)',
            border: '1px solid rgba(21, 101, 192, 0.2)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-info-text)'
          }}
        >
          <Info size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
          <div style={{ fontSize: '12.5px', lineHeight: 1.5 }}>
            <strong>Store CA_2 Expansion Store:</strong> Showing operational 7-day demand projections calibrated for inter-store inventory transfer optimization. Historical M5 backtest ground truth is retained for CA_1, TX_1, and WI_1.
          </div>
        </div>
      )}

      {loading ? (
        <div className="message-panel">
          <RefreshCw size={24} className="spin" style={{ margin: '0 auto 12px', color: 'var(--color-primary)' }} />
          <h3>Generating Demand Forecast</h3>
          <p>Running XGBoost 7-day model inferences for {storeId} · {productId}...</p>
        </div>
      ) : error ? (
        <div className="error-panel">
          <AlertCircle size={20} />
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
          {/* Executive Forecast Metrics */}
          <section className="metrics-grid">
            <div className="metric-card">
              <div className="metric-top">
                <span>Mean Absolute Error</span>
                <div className="metric-icon grey">
                  <Target size={18} />
                </div>
              </div>
              <div className="metric-value tabular-nums">
                {forecastData.mae !== null ? formatNumber(forecastData.mae, 2) : 'N/A'}
              </div>
              <div className="metric-subtitle">
                {forecastData.has_historical_evaluation ? 'Average error per day in units' : 'Expansion node (simulated)'}
              </div>
              <div className="metric-trend positive" style={{ marginTop: '8px' }}>
                <Check size={12} />
                <span>{forecastData.has_historical_evaluation ? 'Validated on M5' : 'Active Projection'}</span>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-top">
                <span>WAPE Accuracy Score</span>
                <div className="metric-icon red">
                  <TrendingUp size={18} />
                </div>
              </div>
              <div className="metric-value tabular-nums" style={{ color: 'var(--color-primary)' }}>
                {forecastData.wape !== null ? `${formatNumber(forecastData.wape, 1)}%` : 'N/A'}
              </div>
              <div className="metric-subtitle">
                {forecastData.has_historical_evaluation ? 'Weighted percentage error' : 'Ground truth pending ingestion'}
              </div>
              <div className="metric-trend positive" style={{ marginTop: '8px' }}>
                {forecastData.has_historical_evaluation ? 'Benchmark Grade' : 'Configured'}
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-top">
                <span>7-Day Aggregated Demand</span>
                <div className="metric-icon grey">
                  <BarChart3 size={18} />
                </div>
              </div>
              <div className="metric-value tabular-nums">
                {formatNumber(totalDemand, 0)}
              </div>
              <div className="metric-subtitle">
                Total predicted demand units
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--color-primary)', fontWeight: 600, marginTop: '8px' }}>
                ~{formatNumber(totalDemand / 7, 1)} units/day
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-top">
                <span>Peak Demand Day</span>
                <div className="metric-icon red">
                  <Calendar size={18} />
                </div>
              </div>
              <div className="metric-value" style={{ fontSize: '18px' }}>
                {peakDay ? peakDay.date : 'N/A'}
              </div>
              <div className="metric-subtitle">
                Peak expected: {peakDay ? `${formatNumber(peakDay.predicted_sales, 1)} units` : '-'}
              </div>
              <div className="metric-trend neutral" style={{ marginTop: '8px' }}>
                Day {peakDay ? peakDay.forecast_horizon : 1} of 7
              </div>
            </div>
          </section>

          {/* Interactive Line Chart (Red & Grey Theme) */}
          <section className="panel" style={{ padding: '22px' }}>
            <div className="panel-heading">
              <div>
                <h2>Demand Forecast Trajectory</h2>
                <p>
                  Store: <strong>{storeId}</strong> · SKU: <strong>{productId}</strong> · 7-Day Planning Horizon
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <div className="tab-group">
                  {forecastData.has_historical_evaluation && (
                    <button
                      type="button"
                      className={`tab-btn ${visibleSeries.actual ? 'active' : ''}`}
                      onClick={() => toggleSeries('actual')}
                    >
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#333333', display: 'inline-block' }} />
                      Actual Sales
                    </button>
                  )}
                  <button
                    type="button"
                    className={`tab-btn ${visibleSeries.predicted ? 'active' : ''}`}
                    onClick={() => toggleSeries('predicted')}
                  >
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#C62828', display: 'inline-block' }} />
                    XGBoost Demand
                  </button>
                  {forecastData.has_historical_evaluation && (
                    <button
                      type="button"
                      className={`tab-btn ${visibleSeries.seasonal ? 'active' : ''}`}
                      onClick={() => toggleSeries('seasonal')}
                    >
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#9E9E9E', display: 'inline-block' }} />
                      Seasonal Baseline
                    </button>
                  )}
                </div>

                <span className="panel-tag">
                  {forecastData.has_historical_evaluation ? 'HISTORICAL BACKTEST' : 'OPERATIONAL FORECAST'}
                </span>
              </div>
            </div>

            <div style={{ width: '100%', height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={forecastData.forecasts}
                  margin={{ top: 15, right: 20, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E5E5" />
                  <XAxis dataKey="date" tickLine={false} axisLine={{ stroke: '#E5E5E5' }} tick={{ fontSize: 12, fill: '#666666' }} />
                  <YAxis tickLine={false} axisLine={{ stroke: '#E5E5E5' }} tick={{ fontSize: 12, fill: '#666666' }} />
                  <Tooltip content={<CustomForecastTooltip />} />
                  <Legend wrapperStyle={{ paddingTop: '10px' }} />

                  {visibleSeries.actual && forecastData.has_historical_evaluation && (
                    <Line
                      type="monotone"
                      dataKey="actual_sales"
                      name="Actual Sales"
                      stroke="#333333"
                      strokeWidth={2}
                      dot={{ r: 4, fill: '#333333' }}
                      activeDot={{ r: 6 }}
                    />
                  )}

                  {visibleSeries.predicted && (
                    <Line
                      type="monotone"
                      dataKey="predicted_sales"
                      name="XGBoost ML Forecast"
                      stroke="#C62828"
                      strokeWidth={3}
                      dot={{ r: 4, fill: '#C62828' }}
                      activeDot={{ r: 7 }}
                    />
                  )}

                  {visibleSeries.seasonal && forecastData.has_historical_evaluation && (
                    <Line
                      type="monotone"
                      dataKey="seasonal_prediction"
                      name="Seasonal Naive Baseline"
                      stroke="#9E9E9E"
                      strokeWidth={2}
                      strokeDasharray="4 4"
                      dot={{ r: 3, fill: '#9E9E9E' }}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Daily Forecast Breakdown Table */}
          <section className="panel" style={{ padding: '22px' }}>
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
                    const hasActual = item.actual_sales !== null && item.actual_sales !== undefined
                    const variance = hasActual ? Number(item.predicted_sales) - Number(item.actual_sales) : null
                    const absVariancePct = (hasActual && item.actual_sales > 0)
                      ? (Math.abs(variance) / item.actual_sales) * 100
                      : 0

                    return (
                      <tr key={item.forecast_horizon}>
                        <td><strong>{item.date}</strong></td>
                        <td>Day {item.forecast_horizon}</td>
                        <td className="tabular-nums">
                          {hasActual ? formatNumber(item.actual_sales, 1) : '—'}
                        </td>
                        <td className="tabular-nums" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
                          {formatNumber(item.predicted_sales, 1)}
                        </td>
                        <td className="tabular-nums">
                          {formatNumber(item.seasonal_prediction, 1)}
                        </td>
                        <td className="tabular-nums">
                          {variance !== null ? (
                            <span style={{ color: variance >= 0 ? 'var(--color-healthy)' : 'var(--color-shortage)', fontWeight: 600 }}>
                              {variance >= 0 ? `+${formatNumber(variance, 1)}` : formatNumber(variance, 1)}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--color-text-muted)' }}>—</span>
                          )}
                        </td>
                        <td>
                          {hasActual ? (
                            <span className={`risk-badge ${absVariancePct <= 20 ? 'low' : absVariancePct <= 40 ? 'medium' : 'high'}`}>
                              {absVariancePct <= 20 ? 'Accurate' : absVariancePct <= 40 ? 'Moderate' : 'Review'}
                            </span>
                          ) : (
                            <span className="risk-badge low">Active Projection</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : null}
    </div>
  )
}
