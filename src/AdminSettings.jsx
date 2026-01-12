import React, { useState, useEffect } from 'react'
import './AdminSettings.css'
import {
  FiSave,
  FiClock,
  FiPlus,
  FiTrash2,
  FiCheckCircle,
  FiAlertCircle,
  FiEdit2,
  FiX,
  FiUser
} from 'react-icons/fi'
import firebaseService from './firebaseService'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const DEFAULT_PERIODS = [
  { startTime: '07:30', endTime: '08:20' },
  { startTime: '08:20', endTime: '09:10' },
  { startTime: '09:10', endTime: '10:00' },
  { startTime: '10:00', endTime: '10:50' },
  { startTime: '10:50', endTime: '11:40' },
  { startTime: '11:40', endTime: '12:30' },
  { startTime: '12:30', endTime: '13:20' },
  { startTime: '13:20', endTime: '14:10' },
  { startTime: '14:10', endTime: '15:00' },
  { startTime: '15:00', endTime: '15:50' }
]

// Convert 24-hour format (HH:MM) to 12-hour format (h:mm AM/PM)
const convertTo12Hour = (time24) => {
  if (!time24) return ''
  const [hours, minutes] = time24.split(':')
  const hour = parseInt(hours, 10)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
  return `${hour12}:${minutes} ${ampm}`
}

// Convert 12-hour format (h:mm AM/PM) to 24-hour format (HH:MM)
const convertTo24Hour = (time12) => {
  if (!time12) return ''
  // If already in 24h format, return as is
  if (!time12.includes('AM') && !time12.includes('PM')) {
    return time12
  }
  
  const match = time12.match(/(\d+):(\d+)\s*(AM|PM)/i)
  if (!match) return time12
  
  let hour = parseInt(match[1], 10)
  const minutes = match[2]
  const ampm = match[3].toUpperCase()
  
  if (ampm === 'PM' && hour !== 12) {
    hour += 12
  } else if (ampm === 'AM' && hour === 12) {
    hour = 0
  }
  
  return `${hour.toString().padStart(2, '0')}:${minutes}`
}

export default function AdminSettings() {
  const [classes, setClasses] = useState([])
  const [teachers, setTeachers] = useState([])
  const [subjects, setSubjects] = useState([])
  const [selectedClass, setSelectedClass] = useState(null)
  const [periods, setPeriods] = useState(DEFAULT_PERIODS)
  const [schedule, setSchedule] = useState({})
  const [showPeriodModal, setShowPeriodModal] = useState(false)
  const [editingPeriod, setEditingPeriod] = useState(null)
  const [periodForm, setPeriodForm] = useState({ startTime: '', endTime: '' })
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [showSuccess, setShowSuccess] = useState(false)
  const [showError, setShowError] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [teacherPeriodCounts, setTeacherPeriodCounts] = useState({})

  useEffect(() => {
    fetchData()
    loadGeneralPeriods()
  }, [])

  useEffect(() => {
    if (selectedClass) {
      loadTimetable()
    } else {
      setSchedule({})
    }
  }, [selectedClass])

  useEffect(() => {
    if (classes.length > 0 && teachers.length > 0) {
      calculateTeacherPeriodCounts()
    }
  }, [classes, teachers])

  const fetchData = async () => {
    try {
      setFetching(true)
      const [classesResult, teachersResult, subjectsResult] = await Promise.all([
        firebaseService.get('classes'),
        firebaseService.get('teachers'),
        firebaseService.get('subjects')
      ])

      if (classesResult.success && classesResult.data) {
        const classesArray = Object.keys(classesResult.data).map(key => ({
          id: key,
          ...classesResult.data[key]
        }))
        setClasses(classesArray)
      }

      if (teachersResult.success && teachersResult.data) {
        const teachersArray = Object.keys(teachersResult.data).map(key => ({
          id: key,
          ...teachersResult.data[key]
        }))
        setTeachers(teachersArray)
      }

      if (subjectsResult.success && subjectsResult.data) {
        const subjectsArray = Object.keys(subjectsResult.data).map(key => ({
          id: key,
          ...subjectsResult.data[key]
        }))
        setSubjects(subjectsArray)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      setErrorMessage('Error loading data')
      setShowError(true)
      setTimeout(() => setShowError(false), 3000)
    } finally {
      setFetching(false)
    }
  }

  const loadGeneralPeriods = async () => {
    try {
      const result = await firebaseService.get('settings/periods')
      if (result.success && result.data && Array.isArray(result.data)) {
        setPeriods(result.data)
      } else {
        setPeriods(DEFAULT_PERIODS)
      }
    } catch (error) {
      console.error('Error loading periods:', error)
      setPeriods(DEFAULT_PERIODS)
    }
  }

  const saveGeneralPeriods = async (periodsToSave) => {
    try {
      const result = await firebaseService.set('settings/periods', periodsToSave)
      if (!result.success) {
        console.error('Failed to save periods:', result.error)
      }
    } catch (error) {
      console.error('Error saving periods:', error)
    }
  }

  const loadTimetable = async () => {
    if (!selectedClass) return

    try {
      setFetching(true)
      const result = await firebaseService.get(`timetables/${selectedClass.id}`)

      if (result.success && result.data) {
        if (result.data.schedule) {
          setSchedule(result.data.schedule)
        } else {
          // Initialize empty schedule
          const emptySchedule = {}
          DAYS.forEach(day => {
            emptySchedule[day.toLowerCase()] = {}
          })
          setSchedule(emptySchedule)
        }
      } else {
        // Initialize empty schedule for new class
        const emptySchedule = {}
        DAYS.forEach(day => {
          emptySchedule[day.toLowerCase()] = {}
        })
        setSchedule(emptySchedule)
      }
    } catch (error) {
      console.error('Error loading timetable:', error)
      setErrorMessage('Error loading timetable')
      setShowError(true)
      setTimeout(() => setShowError(false), 3000)
    } finally {
      setFetching(false)
    }
  }

  const handleClassChange = (e) => {
    const classId = e.target.value
    const selected = classes.find(c => c.id === classId)
    setSelectedClass(selected || null)
  }

  const handleCellChange = (day, periodIndex, field, value) => {
    setSchedule(prev => {
      const newSchedule = { ...prev }
      if (!newSchedule[day.toLowerCase()]) {
        newSchedule[day.toLowerCase()] = {}
      }
      if (!newSchedule[day.toLowerCase()][periodIndex]) {
        newSchedule[day.toLowerCase()][periodIndex] = {}
      }
      newSchedule[day.toLowerCase()][periodIndex] = {
        ...newSchedule[day.toLowerCase()][periodIndex],
        [field]: value
      }
      return newSchedule
    })
  }

  const handleSave = async () => {
    if (!selectedClass) {
      setErrorMessage('Please select a class first')
      setShowError(true)
      setTimeout(() => setShowError(false), 3000)
      return
    }

    setLoading(true)
    try {
      const timetableData = {
        classId: selectedClass.id,
        className: selectedClass.className,
        schedule: schedule,
        updatedAt: new Date().toISOString()
      }

      const result = await firebaseService.set(`timetables/${selectedClass.id}`, timetableData)

      if (result.success) {
        setShowSuccess(true)
        setErrorMessage('Timetable saved successfully!')
        setTimeout(() => {
          setShowSuccess(false)
          setErrorMessage('')
        }, 3000)
        // Recalculate teacher period counts after saving
        await calculateTeacherPeriodCounts()
      } else {
        setErrorMessage(result.error || 'Failed to save timetable')
        setShowError(true)
        setTimeout(() => setShowError(false), 3000)
      }
    } catch (error) {
      setErrorMessage(`Error: ${error.message}`)
      setShowError(true)
      setTimeout(() => setShowError(false), 3000)
    } finally {
      setLoading(false)
    }
  }

  const handleAddPeriod = () => {
    setEditingPeriod(null)
    setPeriodForm({ startTime: '', endTime: '' })
    setShowPeriodModal(true)
  }

  const handleEditPeriod = (index) => {
    setEditingPeriod(index)
    // Keep in 24h format for the input (HTML time input uses 24h)
    setPeriodForm({
      startTime: periods[index].startTime,
      endTime: periods[index].endTime
    })
    setShowPeriodModal(true)
  }

  const handleDeletePeriod = async (index) => {
    if (periods.length <= 1) {
      setErrorMessage('At least one period is required')
      setShowError(true)
      setTimeout(() => setShowError(false), 3000)
      return
    }

    const newPeriods = periods.filter((_, i) => i !== index)
    setPeriods(newPeriods)
    await saveGeneralPeriods(newPeriods)

    // Remove schedule entries for deleted period
    setSchedule(prev => {
      const newSchedule = { ...prev }
      DAYS.forEach(day => {
        const dayKey = day.toLowerCase()
        if (newSchedule[dayKey]) {
          delete newSchedule[dayKey][index]
          // Shift remaining periods
          const updatedDay = {}
          Object.keys(newSchedule[dayKey]).forEach(key => {
            const keyNum = parseInt(key)
            if (keyNum > index) {
              updatedDay[keyNum - 1] = newSchedule[dayKey][key]
            } else if (keyNum < index) {
              updatedDay[keyNum] = newSchedule[dayKey][key]
            }
          })
          newSchedule[dayKey] = updatedDay
        }
      })
      return newSchedule
    })

    setShowSuccess(true)
    setErrorMessage('Period deleted successfully!')
    setTimeout(() => {
      setShowSuccess(false)
      setErrorMessage('')
    }, 3000)
  }

  const calculateTeacherPeriodCounts = async () => {
    try {
      // Get all timetables
      const timetablesResult = await firebaseService.get('timetables')
      
      if (!timetablesResult.success || !timetablesResult.data) {
        setTeacherPeriodCounts({})
        return
      }

      const counts = {}
      
      // Initialize all teachers with 0 counts
      teachers.forEach(teacher => {
        counts[teacher.id] = {
          teacherId: teacher.id,
          teacherName: teacher.teacherName,
          totalPeriods: 0
        }
      })

      // Count periods for each teacher across all timetables
      Object.keys(timetablesResult.data).forEach(classId => {
        const timetable = timetablesResult.data[classId]
        if (!timetable.schedule) return

        DAYS.forEach(day => {
          const dayKey = day.toLowerCase()
          const daySchedule = timetable.schedule[dayKey]
          if (!daySchedule) return

          Object.keys(daySchedule).forEach(periodIndex => {
            const cellData = daySchedule[periodIndex]
            if (cellData && cellData.teacherId) {
              const teacherId = cellData.teacherId
              if (counts[teacherId]) {
                counts[teacherId].totalPeriods += 1
              } else {
                // Teacher might have been deleted, but still in timetable
                counts[teacherId] = {
                  teacherId: teacherId,
                  teacherName: 'Unknown',
                  totalPeriods: 1
                }
              }
            }
          })
        })
      })

      setTeacherPeriodCounts(counts)
    } catch (error) {
      console.error('Error calculating teacher period counts:', error)
    }
  }

  const handleSavePeriod = async () => {
    if (!periodForm.startTime || !periodForm.endTime) {
      setErrorMessage('Please fill in both start and end times')
      setShowError(true)
      setTimeout(() => setShowError(false), 3000)
      return
    }

    let newPeriods
    if (editingPeriod !== null) {
      // Update existing period
      newPeriods = [...periods]
      newPeriods[editingPeriod] = {
        startTime: periodForm.startTime,
        endTime: periodForm.endTime
      }
    } else {
      // Add new period
      newPeriods = [...periods, {
        startTime: periodForm.startTime,
        endTime: periodForm.endTime
      }]
    }

    setPeriods(newPeriods)
    await saveGeneralPeriods(newPeriods)

    setShowPeriodModal(false)
    setEditingPeriod(null)
    setPeriodForm({ startTime: '', endTime: '' })
    
    setShowSuccess(true)
    setErrorMessage('Periods saved successfully!')
    setTimeout(() => {
      setShowSuccess(false)
      setErrorMessage('')
    }, 3000)
  }

  const getTeacherName = (teacherId) => {
    const teacher = teachers.find(t => t.id === teacherId)
    return teacher ? teacher.teacherName : ''
  }

  const getSubjectName = (subjectId) => {
    const subject = subjects.find(s => s.id === subjectId)
    return subject ? subject.subjectName : ''
  }

  return (
    <div className="admin-settings">
      {/* Success Message */}
      {showSuccess && (
        <div className="success-message">
          <FiCheckCircle /> {errorMessage || 'Operation successful!'}
        </div>
      )}

      {/* Error Message */}
      {showError && (
        <div className="error-message-toast">
          <FiAlertCircle /> {errorMessage}
        </div>
      )}

      {/* Header */}
      <div className="settings-header">
        <div>
          <h2>Timetable Settings</h2>
          <p>Configure class schedules and period times</p>
        </div>
        <div className="header-actions">
          <select
            className="class-selector"
            value={selectedClass?.id || ''}
            onChange={handleClassChange}
            disabled={fetching || loading}
          >
            <option value="">Select a Class</option>
            {classes.map(cls => (
              <option key={cls.id} value={cls.id}>
                {cls.className} - {cls.section} ({cls.level})
              </option>
            ))}
          </select>
          {selectedClass && (
            <button className="save-btn" onClick={handleSave} disabled={loading}>
              <FiSave /> {loading ? 'Saving...' : 'Save Timetable'}
            </button>
          )}
        </div>
      </div>

      {/* Period Configuration - Always visible */}
      <div className="periods-section">
        <div className="section-header">
          <h3>
            <FiClock /> Period Times (General Settings)
          </h3>
          <button className="add-period-btn" onClick={handleAddPeriod}>
            <FiPlus /> Add Period
          </button>
        </div>
        <div className="periods-list">
          {periods.map((period, index) => (
            <div key={index} className="period-item">
              <span className="period-number">Period {index + 1}</span>
              <span className="period-time">
                {convertTo12Hour(period.startTime)} - {convertTo12Hour(period.endTime)}
              </span>
              <div className="period-actions">
                <button
                  className="edit-period-btn"
                  onClick={() => handleEditPeriod(index)}
                  title="Edit"
                >
                  <FiEdit2 />
                </button>
                <button
                  className="delete-period-btn"
                  onClick={() => handleDeletePeriod(index)}
                  title="Delete"
                >
                  <FiTrash2 />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Teacher Period Counts */}
      <div className="teacher-periods-section">
        <div className="section-header">
          <h3>
            <FiUser /> Teacher Period Assignments
          </h3>
        </div>
        <div className="table-container">
          <table className="teacher-periods-table">
            <thead>
              <tr>
                <th>Teacher Name</th>
                <th>Total Assigned Periods</th>
              </tr>
            </thead>
            <tbody>
              {teachers.length === 0 ? (
                <tr>
                  <td colSpan="2" className="empty-state-cell">
                    No teachers registered
                  </td>
                </tr>
              ) : (
                teachers.map(teacher => {
                  const count = teacherPeriodCounts[teacher.id]?.totalPeriods || 0
                  return (
                    <tr key={teacher.id}>
                      <td><strong>{teacher.teacherName}</strong></td>
                      <td>
                        <span className="period-count-badge">{count}</span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {!selectedClass ? (
        <div className="empty-state">
          <p>Please select a class to configure its timetable</p>
        </div>
      ) : fetching ? (
        <div className="empty-state">
          <p>Loading timetable...</p>
        </div>
      ) : (
        <>

          {/* Timetable Table */}
          <div className="timetable-section">
            <h3>Weekly Schedule - {selectedClass.className}</h3>
            <div className="table-container">
              <table className="timetable-table">
                <thead>
                  <tr>
                    <th className="period-col">Period</th>
                    {DAYS.map(day => (
                      <th key={day}>{day}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {periods.map((period, periodIndex) => (
                    <tr key={periodIndex}>
                      <td className="period-cell">
                        <div className="period-info">
                          <span className="period-num">P{periodIndex + 1}</span>
                          <span className="period-time-small">
                            {convertTo12Hour(period.startTime)} - {convertTo12Hour(period.endTime)}
                          </span>
                        </div>
                      </td>
                      {DAYS.map(day => {
                        const dayKey = day.toLowerCase()
                        const cellData = schedule[dayKey]?.[periodIndex] || {}
                        return (
                          <td key={day} className="schedule-cell">
                            <div className="cell-content">
                              <select
                                className="teacher-select"
                                value={cellData.teacherId || ''}
                                onChange={(e) => handleCellChange(day, periodIndex, 'teacherId', e.target.value)}
                              >
                                <option value="">Select Teacher</option>
                                {teachers.map(teacher => (
                                  <option key={teacher.id} value={teacher.id}>
                                    {teacher.teacherName}
                                  </option>
                                ))}
                              </select>
                              <select
                                className="subject-select"
                                value={cellData.subjectId || ''}
                                onChange={(e) => handleCellChange(day, periodIndex, 'subjectId', e.target.value)}
                              >
                                <option value="">Select Subject</option>
                                {subjects.map(subject => (
                                  <option key={subject.id} value={subject.id}>
                                    {subject.subjectName}
                                  </option>
                                ))}
                              </select>
                              {cellData.teacherId && cellData.subjectId && (
                                <div className="cell-preview">
                                  <span className="teacher-preview">
                                    {getTeacherName(cellData.teacherId)}
                                  </span>
                                  <span className="subject-preview">
                                    {getSubjectName(cellData.subjectId)}
                                  </span>
                                </div>
                              )}
                            </div>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Period Modal */}
      {showPeriodModal && (
        <div className="modal-overlay" onClick={() => setShowPeriodModal(false)}>
          <div className="modal-content period-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingPeriod !== null ? 'Edit Period' : 'Add New Period'}</h3>
              <button className="modal-close" onClick={() => setShowPeriodModal(false)}>
                <FiX />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Start Time</label>
                <input
                  type="time"
                  value={periodForm.startTime}
                  onChange={(e) => setPeriodForm({ ...periodForm, startTime: e.target.value })}
                />
                {periodForm.startTime && (
                  <span className="time-preview">
                    {convertTo12Hour(periodForm.startTime)}
                  </span>
                )}
              </div>
              <div className="form-group">
                <label>End Time</label>
                <input
                  type="time"
                  value={periodForm.endTime}
                  onChange={(e) => setPeriodForm({ ...periodForm, endTime: e.target.value })}
                />
                {periodForm.endTime && (
                  <span className="time-preview">
                    {convertTo12Hour(periodForm.endTime)}
                  </span>
                )}
              </div>
            </div>
            <div className="form-actions">
              <button className="cancel-btn" onClick={() => setShowPeriodModal(false)}>
                Cancel
              </button>
              <button className="submit-btn" onClick={handleSavePeriod}>
                {editingPeriod !== null ? 'Update' : 'Add'} Period
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
