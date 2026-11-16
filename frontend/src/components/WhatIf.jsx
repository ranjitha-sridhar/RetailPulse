
import { useState } from 'react'
import {
  TrendingUp,
  Calculator,
  Package,
  RefreshCw
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

function WhatIf() {
  const [store, setStore] = useState('CA_1')
  const [product, setProduct] = useState('FOODS_3_226')
  const [uplift, setUplift] = useState(10)
  const [forecast, setForecast] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const runSimulation = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await getProductForecast(store, product)
      setForecast(response.data)
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        'Unable to load forecast. Check the store and product ID.'
      )
      setForecast(null)
    } finally {
      setLoading(false)
    }
  }

  const chartData = forecast?.forecasts.map((item) => ({
    date: item.date.slice(5),
    baseline: Number(item.predicted_sales.toFixed(2)),
    scenario: Number(
      (item.predicted_sales * (1 + uplift / 100)).toFixed(2)
    )
  })) || []

  const baselineDemand = chartData.reduce(
    (sum, item) => sum + item.baseline, 0
  )

  const scenarioDemand = chartData.reduce(
    (sum, item) => sum + item.scenario, 0
  )

  const additionalDemand = scenarioDemand - baselineDemand

  return (
    <div className="whatif-page">
      <div className="page-heading">
        <div>
          <h2>What-if Simulator</h2>
          <p>
            Explore how hypothetical demand changes affect inventory planning.
          </p>
        </div>
      </div>

      <div className="panel simulation-controls">
        <div className="panel-heading">
          <h3>Configure Scenario</h3>
          <span className="panel-tag">Scenario Planning</span>
        </div>

        <div className="simulation-form">
          <div>
            <label>Store</label>
            <select
              value={store}
              onChange={(e) => setStore(e.target.value)}
            >
              <option value="CA_1">CA_1</option>
              <option value="TX_1">TX_1</option>
              <option value="WI_1">WI_1</option>
            </select>
          </div>

          <div>
            <label>Product ID</label>
            <input
              value={product}
              onChange={(e) => setProduct(e.target.value)}
              placeholder="Enter product ID"
            />
          </div>

          <div className="uplift-control">
            <label>Assumed Demand Uplift: {uplift}%</label>
            <input
              type="range"
              min="0"
              max="50"
              step="1"
              value={uplift}
              onChange={(e) => setUplift(Number(e.target.value))}
            />
            <div className="uplift-range">
              <span>0%</span>
              <span>50%</span>
            </div>
          </div>

          <button
            className="primary-button"
            onClick={runSimulation}
            disabled={loading}
          >
            {loading ? (
              <RefreshCw size={16} className="spin" />
            ) : (
              <Calculator size={16} />
            )}
            {loading ? 'Running...' : 'Run Simulation'}
          </button>
        </div>

        {error && <p className="error-panel">{error}</p>}
      </div>

      {forecast && (
        <>
          <div className="metrics-grid">
            <div className="metric-card">
              <div className="metric-top">
                <span>Baseline Demand</span>
                <Package size={18} />
              </div>
              <div className="metric-value">
                {baselineDemand.toFixed(0)}
              </div>
              <div className="metric-subtitle">
                Predicted units over 7 days
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-top">
                <span>Scenario Demand</span>
                <TrendingUp size={18} />
              </div>
              <div className="metric-value">
                {scenarioDemand.toFixed(0)}
              </div>
              <div className="metric-subtitle">
                After assumed {uplift}% uplift
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-top">
                <span>Additional Units</span>
                <Calculator size={18} />
              </div>
              <div className="metric-value">
                +{additionalDemand.toFixed(0)}
              </div>
              <div className="metric-subtitle">
                Extra demand to plan for
              </div>
            </div>
          </div>

          <div className="panel simulation-chart-panel">
            <div className="panel-heading">
              <h3>Baseline vs Scenario Demand</h3>
              <span className="panel-tag">7-Day Comparison</span>
            </div>

            <div className="chart-container">
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar
                    dataKey="baseline"
                    name="Baseline Forecast"
                    fill="#8884d8"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="scenario"
                    name="Scenario Forecast"
                    fill="#cc0000"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}

      <div className="forecast-disclaimer">
        Scenario results are calculated by applying a user-defined percentage
        uplift to the baseline forecast. This is a planning assumption, not a
        model-learned estimate of promotional impact.
      </div>
    </div>
  )
}

export default WhatIf
