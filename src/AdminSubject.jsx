import React, { useState, useEffect } from 'react'
import './AdminSubject.css'
import {
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiX,
  FiCheckCircle,
  FiAlertCircle
} from 'react-icons/fi'
import firebaseService from './firebaseService'

export default function AdminSubject() {
  const [subjects, setSubjects] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [subjectToDelete, setSubjectToDelete] = useState(null)
  const [editingSubject, setEditingSubject] = useState(null)
  const [showSuccess, setShowSuccess] = useState(false)
  const [showError, setShowError] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [formData, setFormData] = useState({
    subjectName: '',
    subjectCode: '',
    description: ''
  })

  // Fetch subjects from database on component mount
  useEffect(() => {
    fetchSubjects()
  }, [])

  const fetchSubjects = async () => {
    try {
      setFetching(true)
      const result = await firebaseService.get('subjects')
      
      if (result.success) {
        // Convert Firebase object to array
        if (result.data) {
          const subjectsArray = Object.keys(result.data).map(key => ({
            id: key,
            ...result.data[key]
          }))
          setSubjects(subjectsArray)
        } else {
          setSubjects([])
        }
      } else {
        setErrorMessage(result.error || 'Failed to fetch subjects')
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
      if (editingSubject) {
        // Update existing subject
        const subjectData = {
          ...formData,
          createdAt: editingSubject.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
        
        const result = await firebaseService.set(`subjects/${editingSubject.id}`, subjectData)
        
        if (result.success) {
          setShowSuccess(true)
          setTimeout(() => setShowSuccess(false), 3000)
          await fetchSubjects() // Refresh the list
          handleCloseModal()
        } else {
          setErrorMessage(result.error || 'Failed to update subject')
          setShowError(true)
          setTimeout(() => setShowError(false), 3000)
        }
      } else {
        // Create new subject
        const subjectData = {
          ...formData,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
        
        const result = await firebaseService.push('subjects', subjectData)
        
        if (result.success) {
          setShowSuccess(true)
          setTimeout(() => setShowSuccess(false), 3000)
          await fetchSubjects() // Refresh the list
          handleCloseModal()
        } else {
          setErrorMessage(result.error || 'Failed to create subject')
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

  const handleEdit = (subjectItem) => {
    setEditingSubject(subjectItem)
    setFormData({
      subjectName: subjectItem.subjectName,
      subjectCode: subjectItem.subjectCode,
      description: subjectItem.description || ''
    })
    setShowModal(true)
  }

  const handleDeleteClick = (id, subjectName) => {
    setSubjectToDelete({ id, subjectName })
    setShowDeleteModal(true)
  }

  const handleDeleteConfirm = async () => {
    if (!subjectToDelete) return
    
    try {
      setLoading(true)
      const result = await firebaseService.delete(`subjects/${subjectToDelete.id}`)
      
      if (result.success) {
        setShowSuccess(true)
        setErrorMessage('Subject deleted successfully!')
        setTimeout(() => {
          setShowSuccess(false)
          setErrorMessage('')
        }, 3000)
        await fetchSubjects() // Refresh the list
        setShowDeleteModal(false)
        setSubjectToDelete(null)
      } else {
        setErrorMessage(result.error || 'Failed to delete subject')
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
    setSubjectToDelete(null)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingSubject(null)
    setFormData({
      subjectName: '',
      subjectCode: '',
      description: ''
    })
  }

  const handleCreateNew = () => {
    setEditingSubject(null)
    setFormData({
      subjectName: '',
      subjectCode: '',
      description: ''
    })
    setShowModal(true)
  }

  return (
    <div className="admin-subject">
      {/* Success Message */}
      {showSuccess && (
        <div className="success-message">
          <FiCheckCircle /> {errorMessage || (editingSubject ? 'Subject updated successfully!' : 'Subject created successfully!')}
        </div>
      )}

      {/* Error Message */}
      {showError && (
        <div className="error-message-toast">
          <FiAlertCircle /> {errorMessage}
        </div>
      )}

      {/* Header with Create Button */}
      <div className="subject-header">
        <div>
          <h2>Subjects Management</h2>
          <p>Create and manage your subjects</p>
        </div>
        <button className="create-btn" onClick={handleCreateNew}>
          <FiPlus /> Create Subject
        </button>
      </div>

      {/* Subjects Table */}
      {fetching ? (
        <div className="empty-state">
          <p>Loading subjects...</p>
        </div>
      ) : subjects.length === 0 ? (
        <div className="empty-state">
          <p>No subjects created yet</p>
          <button className="create-btn-secondary" onClick={handleCreateNew}>
            <FiPlus /> Create Your First Subject
          </button>
        </div>
      ) : (
        <div className="table-container">
          <table className="subjects-table">
            <thead>
              <tr>
                <th>Subject Name</th>
                <th>Subject Code</th>
                <th>Description</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {subjects.map((subjectItem) => (
                <tr key={subjectItem.id}>
                  <td><strong>{subjectItem.subjectName}</strong></td>
                  <td>
                    <span className="badge badge-code">{subjectItem.subjectCode}</span>
                  </td>
                  <td className="description-cell">
                    {subjectItem.description || <span className="text-muted">No description</span>}
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button 
                        className="action-btn edit-btn"
                        onClick={() => handleEdit(subjectItem)}
                        title="Edit"
                        disabled={loading}
                      >
                        <FiEdit2 />
                      </button>
                      <button 
                        className="action-btn delete-btn"
                        onClick={() => handleDeleteClick(subjectItem.id, subjectItem.subjectName)}
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
              <h3>{editingSubject ? 'Edit Subject' : 'Create New Subject'}</h3>
              <button className="modal-close" onClick={handleCloseModal}>
                <FiX />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="subject-form">
              <div className="form-group">
                <label htmlFor="subjectName">Subject Name</label>
                <input
                  type="text"
                  id="subjectName"
                  name="subjectName"
                  value={formData.subjectName}
                  onChange={handleInputChange}
                  placeholder="e.g., Mathematics, English, Physics"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="subjectCode">Subject Code</label>
                <input
                  type="text"
                  id="subjectCode"
                  name="subjectCode"
                  value={formData.subjectCode}
                  onChange={handleInputChange}
                  placeholder="e.g., MATH, ENG, PHY"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="description">Description (Optional)</label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Enter subject description..."
                  rows="3"
                />
              </div>

              <div className="form-actions">
                <button type="button" className="cancel-btn" onClick={handleCloseModal}>
                  Cancel
                </button>
                <button type="submit" className="submit-btn" disabled={loading}>
                  {loading ? 'Processing...' : (editingSubject ? 'Update Subject' : 'Create Subject')}
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
              <h3>Delete Subject</h3>
              <button className="modal-close" onClick={handleDeleteCancel}>
                <FiX />
              </button>
            </div>
            <div className="delete-modal-body">
              <p>Are you sure you want to delete <strong>{subjectToDelete?.subjectName}</strong>?</p>
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
