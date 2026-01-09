import React, { useState, useEffect } from 'react'
import './AdminUsers.css'
import {
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiX,
  FiCheckCircle,
  FiAlertCircle,
  FiLock,
  FiUser
} from 'react-icons/fi'
import firebaseService from './firebaseService'

export default function AdminUsers() {
  const [users, setUsers] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [userToDelete, setUserToDelete] = useState(null)
  const [editingUser, setEditingUser] = useState(null)
  const [showSuccess, setShowSuccess] = useState(false)
  const [showError, setShowError] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  })

  // Fetch users from database on component mount
  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      setFetching(true)
      const result = await firebaseService.get('users')
      
      if (result.success) {
        if (result.data) {
          const usersArray = Object.keys(result.data).map(key => ({
            id: key,
            ...result.data[key]
          }))
          setUsers(usersArray)
        } else {
          setUsers([])
        }
      } else {
        setErrorMessage(result.error || 'Failed to fetch users')
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
    
    if (!formData.username || !formData.password) {
      setErrorMessage('Please fill in all fields')
      setShowError(true)
      setTimeout(() => setShowError(false), 3000)
      return
    }

    // Check if username already exists (for new users)
    if (!editingUser) {
      const existingUser = users.find(u => u.username === formData.username)
      if (existingUser) {
        setErrorMessage('Username already exists')
        setShowError(true)
        setTimeout(() => setShowError(false), 3000)
        return
      }
    }

    setLoading(true)
    
    try {
      if (editingUser) {
        // Update existing user
        const userData = {
          username: formData.username,
          password: formData.password, // In production, this should be hashed
          createdAt: editingUser.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
        
        const result = await firebaseService.set(`users/${editingUser.id}`, userData)
        
        if (result.success) {
          setShowSuccess(true)
          setTimeout(() => setShowSuccess(false), 3000)
          await fetchUsers()
          handleCloseModal()
        } else {
          setErrorMessage(result.error || 'Failed to update user')
          setShowError(true)
          setTimeout(() => setShowError(false), 3000)
        }
      } else {
        // Create new user
        const userData = {
          username: formData.username,
          password: formData.password, // In production, this should be hashed
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
        
        const result = await firebaseService.push('users', userData)
        
        if (result.success) {
          setShowSuccess(true)
          setTimeout(() => setShowSuccess(false), 3000)
          await fetchUsers()
          handleCloseModal()
        } else {
          setErrorMessage(result.error || 'Failed to create user')
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

  const handleEdit = (userItem) => {
    setEditingUser(userItem)
    setFormData({
      username: userItem.username,
      password: '' // Don't show password, user needs to enter new one
    })
    setShowModal(true)
  }

  const handleDeleteClick = (id, username) => {
    setUserToDelete({ id, username })
    setShowDeleteModal(true)
  }

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return
    
    try {
      setLoading(true)
      const result = await firebaseService.delete(`users/${userToDelete.id}`)
      
      if (result.success) {
        setShowSuccess(true)
        setErrorMessage('User deleted successfully!')
        setTimeout(() => {
          setShowSuccess(false)
          setErrorMessage('')
        }, 3000)
        await fetchUsers()
        setShowDeleteModal(false)
        setUserToDelete(null)
      } else {
        setErrorMessage(result.error || 'Failed to delete user')
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
    setUserToDelete(null)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingUser(null)
    setFormData({
      username: '',
      password: ''
    })
  }

  const handleCreateNew = () => {
    setEditingUser(null)
    setFormData({
      username: '',
      password: ''
    })
    setShowModal(true)
  }

  return (
    <div className="admin-users">
      {/* Success Message */}
      {showSuccess && (
        <div className="success-message">
          <FiCheckCircle /> {errorMessage || (editingUser ? 'User updated successfully!' : 'User created successfully!')}
        </div>
      )}

      {/* Error Message */}
      {showError && (
        <div className="error-message-toast">
          <FiAlertCircle /> {errorMessage}
        </div>
      )}

      {/* Header with Create Button */}
      <div className="users-header">
        <div>
          <h2>Users Management</h2>
          <p>Create and manage user accounts</p>
        </div>
        <button className="create-btn" onClick={handleCreateNew}>
          <FiPlus /> Create User
        </button>
      </div>

      {/* Users Table */}
      {fetching ? (
        <div className="empty-state">
          <p>Loading users...</p>
        </div>
      ) : users.length === 0 ? (
        <div className="empty-state">
          <p>No users created yet</p>
          <button className="create-btn-secondary" onClick={handleCreateNew}>
            <FiPlus /> Create Your First User
          </button>
        </div>
      ) : (
        <div className="table-container">
          <table className="users-table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Created At</th>
                <th>Last Updated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>
                    <div className="user-info">
                      <div className="user-avatar">
                        <FiUser />
                      </div>
                      <strong>{user.username}</strong>
                    </div>
                  </td>
                  <td>
                    <span className="date-text">
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                    </span>
                  </td>
                  <td>
                    <span className="date-text">
                      {user.updatedAt ? new Date(user.updatedAt).toLocaleDateString() : 'N/A'}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button 
                        className="action-btn edit-btn"
                        onClick={() => handleEdit(user)}
                        title="Edit"
                        disabled={loading}
                      >
                        <FiEdit2 />
                      </button>
                      <button 
                        className="action-btn delete-btn"
                        onClick={() => handleDeleteClick(user.id, user.username)}
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
              <h3>{editingUser ? 'Edit User' : 'Create New User'}</h3>
              <button className="modal-close" onClick={handleCloseModal}>
                <FiX />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="user-form">
              <div className="form-group">
                <label htmlFor="username">
                  <FiUser /> Username
                </label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  placeholder="Enter username"
                  required
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="password">
                  <FiLock /> Password
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder={editingUser ? "Enter new password" : "Enter password"}
                  required
                  disabled={loading}
                />
                {editingUser && (
                  <small className="form-hint">Leave blank to keep current password (not implemented yet)</small>
                )}
              </div>

              <div className="form-actions">
                <button type="button" className="cancel-btn" onClick={handleCloseModal} disabled={loading}>
                  Cancel
                </button>
                <button type="submit" className="submit-btn" disabled={loading}>
                  {loading ? 'Processing...' : (editingUser ? 'Update User' : 'Create User')}
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
              <h3>Delete User</h3>
              <button className="modal-close" onClick={handleDeleteCancel}>
                <FiX />
              </button>
            </div>
            <div className="delete-modal-body">
              <p>Are you sure you want to delete user <strong>{userToDelete?.username}</strong>?</p>
              <p className="delete-warning">This action cannot be undone. The user will no longer be able to sign in.</p>
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
