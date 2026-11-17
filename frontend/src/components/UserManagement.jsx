
import { useState } from 'react'
import { registerUser } from '../services/api'
import { UserPlus, CheckCircle, AlertCircle } from 'lucide-react'

function UserManagement() {
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    role: 'store_manager',
    store_id: ''
  })

  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage('')
    setError('')
    setLoading(true)

    try {
      const payload = {
        ...form,
        store_id: form.store_id.trim() || null
      }

      const response = await registerUser(payload)

      setMessage(
        `${response.data.role === 'admin' ? 'Admin' : 'Store manager'} account created successfully!`
      )

      setForm({
        username: '',
        email: '',
        password: '',
        role: 'store_manager',
        store_id: ''
      })
    } catch (err) {
      setError(
        err.response?.data?.detail || 'Unable to create account.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="user-management">
      <div className="panel user-management-card">
        <div className="panel-heading">
          <div>
            <h2>Create New Account</h2>
            <p>Add administrators and store managers to RetailPulse.</p>
          </div>
          <UserPlus size={24} />
        </div>

        <form onSubmit={handleSubmit} className="user-form">
          <label>Username</label>
          <input
            name="username"
            value={form.username}
            onChange={handleChange}
            placeholder="Enter username"
            minLength={3}
            maxLength={50}
            required
          />

          <label>Email Address</label>
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            placeholder="Enter email address"
            required
          />

          <label>Password</label>
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            placeholder="Minimum 8 characters"
            minLength={8}
            required
          />

          <label>Account Role</label>
          <select
            name="role"
            value={form.role}
            onChange={handleChange}
          >
            <option value="store_manager">Store Manager</option>
            <option value="admin">Administrator</option>
          </select>

          {form.role === 'store_manager' && (
            <>
              <label>Store ID</label>
              <input
                name="store_id"
                value={form.store_id}
                onChange={handleChange}
                placeholder="Enter assigned store ID"
              />
            </>
          )}

          {message && (
            <p className="user-success">
              <CheckCircle size={17} /> {message}
            </p>
          )}

          {error && (
            <p className="user-error">
              <AlertCircle size={17} /> {error}
            </p>
          )}

          <button
            type="submit"
            className="login-button"
            disabled={loading}
          >
            {loading ? 'Creating account...' : 'Create Account'}
            {!loading && <UserPlus size={18} />}
          </button>
        </form>
      </div>
    </div>
  )
}

export default UserManagement
