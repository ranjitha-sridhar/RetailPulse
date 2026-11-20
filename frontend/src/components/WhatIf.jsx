import { useState, useEffect } from 'react'
import {
  TrendingUp,
  Calculator,
  Package,
  RefreshCw,
  Sparkles,
  AlertCircle,
  ArrowUpRight,
  ShieldAlert,
} from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts'
import { getProductForecast } from '../services/api'

const QUICK_PRODUCTS = [
  'FOODS_3_226',
  'FOODS_1_004',
  'FOODS_1_018',
  'FOODS_1_032',
  'FOODS_1_043'
]

const UPLIFT_PRESETS = [5, 10, 15, 20, 30, 50]

function CustomWhatIfTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    const baseline = payload.find(p => p.dataKey === 'baseline')?.value || 0
    const scenario = payload.find(p => p.dataKey === 'scenario')?.value || 0
    const delta = scenario - baseline

    return (
      <div className="custom-tooltip">
        <div className="label">{label} Demand Scenario</div>
        <div style={{ display: 'grid', gap: '5px', marginTop: '6px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', color: '#666666' }}>
            <span>Baseline forecast:</span>
            <strong style={{ color: '#1A1A1A' }}>{Number(baseline).toFixed(1)} units</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', color: '#C62828' }}>
            <span>Simulated demand:</span>
            <strong style={{ color: '#C62828' }}>{Number(scenario).toFixed(1)} units</strong>
          </div>
          <div style={{ borderTop: '1px solid #E5E5E5', paddingTop: '4px', marginTop: '2px', display: 'flex', justifyContent: 'space-between', gap: '16px', fontSize: '11px', color: '#2E7D32', fontWeight: 600 }}>
            <span>Additional needed:</span>
            <span>+{Number(delta).toFixed(1)} units</span>
          </div>
        </div>
      </div>
    )
  }
  return null
}

function WhatIf() {
  const [store, setStore] = useState('CA_1')
  const [product, setProduct] = useState('FOODS_3_226')
  const [uplift, setUplift] = useState(15)
  const [forecast, setForecast] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const runSimulation = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await getProductForecast(store, product.trim())
      setForecast(response.data)
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        'Unable to load forecast data. Check the store and product ID.'
      )
      setForecast(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    runSimulation()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store, product])

  const chartData = forecast?.forecasts?.map((item) => {
    const baselineVal = Number(item.predicted_sales)
    const scenarioVal = Number(baselineVal * (1 + uplift / 100))
    return {
      date: item.date,
      day: `Day ${item.forecast_horizon}`,
      baseline: Number(baselineVal.toFixed(2)),
      scenario: Number(scenarioVal.toFixed(2)),
      delta: Number((scenarioVal - baselineVal).toFixed(2))
    }
  }) || []

  const baselineDemand = chartData.reduce(
    (sum, item) => sum + item.baseline, 0
  )

  const scenarioDemand = chartData.reduce(
    (sum, item) => sum + item.scenario, 0
  )

  const additionalDemand = scenarioDemand - baselineDemand

  const formatNumber = (val, dec = 0) =>
    Number(val || 0).toLocaleString('en-IN', { maximumFractionDigits: dec })

  return (
    <div className="whatif-page">
      {/* Simulation Controls Panel */}
      <div className="panel simulation-controls">
        <div className="panel-heading">
          <div>
            <h2>Scenario Planning & Sensitivity Analysis</h2>
            <p>
              Simulate promotional surges, seasonal spikes, or supply shocks on 7-day store demand
            </p>
          </div>
          <span className="panel-tag">WHAT-IF ENGINE</span>
        </div>

        <div className="simulation-form">
          <div>
            <label htmlFor="sim-store">Store Location</label>
            <select
              id="sim-store"
              value={store}
              onChange={(e) => setStore(e.target.value)}
            >
              <option value="CA_1">CA_1 (California Store 1)</option>
              <option value="CA_2">CA_2 (California Store 2)</option>
              <option value="TX_1">TX_1 (Texas Store 1)</option>
              <option value="WI_1">WI_1 (Wisconsin Store 1)</option>
            </select>
          </div>

          <div>
            <label htmlFor="sim-product">Product SKU</label>
            <input
              id="sim-product"
              value={product}
              onChange={(e) => setProduct(e.target.value.toUpperCase())}
              placeholder="e.g. FOODS_3_226"
            />
          </div>

          <div className="uplift-control">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label htmlFor="sim-uplift">Assumed Demand Surge</label>
              <strong style={{ color: 'var(--color-primary)', fontSize: '13px' }}>+{uplift}%</strong>
            </div>
            <input
              id="sim-uplift"
              type="range"
              min="0"
              max="50"
              step="1"
              value={uplift}
              onChange={(e) => setUplift(Number(e.target.value))}
            />
            <div className="uplift-range">
              <span>0% (Baseline)</span>
              <span>+25%</span>
              <span>+50% (Peak Surge)</span>
            </div>
          </div>

          <button
            type="button"
            className="primary-button"
            onClick={runSimulation}
            disabled={loading}
          >
            <RefreshCw size={15} className={loading ? 'spin' : ''} />
            {loading ? 'Simulating...' : 'Recalculate'}
          </button>
        </div>

        {/* Quick SKU Chips & Preset Uplifts */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginTop: '16px', paddingTop: '14px', borderTop: '1px solid var(--color-border-light)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 500 }}>
              Quick SKUs:
            </span>
            <div className="chip-group">
              {QUICK_PRODUCTS.map(sku => (
                <button
                  key={sku}
                  type="button"
                  className={`chip ${product === sku ? 'active' : ''}`}
                  onClick={() => setProduct(sku)}
                >
                  {sku}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 500 }}>
              Uplift Presets:
            </span>
            <div className="chip-group">
              {UPLIFT_PRESETS.map(pct => (
                <button
                  key={pct}
                  type="button"
                  className={`chip ${uplift === pct ? 'active' : ''}`}
                  onClick={() => setUplift(pct)}
                >
                  +{pct}%
                </button>
              ))}
            </div>
          </div>
        </div>

        {error && (
          <div className="error-panel" style={{ marginTop: '16px' }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}
      </div>

      {loading ? (
        <div className="message-panel">
          <RefreshCw size={24} className="spin text-indigo-600" style={{ margin: '0 auto 12px' }} />
          <h3>Simulating Demand Shift</h3>
          <p>Evaluating inventory deficit threshold under a +{uplift}% demand scenario...</p>
        </div>
      ) : forecast && (
        <>
          {/* Comparative Impact KPIs */}
          <section className="metrics-grid">
            <div className="metric-card">
              <div className="metric-top">
                <span>Baseline Demand</span>
                <div className="metric-icon blue">
                  <Package size={18} />
                </div>
              </div>
              <div className="metric-value tabular-nums">{formatNumber(baselineDemand, 1)}</div>
              <div className="metric-subtitle">XGBoost ML predicted units (7-day)</div>
            </div>

            <div className="metric-card">
              <div className="metric-top">
                <span>Simulated Scenario Demand</span>
                <div className="metric-icon indigo">
                  <TrendingUp size={18} />
                </div>
              </div>
              <div className="metric-value tabular-nums" style={{ color: 'var(--color-primary)' }}>
                {formatNumber(scenarioDemand, 1)}
              </div>
              <div className="metric-subtitle">
                At +{uplift}% assumed promotional uplift
              </div>
              <div className="metric-trend positive" style={{ marginTop: '8px' }}>
                <ArrowUpRight size={12} />
                <span>+{uplift}% Demand Surge</span>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-top">
                <span>Additional Units Required</span>
                <div className="metric-icon amber">
                  <Calculator size={18} />
                </div>
              </div>
              <div className="metric-value tabular-nums" style={{ color: '#d97706' }}>
                +{formatNumber(additionalDemand, 1)}
              </div>
              <div className="metric-subtitle">
                Extra stock buffer to prevent stockout
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-top">
                <span>Stockout Vulnerability</span>
                <div className="metric-icon red">
                  <ShieldAlert size={18} />
                </div>
              </div>
              <div className="metric-value" style={{ fontSize: '20px' }}>
                {uplift >= 25 ? 'High Risk' : uplift >= 10 ? 'Moderate' : 'Low'}
              </div>
              <div className="metric-subtitle">
                {uplift >= 25 ? 'Safety stock exhausted in ~3 days' : 'Manageable via store transfer'}
              </div>
            </div>
          </section>

          {/* Comparative Chart Panel */}
          <section className="panel simulation-chart-panel">
            <div className="panel-heading">
              <div>
                <h2>Baseline vs Simulated Demand Comparison</h2>
                <p>Day-by-day unit demand trajectory before and after applied uplift</p>
              </div>
              <span className="panel-tag">COMPARATIVE VISUALIZATION</span>
            </div>

            <div style={{ width: '100%', height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 15, right: 20, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis
                    dataKey="day"
                    tickLine={false}
                    axisLine={{ stroke: '#E2E8F0' }}
                    tick={{ fontSize: 12, fill: '#64748b' }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={{ stroke: '#E2E8F0' }}
                    tick={{ fontSize: 12, fill: '#64748b' }}
                  />
                  <Tooltip content={<CustomWhatIfTooltip />} />
                  <Legend wrapperStyle={{ paddingTop: '10px' }} />
                  <Bar
                    dataKey="baseline"
                    name="Baseline ML Forecast"
                    fill="#9E9E9E"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="scenario"
                    name={`Scenario (+${uplift}%)`}
                    fill="#C62828"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Day by Day Breakdown Table */}
          <section className="panel">
            <div className="panel-heading">
              <div>
                <h2>Daily Simulation Breakdown</h2>
                <p>Granular delta between baseline and uplifted planning scenarios</p>
              </div>
            </div>

            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Horizon</th>
                    <th>Baseline Forecast</th>
                    <th>Scenario Demand</th>
                    <th>Required Surge Buffer</th>
                  </tr>
                </thead>
                <tbody>
                  {chartData.map((row) => (
                    <tr key={row.date}>
                      <td><strong>{row.date}</strong></td>
                      <td>{row.day}</td>
                      <td className="tabular-nums">{formatNumber(row.baseline, 1)} units</td>
                      <td className="tabular-nums" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
                        {formatNumber(row.scenario, 1)} units
                      </td>
                      <td className="tabular-nums" style={{ color: '#059669', fontWeight: 600 }}>
                        +{formatNumber(row.delta, 1)} units
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Operational Takeaway */}
          <div className="insight-card">
            <div className="insight-icon">
              <Sparkles size={18} />
            </div>
            <div className="insight-content">
              <h4>Planner Recommendation for +{uplift}% Surge</h4>
              <p>
                To maintain a 95% service level under a +{uplift}% surge ({formatNumber(additionalDemand, 0)} additional units needed for {product} at {store}), consider initiating an inter-store transfer route from surplus stores before triggering high-cost expedited central supplier replenishment.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default WhatIf
