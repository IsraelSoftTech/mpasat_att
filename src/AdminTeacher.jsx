import React, { useState, useEffect } from 'react'
import './AdminTeacher.css'
import {
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiX,
  FiCheckCircle,
  FiAlertCircle,
  FiSearch,
  FiUser
} from 'react-icons/fi'
import firebaseService from './firebaseService'

export default function AdminTeacher() {
  const [teachers, setTeachers] = useState([])
  const [classes, setClasses] = useState([])
  const [subjects, setSubjects] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [teacherToDelete, setTeacherToDelete] = useState(null)
  const [editingTeacher, setEditingTeacher] = useState(null)
  const [showSuccess, setShowSuccess] = useState(false)
  const [showError, setShowError] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [subjectSearch, setSubjectSearch] = useState('')
  const [classSearch, setClassSearch] = useState('')
  const [showSubjectDropdown, setShowSubjectDropdown] = useState(false)
  const [showClassDropdown, setShowClassDropdown] = useState(false)
  const [formData, setFormData] = useState({
    teacherName: '',
    sex: '',
    contact: '',
    selectedSubjects: [],
    section: '',
    selectedClasses: []
  })

  // Fetch data on component mount
  useEffect(() => {
    fetchTeachers()
    fetchClasses()
    fetchSubjects()
  }, [])

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.search-dropdown')) {
        setShowSubjectDropdown(false)
        setShowClassDropdown(false)
      }
    }

    if (showSubjectDropdown || showClassDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showSubjectDropdown, showClassDropdown])

  const fetchTeachers = async () => {
    try {
      setFetching(true)
      const result = await firebaseService.get('teachers')
      
      if (result.success) {
        if (result.data) {
          const teachersArray = Object.keys(result.data).map(key => ({
            id: key,
            ...result.data[key]
          }))
          setTeachers(teachersArray)
        } else {
          setTeachers([])
        }
      } else {
        setErrorMessage(result.error || 'Failed to fetch teachers')
        setShowError(true)
        setTimeout(() => setShowError(false), 3000)
      }
    } catch (error) {
      console.error('Fetch error:', error)
      setErrorMessage(`Error connecting to database: ${error.message}`)
      setShowError(true)
      setTimeout(() => setShowError(false), 3000)
    } finally {
      setFetching(false)
    }
  }

  const fetchClasses = async () => {
    try {
      const result = await firebaseService.get('classes')
      if (result.success && result.data) {
        const classesArray = Object.keys(result.data).map(key => ({
          id: key,
          ...result.data[key]
        }))
        setClasses(classesArray)
      }
    } catch (error) {
      console.error('Error fetching classes:', error)
    }
  }

  const fetchSubjects = async () => {
    try {
      const result = await firebaseService.get('subjects')
      if (result.success && result.data) {
        const subjectsArray = Object.keys(result.data).map(key => ({
          id: key,
          ...result.data[key]
        }))
        setSubjects(subjectsArray)
      }
    } catch (error) {
      console.error('Error fetching subjects:', error)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubjectToggle = (subjectId) => {
    setFormData(prev => {
      const isSelected = prev.selectedSubjects.includes(subjectId)
      return {
        ...prev,
        selectedSubjects: isSelected
          ? prev.selectedSubjects.filter(id => id !== subjectId)
          : [...prev.selectedSubjects, subjectId]
      }
    })
    // Keep dropdown open for multiple selections
  }

  const handleClassToggle = (classId) => {
    setFormData(prev => {
      const isSelected = prev.selectedClasses.includes(classId)
      return {
        ...prev,
        selectedClasses: isSelected
          ? prev.selectedClasses.filter(id => id !== classId)
          : [...prev.selectedClasses, classId]
      }
    })
    // Keep dropdown open for multiple selections
  }

  const removeSubject = (subjectId) => {
    setFormData(prev => ({
      ...prev,
      selectedSubjects: prev.selectedSubjects.filter(id => id !== subjectId)
    }))
  }

  const removeClass = (classId) => {
    setFormData(prev => ({
      ...prev,
      selectedClasses: prev.selectedClasses.filter(id => id !== classId)
    }))
  }

  const getSubjectName = (subjectId) => {
    const subject = subjects.find(s => s.id === subjectId)
    return subject ? subject.subjectName : 'Unknown'
  }

  const getClassName = (classId) => {
    const classItem = classes.find(c => c.id === classId)
    return classItem ? classItem.className : 'Unknown'
  }

  const filteredSubjects = subjects.filter(subject =>
    subject.subjectName.toLowerCase().includes(subjectSearch.toLowerCase()) ||
    subject.subjectCode.toLowerCase().includes(subjectSearch.toLowerCase())
  )

  const filteredClasses = classes.filter(classItem =>
    classItem.className.toLowerCase().includes(classSearch.toLowerCase())
  )

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.teacherName || !formData.sex || !formData.contact || !formData.section) {
      setErrorMessage('Please fill in all required fields')
      setShowError(true)
      setTimeout(() => setShowError(false), 3000)
      return
    }

    if (formData.selectedSubjects.length === 0) {
      setErrorMessage('Please select at least one subject')
      setShowError(true)
      setTimeout(() => setShowError(false), 3000)
      return
    }

    if (formData.selectedClasses.length === 0) {
      setErrorMessage('Please select at least one class')
      setShowError(true)
      setTimeout(() => setShowError(false), 3000)
      return
    }

    setLoading(true)
    
    try {
      if (editingTeacher) {
        // Update existing teacher
        const teacherData = {
          ...formData,
          createdAt: editingTeacher.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
        
        const result = await firebaseService.set(`teachers/${editingTeacher.id}`, teacherData)
        
        if (result.success) {
          setShowSuccess(true)
          setTimeout(() => setShowSuccess(false), 3000)
          await fetchTeachers()
          handleCloseModal()
        } else {
          setErrorMessage(result.error || 'Failed to update teacher')
          setShowError(true)
          setTimeout(() => setShowError(false), 3000)
        }
      } else {
        // Create new teacher
        const teacherData = {
          ...formData,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
        
        const result = await firebaseService.push('teachers', teacherData)
        
        if (result.success) {
          setShowSuccess(true)
          setTimeout(() => setShowSuccess(false), 3000)
          await fetchTeachers()
          handleCloseModal()
        } else {
          setErrorMessage(result.error || 'Failed to register teacher')
          setShowError(true)
          setTimeout(() => setShowError(false), 3000)
        }
      }
    } catch (error) {
      setErrorMessage(`Error: ${error.message}`)
      setShowError(true)
      setTimeout(() => setShowError(false), 3000)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (teacherItem) => {
    setEditingTeacher(teacherItem)
    setFormData({
      teacherName: teacherItem.teacherName,
      sex: teacherItem.sex,
      contact: teacherItem.contact,
      selectedSubjects: teacherItem.selectedSubjects || [],
      section: teacherItem.section,
      selectedClasses: teacherItem.selectedClasses || []
    })
    setShowModal(true)
  }

  const handleDeleteClick = (id, teacherName) => {
    setTeacherToDelete({ id, teacherName })
    setShowDeleteModal(true)
  }

  const handleDeleteConfirm = async () => {
    if (!teacherToDelete) return
    
    try {
      setLoading(true)
      const result = await firebaseService.delete(`teachers/${teacherToDelete.id}`)
      
      if (result.success) {
        setShowSuccess(true)
        setErrorMessage('Teacher deleted successfully!')
        setTimeout(() => {
          setShowSuccess(false)
          setErrorMessage('')
        }, 3000)
        await fetchTeachers()
        setShowDeleteModal(false)
        setTeacherToDelete(null)
      } else {
        setErrorMessage(result.error || 'Failed to delete teacher')
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

  const handleDeleteCancel = () => {
    setShowDeleteModal(false)
    setTeacherToDelete(null)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingTeacher(null)
    setFormData({
      teacherName: '',
      sex: '',
      contact: '',
      selectedSubjects: [],
      section: '',
      selectedClasses: []
    })
    setSubjectSearch('')
    setClassSearch('')
    setShowSubjectDropdown(false)
    setShowClassDropdown(false)
  }

  const handleCreateNew = () => {
    setEditingTeacher(null)
    setFormData({
      teacherName: '',
      sex: '',
      contact: '',
      selectedSubjects: [],
      section: '',
      selectedClasses: []
    })
    setSubjectSearch('')
    setClassSearch('')
    setShowSubjectDropdown(false)
    setShowClassDropdown(false)
    setShowModal(true)
  }

  return (
    <div className="admin-teacher">
      {/* Success Message */}
      {showSuccess && (
        <div className="success-message">
          <FiCheckCircle /> {errorMessage || (editingTeacher ? 'Teacher updated successfully!' : 'Teacher registered successfully!')}
        </div>
      )}

      {/* Error Message */}
      {showError && (
        <div className="error-message-toast">
          <FiAlertCircle /> {errorMessage}
        </div>
      )}

      {/* Header with Add Button */}
      <div className="teacher-header">
        <div>
          <h2>Teacher Registration</h2>
          <p>Register and manage teachers</p>
        </div>
        <button className="create-btn" onClick={handleCreateNew}>
          <FiPlus /> Add Teacher
        </button>
      </div>

      {/* Teachers Table */}
      {fetching ? (
        <div className="empty-state">
          <p>Loading teachers...</p>
        </div>
      ) : teachers.length === 0 ? (
        <div className="empty-state">
          <p>No teachers registered yet</p>
          <button className="create-btn-secondary" onClick={handleCreateNew}>
            <FiPlus /> Register Your First Teacher
          </button>
        </div>
      ) : (
        <div className="table-container">
          <table className="teachers-table">
            <thead>
              <tr>
                <th>Teacher Name</th>
                <th>Sex</th>
                <th>Contact</th>
                <th>Section</th>
                <th>Subjects</th>
                <th>Classes</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {teachers.map((teacher) => (
                <tr key={teacher.id}>
                  <td><strong>{teacher.teacherName}</strong></td>
                  <td>
                    <span className="badge badge-sex">{teacher.sex}</span>
                  </td>
                  <td>{teacher.contact}</td>
                  <td>
                    <span className="badge badge-section">{teacher.section}</span>
                  </td>
                  <td>
                    <div className="tags-container">
                      {teacher.selectedSubjects?.slice(0, 2).map(subjectId => (
                        <span key={subjectId} className="tag tag-subject">
                          {getSubjectName(subjectId)}
                        </span>
                      ))}
                      {teacher.selectedSubjects?.length > 2 && (
                        <span className="tag tag-more">+{teacher.selectedSubjects.length - 2}</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="tags-container">
                      {teacher.selectedClasses?.slice(0, 2).map(classId => (
                        <span key={classId} className="tag tag-class">
                          {getClassName(classId)}
                        </span>
                      ))}
                      {teacher.selectedClasses?.length > 2 && (
                        <span className="tag tag-more">+{teacher.selectedClasses.length - 2}</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button 
                        className="action-btn edit-btn"
                        onClick={() => handleEdit(teacher)}
                        title="Edit"
                        disabled={loading}
                      >
                        <FiEdit2 />
                      </button>
                      <button 
                        className="action-btn delete-btn"
                        onClick={() => handleDeleteClick(teacher.id, teacher.teacherName)}
                        title="Delete"
                        disabled={loading}
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content teacher-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingTeacher ? 'Edit Teacher' : 'Register New Teacher'}</h3>
              <button className="modal-close" onClick={handleCloseModal}>
                <FiX />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="teacher-form">
              <div className="form-group">
                <label htmlFor="teacherName">Teacher Name *</label>
                <input
                  type="text"
                  id="teacherName"
                  name="teacherName"
                  value={formData.teacherName}
                  onChange={handleInputChange}
                  placeholder="Enter teacher's full name"
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="sex">Sex *</label>
                  <select
                    id="sex"
                    name="sex"
                    value={formData.sex}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Select Sex</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="contact">Contact *</label>
                  <input
                    type="text"
                    id="contact"
                    name="contact"
                    value={formData.contact}
                    onChange={handleInputChange}
                    placeholder="Phone number or email"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Subject(s) *</label>
                <div className="multi-select-container">
                  <div className="selected-items">
                    {formData.selectedSubjects.map(subjectId => {
                      const subject = subjects.find(s => s.id === subjectId)
                      return subject ? (
                        <span key={subjectId} className="selected-tag">
                          {subject.subjectName}
                          <button
                            type="button"
                            onClick={() => removeSubject(subjectId)}
                            className="remove-tag"
                          >
                            <FiX />
                          </button>
                        </span>
                      ) : null
                    })}
                  </div>
                  <div className="search-dropdown">
                    <div className="search-input-wrapper">
                      <FiSearch className="search-icon" />
                      <input
                        type="text"
                        placeholder="Search and select subjects..."
                        value={subjectSearch}
                        onChange={(e) => setSubjectSearch(e.target.value)}
                        onFocus={() => setShowSubjectDropdown(true)}
                        className="search-input"
                      />
                    </div>
                    {showSubjectDropdown && (
                      <div className="dropdown-list">
                        {filteredSubjects.length === 0 ? (
                          <div className="dropdown-empty">No subjects found</div>
                        ) : (
                          filteredSubjects.map(subject => (
                            <label key={subject.id} className="checkbox-item">
                              <input
                                type="checkbox"
                                checked={formData.selectedSubjects.includes(subject.id)}
                                onChange={() => handleSubjectToggle(subject.id)}
                              />
                              <span>
                                <strong>{subject.subjectName}</strong> ({subject.subjectCode})
                              </span>
                            </label>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="section">Section *</label>
                <select
                  id="section"
                  name="section"
                  value={formData.section}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Select Section</option>
                  <option value="Commercial">Commercial</option>
                  <option value="Grammar">Grammar</option>
                  <option value="Technical">Technical</option>
                </select>
              </div>

              <div className="form-group">
                <label>Class(es) *</label>
                <div className="multi-select-container">
                  <div className="selected-items">
                    {formData.selectedClasses.map(classId => {
                      const classItem = classes.find(c => c.id === classId)
                      return classItem ? (
                        <span key={classId} className="selected-tag">
                          {classItem.className}
                          <button
                            type="button"
                            onClick={() => removeClass(classId)}
                            className="remove-tag"
                          >
                            <FiX />
                          </button>
                        </span>
                      ) : null
                    })}
                  </div>
                  <div className="search-dropdown">
                    <div className="search-input-wrapper">
                      <FiSearch className="search-icon" />
                      <input
                        type="text"
                        placeholder="Search and select classes..."
                        value={classSearch}
                        onChange={(e) => setClassSearch(e.target.value)}
                        onFocus={() => setShowClassDropdown(true)}
                        className="search-input"
                      />
                    </div>
                    {showClassDropdown && (
                      <div className="dropdown-list">
                        {filteredClasses.length === 0 ? (
                          <div className="dropdown-empty">No classes found</div>
                        ) : (
                          filteredClasses.map(classItem => (
                            <label key={classItem.id} className="checkbox-item">
                              <input
                                type="checkbox"
                                checked={formData.selectedClasses.includes(classItem.id)}
                                onChange={() => handleClassToggle(classItem.id)}
                              />
                              <span>
                                <strong>{classItem.className}</strong> - {classItem.section}
                              </span>
                            </label>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="form-actions">
                <button type="button" className="cancel-btn" onClick={handleCloseModal}>
                  Cancel
                </button>
                <button type="submit" className="submit-btn" disabled={loading}>
                  {loading ? 'Processing...' : (editingTeacher ? 'Update Teacher' : 'Register Teacher')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal-overlay" onClick={handleDeleteCancel}>
          <div className="modal-content delete-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Delete Teacher</h3>
              <button className="modal-close" onClick={handleDeleteCancel}>
                <FiX />
              </button>
            </div>
            <div className="delete-modal-body">
              <p>Are you sure you want to delete <strong>{teacherToDelete?.teacherName}</strong>?</p>
              <p className="delete-warning">This action cannot be undone.</p>
            </div>
            <div className="form-actions">
              <button type="button" className="cancel-btn" onClick={handleDeleteCancel} disabled={loading}>
                Cancel
              </button>
              <button type="button" className="delete-confirm-btn" onClick={handleDeleteConfirm} disabled={loading}>
                {loading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
