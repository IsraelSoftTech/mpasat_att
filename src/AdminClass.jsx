import React, { useState, useEffect } from 'react'
import './AdminClass.css'
import {
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiX,
  FiCheckCircle,
  FiAlertCircle
} from 'react-icons/fi'
import firebaseService from './firebaseService'

export default function AdminClass() {
  const [classes, setClasses] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [classToDelete, setClassToDelete] = useState(null)
  const [editingClass, setEditingClass] = useState(null)
  const [showSuccess, setShowSuccess] = useState(false)
  const [showError, setShowError] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [formData, setFormData] = useState({
    className: '',
    section: '',
    level: ''
  })

  // Fetch classes from database on component mount
  useEffect(() => {
    fetchClasses()
  }, [])

  const fetchClasses = async () => {
    try {
      setFetching(true)
      const result = await firebaseService.get('classes')
      
      if (result.success) {
        // Convert Firebase object to array
        if (result.data) {
          const classesArray = Object.keys(result.data).map(key => ({
            id: key,
            ...result.data[key]
          }))
          setClasses(classesArray)
        } else {
          setClasses([])
        }
      } else {
        setErrorMessage(result.error || 'Failed to fetch classes')
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

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      if (editingClass) {
        // Update existing class
        const classData = {
          ...formData,
          createdAt: editingClass.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
        
        const result = await firebaseService.set(`classes/${editingClass.id}`, classData)
        
        if (result.success) {
          setShowSuccess(true)
          setTimeout(() => setShowSuccess(false), 3000)
          await fetchClasses() // Refresh the list
          handleCloseModal()
        } else {
          setErrorMessage(result.error || 'Failed to update class')
          setShowError(true)
          setTimeout(() => setShowError(false), 3000)
        }
      } else {
        // Create new class
        const classData = {
          ...formData,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
        
        const result = await firebaseService.push('classes', classData)
        
        if (result.success) {
          setShowSuccess(true)
          setTimeout(() => setShowSuccess(false), 3000)
          await fetchClasses() // Refresh the list
          handleCloseModal()
        } else {
          setErrorMessage(result.error || 'Failed to create class')
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

  const handleEdit = (classItem) => {
    setEditingClass(classItem)
    setFormData({
      className: classItem.className,
      section: classItem.section,
      level: classItem.level
    })
    setShowModal(true)
  }

  const handleDeleteClick = (id, className) => {
    setClassToDelete({ id, className })
    setShowDeleteModal(true)
  }

  const handleDeleteConfirm = async () => {
    if (!classToDelete) return
    
    try {
      setLoading(true)
      const result = await firebaseService.delete(`classes/${classToDelete.id}`)
      
      if (result.success) {
        setShowSuccess(true)
        setErrorMessage('Class deleted successfully!')
        setTimeout(() => {
          setShowSuccess(false)
          setErrorMessage('')
        }, 3000)
        await fetchClasses() // Refresh the list
        setShowDeleteModal(false)
        setClassToDelete(null)
      } else {
        setErrorMessage(result.error || 'Failed to delete class')
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
    setClassToDelete(null)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingClass(null)
    setFormData({
      className: '',
      section: '',
      level: ''
    })
  }

  const handleCreateNew = () => {
    setEditingClass(null)
    setFormData({
      className: '',
      section: '',
      level: ''
    })
    setShowModal(true)
  }

  return (
    <div className="admin-class">
      {/* Success Message */}
      {showSuccess && (
        <div className="success-message">
          <FiCheckCircle /> {errorMessage || (editingClass ? 'Class updated successfully!' : 'Class created successfully!')}
        </div>
      )}

      {/* Error Message */}
      {showError && (
        <div className="error-message-toast">
          <FiAlertCircle /> {errorMessage}
        </div>
      )}

      {/* Header with Create Button */}
      <div className="class-header">
        <div>
          <h2>Classes Management</h2>
          <p>Create and manage your classes</p>
        </div>
        <button className="create-btn" onClick={handleCreateNew}>
          <FiPlus /> Create Class
        </button>
      </div>

      {/* Classes Table */}
      {fetching ? (
        <div className="empty-state">
          <p>Loading classes...</p>
        </div>
      ) : classes.length === 0 ? (
        <div className="empty-state">
          <p>No classes created yet</p>
          <button className="create-btn-secondary" onClick={handleCreateNew}>
            <FiPlus /> Create Your First Class
          </button>
        </div>
      ) : (
        <div className="table-container">
          <table className="classes-table">
            <thead>
              <tr>
                <th>Class Name</th>
                <th>Section</th>
                <th>Level</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {classes.map((classItem) => (
                <tr key={classItem.id}>
                  <td>{classItem.className}</td>
                  <td>
                    <span className="badge badge-section">{classItem.section}</span>
                  </td>
                  <td>
                    <span className="badge badge-level">{classItem.level}</span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button 
                        className="action-btn edit-btn"
                        onClick={() => handleEdit(classItem)}
                        title="Edit"
                        disabled={loading}
                      >
                        <FiEdit2 />
                      </button>
                      <button 
                        className="action-btn delete-btn"
                        onClick={() => handleDeleteClick(classItem.id, classItem.className)}
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
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingClass ? 'Edit Class' : 'Create New Class'}</h3>
              <button className="modal-close" onClick={handleCloseModal}>
                <FiX />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="class-form">
              <div className="form-group">
                <label htmlFor="className">Class Name</label>
                <input
                  type="text"
                  id="className"
                  name="className"
                  value={formData.className}
                  onChange={handleInputChange}
                  placeholder="e.g., Form 1A, Grade 10B"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="section">Section</label>
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
                <label htmlFor="level">Level</label>
                <select
                  id="level"
                  name="level"
                  value={formData.level}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Select Level</option>
                  <option value="Ordinary/Intermediate">Ordinary/Intermediate</option>
                  <option value="Advanced Level">Advanced Level</option>
                </select>
              </div>

              <div className="form-actions">
                <button type="button" className="cancel-btn" onClick={handleCloseModal}>
                  Cancel
                </button>
                <button type="submit" className="submit-btn" disabled={loading}>
                  {loading ? 'Processing...' : (editingClass ? 'Update Class' : 'Create Class')}
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
              <h3>Delete Class</h3>
              <button className="modal-close" onClick={handleDeleteCancel}>
                <FiX />
              </button>
            </div>
            <div className="delete-modal-body">
              <p>Are you sure you want to delete <strong>{classToDelete?.className}</strong>?</p>
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
