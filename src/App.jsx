import React, { useState } from 'react'
import AdminDash from './AdminDash'
import UserAttendance from './UserAttendance'
import Login from './Login'

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userInfo, setUserInfo] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)

  const handleLogin = (success, user, admin) => {
    setIsAuthenticated(success)
    setUserInfo(user)
    setIsAdmin(admin || false)
  }

  const handleLogout = () => {
    setIsAuthenticated(false)
    setUserInfo(null)
    setIsAdmin(false)
  }

  return (
    <div style={{minHeight: '100vh'}}>
      {isAuthenticated ? (
        isAdmin ? (
          <AdminDash onLogout={handleLogout} />
        ) : (
          <UserAttendance userInfo={userInfo} onLogout={handleLogout} />
        )
      ) : (
        <Login onLogin={handleLogin} />
      )}
    </div>
  )
}
