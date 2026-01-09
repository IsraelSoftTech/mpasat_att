import React, { useState, useEffect } from 'react'
import './Dashboard.css'
import { FiBook, FiFileText, FiUserPlus } from 'react-icons/fi'
import firebaseService from './firebaseService'

export default function Dashboard() {
  const [stats, setStats] = useState({
    classes: 0,
    subjects: 0,
    teachers: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      setLoading(true)
      
      const [classesResult, subjectsResult, teachersResult] = await Promise.all([
        firebaseService.get('classes'),
        firebaseService.get('subjects'),
        firebaseService.get('teachers')
      ])

      setStats({
        classes: classesResult.success && classesResult.data 
          ? Object.keys(classesResult.data).length 
          : 0,
        subjects: subjectsResult.success && subjectsResult.data 
          ? Object.keys(subjectsResult.data).length 
          : 0,
        teachers: teachersResult.success && teachersResult.data 
          ? Object.keys(teachersResult.data).length 
          : 0
      })
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h2>Dashboard Overview</h2>
        <p>Quick statistics and insights</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card stat-card-classes">
          <div className="stat-icon">
            <FiBook />
          </div>
          <div className="stat-content">
            <h3>{loading ? '...' : stats.classes}</h3>
            <p>Total Classes</p>
          </div>
        </div>

        <div className="stat-card stat-card-subjects">
          <div className="stat-icon">
            <FiFileText />
          </div>
          <div className="stat-content">
            <h3>{loading ? '...' : stats.subjects}</h3>
            <p>Total Subjects</p>
          </div>
        </div>

        <div className="stat-card stat-card-teachers">
          <div className="stat-icon">
            <FiUserPlus />
          </div>
          <div className="stat-content">
            <h3>{loading ? '...' : stats.teachers}</h3>
            <p>Registered Teachers</p>
          </div>
        </div>
      </div>
    </div>
  )
}
