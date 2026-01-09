import React, { useState, useEffect } from 'react'
import './UserAttendance.css'
import {
  FiCheckCircle,
  FiAlertCircle,
  FiCalendar,
  FiLogOut,
  FiClock,
  FiUser
} from 'react-icons/fi'
import firebaseService from './firebaseService'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

// Convert 24-hour format to 12-hour format
const convertTo12Hour = (time24) => {
  if (!time24) return ''
  const [hours, minutes] = time24.split(':')
  const hour = parseInt(hours, 10)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
  return `${hour12}:${minutes} ${ampm}`
}

// Calculate minutes between two times (HH:MM format)
const calculateMinutesDifference = (startTime, endTime) => {
  if (!startTime || !endTime) return 0
  
  const [startHours, startMinutes] = startTime.split(':').map(Number)
  const [endHours, endMinutes] = endTime.split(':').map(Number)
  
  const startTotalMinutes = startHours * 60 + startMinutes
  const endTotalMinutes = endHours * 60 + endMinutes
  
  return Math.max(0, endTotalMinutes - startTotalMinutes)
}

export default function UserAttendance({ userInfo, onLogout }) {
  const [classes, setClasses] = useState([])
  const [teachers, setTeachers] = useState([])
  const [subjects, setSubjects] = useState([])
  const [selectedClass, setSelectedClass] = useState(null)
  const [timetable, setTimetable] = useState(null)
  const [attendance, setAttendance] = useState({})
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [showSuccess, setShowSuccess] = useState(false)
  const [showError, setShowError] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [showMarkAttendance, setShowMarkAttendance] = useState(false)

  useEffect(() => {
    fetchClasses()
  }, [])

  useEffect(() => {
    if (selectedClass && showMarkAttendance) {
      loadTimetable()
    }
  }, [selectedClass, showMarkAttendance])

  const fetchClasses = async () => {
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

  const loadTimetable = async () => {
    if (!selectedClass) return

    try {
      setFetching(true)
      const result = await firebaseService.get(`timetables/${selectedClass.id}`)

      if (result.success && result.data) {
        setTimetable(result.data)
        // Initialize attendance state
        const initialAttendance = {}
        if (result.data.schedule) {
          DAYS.forEach(day => {
            const dayKey = day.toLowerCase()
            if (result.data.schedule[dayKey]) {
              Object.keys(result.data.schedule[dayKey]).forEach(periodIndex => {
                const key = `${dayKey}_${periodIndex}`
                initialAttendance[key] = {
                  status: null,
                  markedTime: null,
                  minutesMissed: 0
                }
              })
            }
          })
        }
        setAttendance(initialAttendance)
      } else {
        setErrorMessage('No timetable found for this class')
        setShowError(true)
        setTimeout(() => setShowError(false), 3000)
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

  const handleMarkAttendance = (day, periodIndex, status) => {
    const key = `${day.toLowerCase()}_${periodIndex}`
    const now = new Date()
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
    
    // Get period start time
    const period = timetable?.periods?.[periodIndex]
    const periodStartTime = period?.startTime || ''
    
    // Calculate minutes difference between period start time and current time
    // This shows how many minutes after the period start time the attendance was marked
    let minutesMissed = 0
    if (periodStartTime) {
      minutesMissed = calculateMinutesDifference(periodStartTime, currentTime)
      // If marked before period starts, set to 0 (not negative)
      if (minutesMissed < 0) {
        minutesMissed = 0
      }
    }

    setAttendance(prev => ({
      ...prev,
      [key]: {
        status,
        markedTime: currentTime,
        minutesMissed // Calculate and store for both A and P
      }
    }))
  }

  const handleSaveAttendance = async () => {
    if (!selectedClass || !timetable) {
      setErrorMessage('Please select a class first')
      setShowError(true)
      setTimeout(() => setShowError(false), 3000)
      return
    }

    // Check if at least one attendance is marked
    const hasAttendance = Object.values(attendance).some(a => a.status !== null)
    if (!hasAttendance) {
      setErrorMessage('Please mark at least one attendance')
      setShowError(true)
      setTimeout(() => setShowError(false), 3000)
      return
    }

    setLoading(true)
    try {
      const attendanceData = {
        classId: selectedClass.id,
        className: selectedClass.className,
        date: selectedDate,
        markedBy: userInfo?.username || 'Unknown',
        markedAt: new Date().toISOString(),
        attendance: attendance,
        timetable: timetable
      }

      // Save to Firebase under attendance/{classId}/{date}
      const attendanceKey = `${selectedClass.id}_${selectedDate.replace(/-/g, '_')}`
      const result = await firebaseService.push('attendance', attendanceData)

      if (result.success) {
        setShowSuccess(true)
        setErrorMessage('Attendance saved successfully!')
        setTimeout(() => {
          setShowSuccess(false)
          setErrorMessage('')
        }, 3000)
        // Keep attendance data visible after saving - don't reset it
        // The attendance state remains as is so user can see what was saved
      } else {
        setErrorMessage(result.error || 'Failed to save attendance')
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

  // Build schedule rows from timetable - one row per day/period combination
  const buildScheduleRows = () => {
    if (!timetable || !timetable.schedule || !timetable.periods) return []

    const rows = []

    // Iterate through each day
    DAYS.forEach(day => {
      const dayKey = day.toLowerCase()
      const daySchedule = timetable.schedule[dayKey]
      
      if (!daySchedule) return

      // Get all periods for this day, sorted
      const periodIndices = Object.keys(daySchedule)
        .map(Number)
        .sort((a, b) => a - b)

      periodIndices.forEach(periodIndex => {
        const cellData = daySchedule[periodIndex]
        if (!cellData || !cellData.teacherId || !cellData.subjectId) return

        const period = timetable.periods[periodIndex]
        if (!period) return

        const attendanceKey = `${dayKey}_${periodIndex}`
        const attendanceData = attendance[attendanceKey] || { 
          status: null, 
          markedTime: null, 
          minutesMissed: 0 
        }

        rows.push({
          day,
          dayKey,
          periodIndex,
          periodNumber: periodIndex + 1,
          time: `${convertTo12Hour(period.startTime)} - ${convertTo12Hour(period.endTime)}`,
          startTime: period.startTime,
          teacherId: cellData.teacherId,
          subjectId: cellData.subjectId,
          attendance: attendanceData
        })
      })
    })

    return rows
  }

  const scheduleRows = buildScheduleRows()

  return (
    <div className="user-attendance">
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
      <div className="attendance-header">
        <div className="header-info">
          <h2>Mark Attendance</h2>
          <p>Welcome, {userInfo?.username || 'User'}</p>
        </div>
        <button className="logout-btn" onClick={onLogout}>
          <FiLogOut /> Logout
        </button>
      </div>

      {!showMarkAttendance ? (
        <div className="welcome-section">
          <div className="welcome-card">
            <FiUser className="welcome-icon" />
            <h3>Ready to Mark Attendance?</h3>
            <p>Click the button below to start marking attendance for a class</p>
            <button 
              className="mark-attendance-btn"
              onClick={() => setShowMarkAttendance(true)}
            >
              Mark Attendance
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Class Selection and Date */}
          <div className="controls-section">
            <div className="control-group">
              <label>Select Class</label>
              <select
                className="class-selector"
                value={selectedClass?.id || ''}
                onChange={(e) => {
                  const classId = e.target.value
                  const selected = classes.find(c => c.id === classId)
                  setSelectedClass(selected || null)
                }}
                disabled={fetching || loading}
              >
                <option value="">Select a Class</option>
                {classes.map(cls => (
                  <option key={cls.id} value={cls.id}>
                    {cls.className} - {cls.section} ({cls.level})
                  </option>
                ))}
              </select>
            </div>

            <div className="control-group">
              <label>
                <FiCalendar /> Date
              </label>
              <input
                type="date"
                className="date-input"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                disabled={loading}
              />
            </div>

            <button
              className="back-btn"
              onClick={() => {
                setShowMarkAttendance(false)
                setSelectedClass(null)
                setTimetable(null)
                setAttendance({})
              }}
            >
              Back
            </button>
          </div>

          {!selectedClass ? (
            <div className="empty-state">
              <p>Please select a class to view its timetable</p>
            </div>
          ) : fetching ? (
            <div className="empty-state">
              <p>Loading timetable...</p>
            </div>
          ) : !timetable ? (
            <div className="empty-state">
              <p>No timetable found for this class. Please contact admin.</p>
            </div>
          ) : scheduleRows.length === 0 ? (
            <div className="empty-state">
              <p>No schedule data available for this class</p>
            </div>
          ) : (
            <>
              {/* Attendance Table */}
              <div className="table-wrapper">
                <table className="attendance-table">
                  <thead>
                    <tr>
                      <th rowSpan="2">DAYS</th>
                      <th rowSpan="2">CLASSES</th>
                      <th rowSpan="2">TEACHERS</th>
                      <th rowSpan="2">SUBJECTS</th>
                      <th rowSpan="2">NO OF PERIODS</th>
                      <th rowSpan="2">TIME</th>
                      <th rowSpan="2">A/P</th>
                      <th rowSpan="2">MINUTES MISSED</th>
                      <th rowSpan="2">DATE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scheduleRows.map((row, rowIndex) => {
                      // Group consecutive rows with same day and class for rowspan
                      const prevRow = rowIndex > 0 ? scheduleRows[rowIndex - 1] : null
                      const nextRow = rowIndex < scheduleRows.length - 1 ? scheduleRows[rowIndex + 1] : null
                      
                      const isFirstRowForDay = !prevRow || prevRow.day !== row.day
                      const isLastRowForDay = !nextRow || nextRow.day !== row.day
                      
                      // Count how many rows have same day
                      let rowSpan = 1
                      if (isFirstRowForDay) {
                        let count = 1
                        for (let i = rowIndex + 1; i < scheduleRows.length; i++) {
                          if (scheduleRows[i].day === row.day) {
                            count++
                          } else {
                            break
                          }
                        }
                        rowSpan = count
                      }

                      // Get teacher and subject names
                      const teacher = teachers.find(t => t.id === row.teacherId)
                      const subject = subjects.find(s => s.id === row.subjectId)
                      const teacherName = teacher ? teacher.teacherName : 'N/A'
                      const subjectName = subject ? subject.subjectName : 'N/A'

                      return (
                        <tr key={`${row.day}_${row.periodIndex}`}>
                          {isFirstRowForDay && (
                            <td rowSpan={rowSpan}>{row.day}</td>
                          )}
                          {isFirstRowForDay && (
                            <td rowSpan={rowSpan}>{selectedClass.className}</td>
                          )}
                          <td>{teacherName}</td>
                          <td>{subjectName}</td>
                          <td>1</td>
                          {isFirstRowForDay && (
                            <td rowSpan={rowSpan} className="time-cell">
                              {row.time}
                            </td>
                          )}
                          <td className="ap-cell">
                            <div className="ap-buttons">
                              <button
                                className={`ap-btn absent-btn ${row.attendance.status === 'absent' ? 'active' : ''}`}
                                onClick={() => handleMarkAttendance(row.day, row.periodIndex, 'absent')}
                                disabled={loading}
                              >
                                A
                              </button>
                              <button
                                className={`ap-btn present-btn ${row.attendance.status === 'present' ? 'active' : ''}`}
                                onClick={() => handleMarkAttendance(row.day, row.periodIndex, 'present')}
                                disabled={loading}
                              >
                                P
                              </button>
                            </div>
                          </td>
                          <td className="minutes-cell">
                            {row.attendance.status ? row.attendance.minutesMissed : '-'}
                          </td>
                          {isFirstRowForDay && (
                            <td rowSpan={rowSpan} className="date-cell">
                              {selectedDate}
                            </td>
                          )}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Save Button */}
              <div className="save-section">
                <button
                  className="save-attendance-btn"
                  onClick={handleSaveAttendance}
                  disabled={loading}
                >
                  {loading ? 'Saving...' : 'Save Attendance'}
                </button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
