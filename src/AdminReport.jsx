import React, { useState } from 'react'
import './AdminReport.css'
import {
  FiPrinter,
  FiCalendar,
  FiDownload,
  FiRefreshCw,
  FiCheckCircle,
  FiAlertCircle
} from 'react-icons/fi'
import firebaseService from './firebaseService'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export default function AdminReport() {
  const [reportType, setReportType] = useState('daily') // daily, range, monthly
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7))
  const [reportData, setReportData] = useState([])
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(false)
  const [showError, setShowError] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const generateReport = async () => {
    setLoading(true)
    setFetching(true)
    setShowError(false)

    try {
      // Fetch all required data
      const [attendanceResult, teachersResult, timetablesResult, classesResult] = await Promise.all([
        firebaseService.get('attendance'),
        firebaseService.get('teachers'),
        firebaseService.get('timetables'),
        firebaseService.get('classes')
      ])

      // Note: We don't require attendance data - timetables can be processed without attendance
      if (!attendanceResult.success) {
        console.warn('Failed to fetch attendance data:', attendanceResult.error)
      }

      // Get date range based on report type
      let dateRange = []
      if (reportType === 'daily') {
        dateRange = [selectedDate]
      } else if (reportType === 'range') {
        if (!fromDate || !toDate) {
          setErrorMessage('Please select both from and to dates')
          setShowError(true)
          setTimeout(() => setShowError(false), 3000)
          setLoading(false)
          setFetching(false)
          return
        }
        dateRange = getDateRange(fromDate, toDate)
      } else if (reportType === 'monthly') {
        dateRange = getDatesInMonth(selectedMonth)
      }

      // Filter attendance records by date range
      const attendanceRecords = attendanceResult.data 
        ? Object.values(attendanceResult.data).filter(record => {
            if (!record || !record.date) return false
            return dateRange.includes(record.date)
          })
        : []

      // Ensure we have timetable data
      if (!timetablesResult.success || !timetablesResult.data) {
        console.warn('No timetable data found')
        setErrorMessage('No timetable data found. Please configure timetables in Admin Settings.')
        setShowError(true)
        setTimeout(() => setShowError(false), 3000)
        setLoading(false)
        setFetching(false)
        return
      }

      // Process data to calculate statistics per teacher
      const teacherStats = calculateTeacherStatistics(
        attendanceRecords,
        dateRange,
        teachersResult.data || {},
        timetablesResult.data || {},
        classesResult.data || {}
      )


      setReportData(teacherStats)
    } catch (error) {
      console.error('Error generating report:', error)
      setErrorMessage(`Error: ${error.message}`)
      setShowError(true)
      setTimeout(() => setShowError(false), 3000)
    } finally {
      setLoading(false)
      setFetching(false)
    }
  }

  const getDateRange = (start, end) => {
    const dates = []
    const startDate = new Date(start + 'T00:00:00') // Add time to avoid timezone issues
    const endDate = new Date(end + 'T00:00:00')
    
    // Ensure endDate is after startDate
    if (endDate < startDate) {
      return []
    }
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      dates.push(d.toISOString().split('T')[0])
    }
    return dates
  }

  const getDatesInMonth = (yearMonth) => {
    const dates = []
    const [year, month] = yearMonth.split('-')
    const daysInMonth = new Date(parseInt(year), parseInt(month), 0).getDate()
    
    for (let day = 1; day <= daysInMonth; day++) {
      const date = `${year}-${month}-${day.toString().padStart(2, '0')}`
      dates.push(date)
    }
    return dates
  }

  const calculateTeacherStatistics = (attendanceRecords, dateRange, teachers, timetables, classes) => {
    const statsMap = {}

    // Debug: Log inputs
    console.log('=== DEBUG: calculateTeacherStatistics ===')
    console.log('Date range:', dateRange)
    console.log('Timetables:', timetables)
    console.log('Classes:', classes)
    console.log('Teachers:', teachers)
    console.log('Attendance records count:', attendanceRecords.length)

    // STEP 1: Count ASSIGNED PERIODS from ALL timetables (AdminSettings)
    // This is the number of periods teacher is assigned to in the date range
    // Initialize teachers as we find them in timetables
    
    console.log('=== STEP 1: Processing Timetables ===')
    console.log('Number of timetables:', Object.keys(timetables).length)
    console.log('Date range length:', dateRange.length)
    console.log('Date range sample:', dateRange.slice(0, 5))
    
    Object.keys(timetables).forEach(classId => {
      const timetable = timetables[classId]
      
      console.log(`\nProcessing classId: ${classId}`)
      console.log('Timetable structure:', {
        hasSchedule: !!timetable?.schedule,
        scheduleKeys: timetable?.schedule ? Object.keys(timetable.schedule) : [],
        className: timetable?.className
      })
      
      if (!timetable || !timetable.schedule) {
        console.log(`Skipping timetable for classId ${classId}: no schedule`)
        return
      }

      const classData = classes[classId] || {}
      const className = classData.className || timetable.className || 'Unknown'
      
      console.log(`Processing timetable for class: ${className} (${classId})`)

      // Count periods per day of week
      DAYS.forEach(day => {
        const dayKey = day.toLowerCase()
        const daySchedule = timetable.schedule[dayKey]
        
        if (!daySchedule) {
          console.log(`  No schedule for ${day}`)
          return
        }
        
        console.log(`  Processing ${day}: ${Object.keys(daySchedule).length} periods`)

        Object.keys(daySchedule).forEach(periodIndex => {
          const cellData = daySchedule[periodIndex]
          
          if (!cellData) {
            console.log(`    Period ${periodIndex}: no cellData`)
            return
          }
          
          if (!cellData.teacherId) {
            console.log(`    Period ${periodIndex}: no teacherId`)
            return
          }

          const teacherId = cellData.teacherId
          
          // Initialize teacher if not exists
          if (!statsMap[teacherId]) {
            const teacher = teachers[teacherId] || {}
            statsMap[teacherId] = {
              teacherId,
              teacherName: teacher.teacherName || 'Unknown',
              contact: teacher.contact || 'N/A',
              classes: new Set(),
              classesMap: new Map(), // Track periods per class
              totalPeriods: 0,
              totalPeriodsTaught: 0,
              totalPeriodsMissed: 0,
              totalMinutesMissed: 0 // Track total minutes missed
            }
            console.log(`    Initialized teacher: ${teacher.teacherName || 'Unknown'} (${teacherId})`)
          }

          // Count how many times this day appears in the date range
          // JavaScript getDay(): Sunday=0, Monday=1, Tuesday=2, ..., Saturday=6
          // Our DAYS array: Monday=0, Tuesday=1, ..., Saturday=5
          // So conversion is: dayIndex + 1 (Monday index 0 -> JS day 1, etc.)
          const dayIndex = DAYS.indexOf(day)
          if (dayIndex === -1) {
            console.log(`    Invalid day: ${day}`)
            return // Invalid day
          }
          
          const jsDayOfWeek = dayIndex + 1 // Monday=0 -> JS day 1, Saturday=5 -> JS day 6
          
          // Count occurrences of this day in the date range
          const occurrences = dateRange.filter(date => {
            try {
              const d = new Date(date + 'T00:00:00') // Add time to avoid timezone issues
              const dayOfWeek = d.getDay()
              return dayOfWeek === jsDayOfWeek
            } catch (e) {
              console.error(`    Error parsing date ${date}:`, e)
              return false
            }
          }).length

          console.log(`    Teacher ${teacherId} (${statsMap[teacherId].teacherName}) - ${day} Period ${periodIndex}: ${occurrences} occurrences in date range`)

          // Add class to teacher's classes set
          statsMap[teacherId].classes.add(className)
          
          // Track class with period count
          // Use a Map to track periods per class
          if (!statsMap[teacherId].classesMap) {
            statsMap[teacherId].classesMap = new Map()
          }
          
          // Each period assignment counts as 1 period per occurrence of that day in the date range
          // Example: 1 period on Monday, Monday appears 4 times in range = 4 periods
          const currentPeriods = statsMap[teacherId].classesMap.get(className) || 0
          const periodsToAdd = occurrences > 0 ? occurrences : 0
          statsMap[teacherId].classesMap.set(className, currentPeriods + periodsToAdd)
          
          // Add to total periods (each period assignment * number of times that day appears in range)
          // When teacher is set for 1 period, and that day appears N times, it counts as N periods
          if (occurrences > 0) {
            const oldTotal = statsMap[teacherId].totalPeriods
            statsMap[teacherId].totalPeriods += occurrences
            console.log(`      Added ${occurrences} periods. Total: ${oldTotal} -> ${statsMap[teacherId].totalPeriods}`)
          } else {
            console.log(`      No occurrences found for ${day} in date range`)
          }
        })
      })
    })
    
    console.log('\n=== After STEP 1: Teacher Totals ===')
    Object.keys(statsMap).forEach(teacherId => {
      console.log(`${statsMap[teacherId].teacherName}: ${statsMap[teacherId].totalPeriods} assigned periods`)
    })

    // Also initialize teachers from the teachers list that might not be in timetables yet
    Object.keys(teachers).forEach(teacherId => {
      if (!statsMap[teacherId]) {
        const teacher = teachers[teacherId]
        statsMap[teacherId] = {
          teacherId,
          teacherName: teacher.teacherName || 'Unknown',
          contact: teacher.contact || 'N/A',
          classes: new Set(),
          classesMap: new Map(), // Track periods per class
          totalPeriods: 0,
          totalPeriodsTaught: 0,
          totalPeriodsMissed: 0,
          totalMinutesMissed: 0 // Track total minutes missed
        }
      }
    })

    // STEP 2: Count TAUGHT and MISSED periods from attendance records
    // Total Periods Taught = number of periods marked as "present" by users
    // Total Periods Missed = number of periods marked as "absent" by users
    console.log('\n=== Processing Attendance Records ===')
    attendanceRecords.forEach((record, recordIndex) => {
      if (!record.attendance || !record.timetable) {
        console.log(`Skipping record ${recordIndex}: missing attendance or timetable`)
        return
      }

      const timetable = record.timetable
      const attendance = record.attendance
      
      console.log(`Processing attendance record ${recordIndex}: date=${record.date}, classId=${record.classId}`)

      DAYS.forEach(day => {
        const dayKey = day.toLowerCase()
        const daySchedule = timetable.schedule?.[dayKey]
        
        if (!daySchedule) return

        Object.keys(daySchedule).forEach(periodIndex => {
          const cellData = daySchedule[periodIndex]
          if (!cellData || !cellData.teacherId) return

          const teacherId = cellData.teacherId
          
          // Initialize teacher if not exists (shouldn't happen, but safety check)
          if (!statsMap[teacherId]) {
            const teacher = teachers[teacherId] || {}
            statsMap[teacherId] = {
              teacherId,
              teacherName: teacher.teacherName || 'Unknown',
              contact: teacher.contact || 'N/A',
              classes: new Set(),
              classesMap: new Map(), // Track periods per class
              totalPeriods: 0,
              totalPeriodsTaught: 0,
              totalPeriodsMissed: 0,
              totalMinutesMissed: 0 // Track total minutes missed
            }
          }
          
          // Get class name from record
          const classId = record.classId
          const classData = classes[classId] || {}
          const className = classData.className || record.className || 'Unknown'
          
          // Add class to teacher's classes set (from attendance record)
          statsMap[teacherId].classes.add(className)
          
          // Initialize classesMap if not exists
          if (!statsMap[teacherId].classesMap) {
            statsMap[teacherId].classesMap = new Map()
          }
          
          // If class not in map yet, initialize with 0 periods (will be updated from timetable)
          if (!statsMap[teacherId].classesMap.has(className)) {
            statsMap[teacherId].classesMap.set(className, 0)
          }

          // Check attendance status from user-marked attendance
          const attendanceKey = `${dayKey}_${periodIndex}`
          const attendanceData = attendance[attendanceKey]

          if (attendanceData && attendanceData.status) {
            console.log(`  Found attendance: ${dayKey}_${periodIndex} = ${attendanceData.status} for teacher ${teacherId}`)
            if (attendanceData.status === 'present') {
              // Count as taught (present)
              statsMap[teacherId].totalPeriodsTaught++
              console.log(`    Teacher ${teacherId} totalPeriodsTaught now: ${statsMap[teacherId].totalPeriodsTaught}`)
            } else if (attendanceData.status === 'absent') {
              // Count as missed (absent)
              statsMap[teacherId].totalPeriodsMissed++
              // Add minutes missed (if available)
              const minutesMissed = attendanceData.minutesMissed || 0
              statsMap[teacherId].totalMinutesMissed += minutesMissed
              console.log(`    Teacher ${teacherId} totalPeriodsMissed now: ${statsMap[teacherId].totalPeriodsMissed}, minutesMissed: ${minutesMissed}`)
            }
          }
        })
      })
    })

    // Convert to array and calculate percentages
    // Show all teachers that have totalPeriods > 0 (assigned in timetable) OR have attendance records
    console.log('\n=== Final Statistics ===')
    Object.values(statsMap).forEach(stat => {
      console.log(`Teacher: ${stat.teacherName}`)
      console.log(`  Assigned Periods: ${stat.totalPeriods}`)
      console.log(`  Total Periods Taught: ${stat.totalPeriodsTaught}`)
      console.log(`  Total Periods Missed: ${stat.totalPeriodsMissed}`)
      const totalMinutes = stat.totalMinutesMissed || 0
      const hours = Math.floor(totalMinutes / 60)
      const minutes = Math.round(totalMinutes % 60)
      const hoursDisplay = hours > 0 && minutes > 0 
        ? `${hours} hr ${minutes} mins`
        : hours > 0 
        ? `${hours} hr`
        : minutes > 0 
        ? `${minutes} mins`
        : '0 mins'
      console.log(`  Total Minutes Missed: ${totalMinutes} (${hoursDisplay})`)
      console.log(`  Classes: ${Array.from(stat.classes).join(', ')}`)
    })
    
    const statsArray = Object.values(statsMap)
      .filter(stat => {
        // Show if teacher has periods assigned OR has attendance activity
        return stat.totalPeriods > 0 || stat.totalPeriodsTaught > 0 || stat.totalPeriodsMissed > 0
      })
      .map(stat => {
        // Calculate percentage: (Total Periods Taught / Assigned Periods) * 100
        // Percentage is capped at 100% maximum
        let percentageValue = 0
        if (stat.totalPeriods > 0) {
          // Normal case: (taught / assigned) * 100, capped at 100%
          percentageValue = (stat.totalPeriodsTaught / stat.totalPeriods) * 100
          percentageValue = Math.min(100, Math.max(0, percentageValue)) // Cap between 0% and 100%
        } else if (stat.totalPeriodsTaught > 0) {
          // If assigned periods is 0 but there are taught periods, show 100% (capped)
          percentageValue = 100
        } else {
          // If no assigned periods and no taught periods, show 0%
          percentageValue = 0
        }

        const percentageCoverage = percentageValue.toFixed(2)

        let remark = ''
        const percentage = parseFloat(percentageCoverage)
        if (percentage >= 95) {
          remark = 'Excellent'
        } else if (percentage >= 80) {
          remark = 'Good'
        } else if (percentage >= 60) {
          remark = 'Fair'
        } else if (percentage >= 40) {
          remark = 'Poor'
        } else {
          remark = 'Very Poor'
        }

        // Format classes with period counts: "Class1 (5 periods), Class2 (3 periods)"
        const classesList = Array.from(stat.classes).sort().map(cls => {
          const periods = stat.classesMap?.get(cls) || 0
          return periods > 0 ? `${cls} (${periods} periods)` : cls
        }).join(', ') || 'N/A'

        // Convert minutes to hours and minutes format: "X hr Y mins"
        const totalMinutes = stat.totalMinutesMissed || 0
        const hours = Math.floor(totalMinutes / 60)
        const minutes = Math.round(totalMinutes % 60)
        let totalHoursMissed = ''
        if (hours > 0 && minutes > 0) {
          totalHoursMissed = `${hours} hr ${minutes} mins`
        } else if (hours > 0) {
          totalHoursMissed = `${hours} hr`
        } else if (minutes > 0) {
          totalHoursMissed = `${minutes} mins`
        } else {
          totalHoursMissed = '0 mins'
        }

        return {
          ...stat,
          classes: classesList,
          percentageCoverage: `${percentageCoverage}%`,
          totalHoursMissed: totalHoursMissed,
          remark
        }
      })

    // Sort by teacher name
    return statsArray.sort((a, b) => a.teacherName.localeCompare(b.teacherName))
  }

  const handlePrint = () => {
    // Get the report content
    const reportContent = document.getElementById('report-content')
    if (!reportContent) {
      window.print()
      return
    }

    // Create a new window for printing
    const printWindow = window.open('', '_blank')
    const printContent = reportContent.cloneNode(true)
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Attendance Report</title>
          <style>
            @page {
              size: A4 landscape;
              margin: 0.8cm;
            }
            body {
              margin: 0;
              padding: 0;
              font-family: Poppins, system-ui, sans-serif;
              background: white;
            }
            .report-title-section {
              margin-bottom: 20px;
              padding-bottom: 15px;
              border-bottom: 2px solid #e5e7eb;
              text-align: center;
            }
            .report-title-section h1 {
              margin: 0 0 10px 0;
              font-size: 24px;
              color: #1f2937;
            }
            .report-meta {
              display: flex;
              justify-content: center;
              gap: 16px;
              flex-wrap: wrap;
              font-size: 11px;
              color: #6b7280;
            }
            .report-meta p {
              margin: 0;
            }
            .report-meta strong {
              color: #374151;
            }
            .report-table {
              width: 100%;
              border-collapse: collapse;
              font-size: 9px;
              table-layout: fixed;
            }
            .report-table thead {
              background: #f9fafb;
            }
            .report-table th {
              padding: 6px 4px;
              border: 1px solid #e5e7eb;
              font-weight: 600;
              font-size: 8px;
              text-transform: uppercase;
              text-align: left;
            }
            .report-table td {
              padding: 6px 4px;
              border: 1px solid #e5e7eb;
              font-size: 8px;
            }
            .report-table tbody tr:nth-child(even) {
              background: #f9fafb;
            }
            .report-table td:first-child {
              text-align: center;
            }
            .percentage-cell {
              text-align: center;
              font-weight: 600;
            }
            .remark-cell {
              text-align: center;
              font-weight: 500;
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `)
    
    printWindow.document.close()
    
    // Wait for content to load, then print
    setTimeout(() => {
      printWindow.focus()
      printWindow.print()
      printWindow.close()
    }, 250)
  }

  return (
    <div className="admin-report">
      {/* Error Message */}
      {showError && (
        <div className="error-message-toast">
          <FiAlertCircle /> {errorMessage}
        </div>
      )}

      {/* Header */}
      <div className="report-header">
        <div>
          <h2>Attendance Report</h2>
          <p>Generate comprehensive teacher attendance statistics</p>
        </div>
      </div>

      {/* Filters */}
      <div className="report-filters">
        <div className="filter-group">
          <label>Report Type</label>
          <select
            className="filter-select"
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            disabled={loading}
          >
            <option value="daily">Daily</option>
            <option value="range">Date Range</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>

        {reportType === 'daily' && (
          <div className="filter-group">
            <label>
              <FiCalendar /> Date
            </label>
            <input
              type="date"
              className="filter-input"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              disabled={loading}
            />
          </div>
        )}

        {reportType === 'range' && (
          <>
            <div className="filter-group">
              <label>
                <FiCalendar /> From Date
              </label>
              <input
                type="date"
                className="filter-input"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="filter-group">
              <label>
                <FiCalendar /> To Date
              </label>
              <input
                type="date"
                className="filter-input"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                disabled={loading}
              />
            </div>
          </>
        )}

        {reportType === 'monthly' && (
          <div className="filter-group">
            <label>
              <FiCalendar /> Month
            </label>
            <input
              type="month"
              className="filter-input"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              disabled={loading}
            />
          </div>
        )}

        <div className="filter-actions">
          <button
            className="generate-btn"
            onClick={generateReport}
            disabled={loading}
          >
            <FiRefreshCw className={loading ? 'spinning' : ''} />
            {loading ? 'Generating...' : 'Generate Report'}
          </button>
          {reportData.length > 0 && (
            <button className="print-btn" onClick={handlePrint}>
              <FiPrinter /> Print Report
            </button>
          )}
        </div>
      </div>

      {/* Report Table */}
      {fetching ? (
        <div className="loading-state">
          <p>Generating report...</p>
        </div>
      ) : reportData.length === 0 ? (
        <div className="empty-state">
          <p>No data available. Generate a report to view statistics.</p>
        </div>
      ) : (
        <div className="report-container" id="report-container">
          <div className="report-content" id="report-content">
            {/* Report Header */}
            <div className="report-title-section">
              <h1>Teacher Attendance Report</h1>
              <div className="report-meta">
                <p>
                  <strong>Report Type:</strong> {reportType.charAt(0).toUpperCase() + reportType.slice(1)}
                </p>
                {reportType === 'daily' && (
                  <p><strong>Date:</strong> {new Date(selectedDate).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}</p>
                )}
                {reportType === 'range' && (
                  <p>
                    <strong>Period:</strong> {new Date(fromDate).toLocaleDateString()} - {new Date(toDate).toLocaleDateString()}
                  </p>
                )}
                {reportType === 'monthly' && (
                  <p>
                    <strong>Month:</strong> {new Date(selectedMonth + '-01').toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'long' 
                    })}
                  </p>
                )}
                <p><strong>Generated:</strong> {new Date().toLocaleString()}</p>
              </div>
            </div>

            {/* Report Table */}
            <table className="report-table">
              <thead>
                <tr>
                  <th>S/N</th>
                  <th>Name of Teacher</th>
                  <th>Contact</th>
                  <th>Class(es)</th>
                  <th>Assigned Periods</th>
                  <th>Total Periods Taught</th>
                  <th>Total Periods Missed</th>
                  <th>Total Periods Missed (Hours)</th>
                  <th>Justification</th>
                  <th>Percentage Coverage</th>
                  <th>Remark</th>
                </tr>
              </thead>
              <tbody>
                {reportData.map((row, index) => (
                  <tr key={row.teacherId}>
                    <td>{index + 1}</td>
                    <td>{row.teacherName}</td>
                    <td>{row.contact}</td>
                    <td>{row.classes || 'N/A'}</td>
                    <td>{row.totalPeriods}</td>
                    <td>{row.totalPeriodsTaught}</td>
                    <td>{row.totalPeriodsMissed}</td>
                    <td>{row.totalHoursMissed || '0 mins'}</td>
                    <td></td>
                    <td className="percentage-cell">{row.percentageCoverage}</td>
                    <td className="remark-cell">{row.remark}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
