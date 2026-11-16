
import { useState } from 'react'
import { loginUser } from '../services/api'
import { LockKeyhole, Mail, ArrowRight } from 'lucide-react'

function Login({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await loginUser({ username, password })

      sessionStorage.setItem(
        'retailpulse_token',
        response.data.access_token
      )

      onLogin(response.data.user)
    } catch (err) {
      setError(
        err.response?.data?.detail || 'Login failed. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <div className="login-logo">R</div>
          <h1>RetailPulse</h1>
          <p>Retail Intelligence Platform</p>
        </div>

        <div className="login-heading">
          <h2>Welcome back</h2>
          <p>Sign in to access your retail analytics dashboard.</p>
        </div>

        <form onSubmit={handleSubmit}>
          <label>Username</label>
          <div className="login-input">
            <Mail size={18} />
            <input
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <label>Password</label>
          <div className="login-input">
            <LockKeyhole size={18} />
            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && <p className="login-error">{error}</p>}

          <button
            type="submit"
            className="login-button"
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign in'}
            {!loading && <ArrowRight size={18} />}
          </button>
        </form>

        <p className="login-footer">
          Secure access • RetailPulse Analytics
        </p>
      </div>
    </div>
  )
}

export default Login
