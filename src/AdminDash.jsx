/* cSpell:ignore admindash topbar Attenda */
import React, { useState } from 'react'
import './AdminDash.css'
import AdminClass from './AdminClass'
import AdminSubject from './AdminSubject'
import AdminTeacher from './AdminTeacher'
import AdminUsers from './AdminUsers'
import AdminSettings from './AdminSettings'
import AdminReport from './AdminReport'
import Dashboard from './Dashboard'
import {
  FiHome,
  FiBook,
  FiFileText,
  FiSettings,
  FiBarChart2,
  FiLogOut,
  FiUser,
  FiMenu,
  FiX,
  FiUserPlus,
  FiUsers
} from 'react-icons/fi'

export default function AdminDash({ onLogout }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [activeMenu, setActiveMenu] = useState('dashboard')

  return (
    <div className="admindash">

      {/* Mobile menu button */}
      <button
        className="menu-toggle"
        onClick={() => setMenuOpen(!menuOpen)}
      >
        {menuOpen ? <FiX /> : <FiMenu />}
      </button>

      {/* Sidebar */}
      <aside className={`sidebar ${menuOpen ? 'open' : ''}`}>
        <div className="logo">
          <h3>Attenda</h3>
          <span>Admin dashboard</span>
        </div>

        <nav className="nav">
          <a 
            className={activeMenu === 'dashboard' ? 'active' : ''}
            onClick={() => setActiveMenu('dashboard')}
          >
            <FiHome /> Dashboard
          </a>
          <a 
            className={activeMenu === 'classes' ? 'active' : ''}
            onClick={() => setActiveMenu('classes')}
          >
            <FiBook /> Classes
          </a>
          <a 
            className={activeMenu === 'subjects' ? 'active' : ''}
            onClick={() => setActiveMenu('subjects')}
          >
            <FiFileText /> Subjects
          </a>
          <a 
            className={activeMenu === 'teachers' ? 'active' : ''}
            onClick={() => setActiveMenu('teachers')}
          >
            <FiUserPlus /> Teacher Registration
          </a>
          <a 
            className={activeMenu === 'settings' ? 'active' : ''}
            onClick={() => setActiveMenu('settings')}
          >
            <FiSettings /> Settings
          </a>
          <a 
            className={activeMenu === 'users' ? 'active' : ''}
            onClick={() => setActiveMenu('users')}
          >
            <FiUsers /> Users
          </a>
          <a 
            className={activeMenu === 'report' ? 'active' : ''}
            onClick={() => setActiveMenu('report')}
          >
            <FiBarChart2 /> Report
          </a>
        </nav>
      </aside>

      {/* Main */}
      <main className="content" onClick={() => setMenuOpen(false)}>

        {/* Topbar */}
        <div className="topbar">
          <div></div>

          <div className="actions">
            <button className="admin-btn">
              <FiUser /> Admin
            </button>
            <button className="logout-btn" onClick={onLogout}>
              <FiLogOut /> Logout
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="content-area">
          {activeMenu === 'dashboard' && <Dashboard />}
          {activeMenu === 'classes' && <AdminClass />}
          {activeMenu === 'subjects' && <AdminSubject />}
          {activeMenu === 'teachers' && <AdminTeacher />}
          {activeMenu === 'settings' && <AdminSettings />}
          {activeMenu === 'users' && <AdminUsers />}
          {activeMenu === 'report' && <AdminReport />}
        </div>
      </main>
    </div>
  )
}
