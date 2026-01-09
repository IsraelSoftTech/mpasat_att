import React, { useState } from 'react'
import './Login.css'
import { FiLogIn, FiUser, FiLock } from 'react-icons/fi'
import firebaseService from './firebaseService'

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // First check for hardcoded admin credentials
      if (username === 'admin@account' && password === 'admin@password') {
        setLoading(false)
        onLogin(true, { username: 'admin@account' }, true)
        return
      }

      // Then check Firebase users
      const result = await firebaseService.get('users')
      
      if (result.success && result.data) {
        const users = Object.values(result.data)
        const foundUser = users.find(
          user => user.username === username && user.password === password
        )

        if (foundUser) {
          // User found and password matches
          // TODO: Create user token here (will be added later)
          setLoading(false)
          onLogin(true, { username: foundUser.username, id: foundUser.id }, false)
        } else {
          setLoading(false)
          setError('Invalid username or password')
        }
      } else {
        // No users in database or error fetching
        setLoading(false)
        setError('Invalid username or password')
      }
    } catch (error) {
      console.error('Login error:', error)
      setLoading(false)
      setError('Error connecting to server. Please try again.')
    }
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h2>Attenda</h2>
          <p>Login</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="error-message">{error}</div>}

          <div className="form-group">
            <label>
              <FiUser /> Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label>
              <FiLock /> Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              disabled={loading}
            />
          </div>

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? 'Signing in...' : (
              <>
                <FiLogIn /> Sign In
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
