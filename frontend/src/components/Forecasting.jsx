import { useEffect, useState } from 'react'
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
import { RefreshCw, TrendingUp, Target, BarChart3 } from 'lucide-react'
import { getProductForecast } from '../services/api'

function Forecasting() {
  const [storeId, setStoreId] = useState('CA_1')
  const [productId, setProductId] = useState('FOODS_3_226')
  const [forecastData, setForecastData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const loadForecast = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await getProductForecast(storeId, productId)
      setForecastData(response.data)
    } catch (err) {
      setForecastData(null)
      setError(
        err.response?.data?.detail ||
        'Unable to load forecast. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadForecast()
  }, [storeId, productId])

  const formatNumber = (value) =>
    Number(value || 0).toLocaleString('en-IN', {
      maximumFractionDigits: 2
    })

  return (
    <div className="forecast-page">

      {/* Filters */}
      <section className="panel forecast-filters">
        <div>
          <label htmlFor="forecast-store">Select store</label>
          <select
            id="forecast-store"
            value={storeId}
            onChange={(e) => setStoreId(e.target.value)}
          >
            <option value="CA_1">CA_1</option>
            <option value="TX_1">TX_1</option>
            <option value="WI_1">WI_1</option>
          </select>
        </div>

        <div>
          <label htmlFor="forecast-product">Product ID</label>
          <input
            id="forecast-product"
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            placeholder="Enter product ID"
          />
        </div>

        <button
          className="refresh-button"
          onClick={loadForecast}
          disabled={loading}
        >
          <RefreshCw size={16} />
          Refresh forecast
        </button>
      </section>

      {loading ? (
        <div className="message-panel">
          Loading forecast data...
        </div>
      ) : error ? (
        <div className="error-panel">
          <p>{error}</p>
        </div>
      ) : forecastData ? (
        <>
          {/* Performance metrics */}
          <section className="metrics-grid">

            <div className="metric-card">
              <div className="metric-top">
                <span>Mean Absolute Error</span>
                <Target size={19} />
              </div>
              <div className="metric-value">
                {formatNumber(forecastData.mae)}
              </div>
              <div className="metric-subtitle">
                Average prediction error in units
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-top">
                <span>Weighted Absolute Percentage Error</span>
                <TrendingUp size={19} />
              </div>
              <div className="metric-value">
                {formatNumber(forecastData.wape)}%
              </div>
              <div className="metric-subtitle">
                Lower values indicate better accuracy
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-top">
                <span>Forecast horizon</span>
                <BarChart3 size={19} />
              </div>
              <div className="metric-value">
                {forecastData.forecast_horizon} days
              </div>
              <div className="metric-subtitle">
                Historical backtesting period
              </div>
            </div>

          </section>

          {/* Forecast chart */}
          <section className="panel forecast-chart-panel">
            <div className="panel-heading">
              <div>
                <h2>Demand forecast analysis</h2>
                <p>
                  Store: {storeId} · Product: {productId}
                </p>
              </div>
              <span className="panel-tag">7-DAY BACKTEST</span>
            </div>

            <ResponsiveContainer width="100%" height={340}>
              <LineChart
                data={forecastData.forecasts}
                margin={{ top: 15, right: 20, left: 5, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#E9EAED"
                />

                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12 }}
                />

                <YAxis
                  tickLine={false}
                  axisLine={false}
                />

                <Tooltip />
                <Legend />

                <Line
                  type="monotone"
                  dataKey="actual_sales"
                  name="Actual demand"
                  stroke="#64748b"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />

                <Line
                  type="monotone"
                  dataKey="predicted_sales"
                  name="XGBoost prediction"
                  stroke="#CC0000"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                />

                <Line
                  type="monotone"
                  dataKey="seasonal_prediction"
                  name="Seasonal naive baseline"
                  stroke="#2563eb"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </section>

          {/* Forecast table */}
          <section className="panel forecast-table-panel">
            <div className="panel-heading">
              <div>
                <h2>Daily forecast details</h2>
                <p>Actual and predicted units by day</p>
              </div>
            </div>

            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Day</th>
                    <th>Actual</th>
                    <th>XGBoost</th>
                    <th>Seasonal naive</th>
                  </tr>
                </thead>

                <tbody>
                  {forecastData.forecasts.map((item) => (
                    <tr key={item.forecast_horizon}>
                      <td>{item.date}</td>
                      <td>{item.forecast_horizon}</td>
                      <td>{formatNumber(item.actual_sales)}</td>
                      <td>
                        <strong>
                          {formatNumber(item.predicted_sales)}
                        </strong>
                      </td>
                      <td>
                        {formatNumber(item.seasonal_prediction)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <p className="forecast-disclaimer">
            Historical backtesting results using public M5 data.
            These are not live future-demand predictions.
          </p>
        </>
      ) : null}

    </div>
  )
}

export default Forecasting