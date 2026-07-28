import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Shield, Save, RefreshCw, Plus, Edit2, Trash2, X, Search } from 'lucide-react';

const RoleManagement = () => {
  const { authFetch, API_BASE } = useContext(AuthContext);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [savingRoleId, setSavingRoleId] = useState(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form Fields
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    permissions: []
  });

  const SYSTEM_ROLES = ['Admin', 'Manager', 'Team Lead', 'Support Engineer', 'Client'];

  // Available permissions pool in the system
  const availablePermissions = [
    { value: 'users:read', label: 'View Users' },
    { value: 'users:write', label: 'Modify Users' },
    { value: 'roles:read', label: 'View Roles' },
    { value: 'roles:write', label: 'Modify Roles' },
    { value: 'tickets:create', label: 'Submit Tickets' },
    { value: 'tickets:read', label: 'View Tickets' },
    { value: 'tickets:write', label: 'Edit Tickets' },
    { value: 'tickets:assign', label: 'Assign Tickets' },
    { value: 'tickets:resolve', label: 'Resolve Tickets' },
    { value: 'tickets:delete', label: 'Delete Tickets' },
    { value: 'analytics:read', label: 'Access Reports' },
    { value: 'settings:write', label: 'System Settings' }
  ];

  const fetchRoles = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await authFetch(`${API_BASE}/roles`);
      if (!res.ok) throw new Error('Failed to load roles matrix');
      const data = await res.json();
      setRoles(data);
    } catch (err) {
      setError(err.message || 'Failed to fetch roles');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePermissionChange = (roleId, permissionVal, checked) => {
    setRoles(prevRoles =>
      prevRoles.map(role => {
        if (role.id !== roleId) return role;
        
        let newPermissions = [...role.permissions];
        if (checked) {
          if (!newPermissions.includes(permissionVal)) {
            newPermissions.push(permissionVal);
          }
        } else {
          newPermissions = newPermissions.filter(p => p !== permissionVal);
        }
        
        return { ...role, permissions: newPermissions };
      })
    );
  };

  const handleSaveRolePermissions = async (role) => {
    try {
      setError('');
      setSuccess('');
      setSavingRoleId(role.id);

      const res = await authFetch(`${API_BASE}/roles/${role.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: role.name,
          description: role.description,
          permissions: role.permissions 
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to save role permissions');

      setSuccess(`Permissions updated successfully for role: ${role.name}`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingRoleId(null);
    }
  };

  const handleOpenAddModal = () => {
    setFormData({
      name: '',
      description: '',
      permissions: []
    });
    setError('');
    setShowAddModal(true);
  };

  const handleOpenEditModal = (role) => {
    setSelectedRole(role);
    setFormData({
      name: role.name,
      description: role.description,
      permissions: role.permissions
    });
    setError('');
    setShowEditModal(true);
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    try {
      setError('');
      setSubmitting(true);
      const res = await authFetch(`${API_BASE}/roles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to create role');

      setSuccess(`Role "${formData.name}" created successfully`);
      setShowAddModal(false);
      fetchRoles();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      setError('');
      setSubmitting(true);
      const res = await authFetch(`${API_BASE}/roles/${selectedRole.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update role');

      setSuccess(`Role "${formData.name}" updated successfully`);
      setShowEditModal(false);
      fetchRoles();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRole = async (role) => {
    if (SYSTEM_ROLES.includes(role.name)) {
      alert('System roles cannot be deleted.');
      return;
    }
    if (!window.confirm(`Are you sure you want to delete the role "${role.name}"?`)) return;

    try {
      setError('');
      const res = await authFetch(`${API_BASE}/roles/${role.id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to delete role');

      setSuccess(`Role "${role.name}" deleted successfully`);
      fetchRoles();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleModalPermissionToggle = (permissionVal, checked) => {
    setFormData(prev => {
      let newPerms = [...prev.permissions];
      if (checked) {
        if (!newPerms.includes(permissionVal)) newPerms.push(permissionVal);
      } else {
        newPerms = newPerms.filter(p => p !== permissionVal);
      }
      return { ...prev, permissions: newPerms };
    });
  };

  const filteredRoles = roles.filter(role => 
    role.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    role.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '28px', fontWeight: 700, fontFamily: 'Outfit' }}>Role Matrix Manager</h2>
          <p style={{ color: 'var(--text-muted)' }}>Configure permission matrices for role-based access control (RBAC).</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-secondary" style={{ width: 'auto' }} onClick={fetchRoles} disabled={loading}>
            <RefreshCw size={16} className={loading ? 'spin-anim' : ''} />
            <span>Refresh Matrix</span>
          </button>
          <button className="btn btn-primary" style={{ width: 'auto' }} onClick={handleOpenAddModal}>
            <Plus size={16} />
            <span>Create Role</span>
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error"><span>{error}</span></div>}
      {success && <div className="alert alert-success"><span>{success}</span></div>}

      {/* Role Directory Search */}
      <div className="panel" style={{ padding: '16px', marginBottom: '24px' }}>
        <div className="input-container" style={{ margin: 0 }}>
          <Search className="input-icon" size={18} />
          <input
            type="text"
            className="form-control"
            placeholder="Search roles by name or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '40px' }}
          />
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>Loading roles...</div>
      ) : filteredRoles.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>No roles match your search</div>
      ) : (
        <div className="role-matrix-grid" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {filteredRoles.map(role => {
            const isSystemRole = SYSTEM_ROLES.includes(role.name);
            return (
              <div key={role.id} className="role-card-item panel" style={{ padding: '24px', margin: 0 }}>
                <div className="role-card-header" style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  borderBottom: '1px solid var(--border-color)',
                  paddingBottom: '16px',
                  marginBottom: '16px',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Shield size={22} style={{ color: role.name === 'Admin' ? 'var(--color-primary)' : 'var(--text-muted)' }} />
                      <span className="role-card-title" style={{ fontSize: '20px', fontWeight: 700 }}>{role.name}</span>
                      {isSystemRole ? (
                        <span style={{
                          background: 'rgba(59, 130, 246, 0.15)',
                          color: 'rgb(59, 130, 246)',
                          fontSize: '11px',
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          textTransform: 'uppercase'
                        }}>
                          System Role
                        </span>
                      ) : (
                        <span style={{
                          background: 'rgba(16, 185, 129, 0.15)',
                          color: 'rgb(16, 185, 129)',
                          fontSize: '11px',
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          textTransform: 'uppercase'
                        }}>
                          Custom Role
                        </span>
                      )}
                    </div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: '6px 0 0 0' }}>{role.description}</p>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button
                      className="icon-btn"
                      onClick={() => handleOpenEditModal(role)}
                      title="Edit Name/Description"
                    >
                      <Edit2 size={16} />
                    </button>
                    {!isSystemRole && (
                      <button
                        className="icon-btn icon-btn-danger"
                        onClick={() => handleDeleteRole(role)}
                        title="Delete Role"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}

                    {role.name !== 'Admin' ? (
                      <button
                        className="btn btn-primary"
                        style={{ width: 'auto', padding: '8px 16px', fontSize: '13px' }}
                        onClick={() => handleSaveRolePermissions(role)}
                        disabled={savingRoleId === role.id}
                      >
                        <Save size={14} />
                        <span>{savingRoleId === role.id ? 'Saving...' : 'Save Permissions'}</span>
                      </button>
                    ) : (
                      <span style={{ fontSize: '12px', color: 'var(--color-primary)', fontWeight: 600 }}>Superuser (All Permissions)</span>
                    )}
                  </div>
                </div>

                <div className="role-card-permissions" style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                  gap: '12px'
                }}>
                  {availablePermissions.map(p => {
                    const isChecked = role.name === 'Admin' || role.permissions.includes(p.value);
                    return (
                      <label key={p.value} className="permission-checkbox-label" style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        cursor: role.name === 'Admin' ? 'not-allowed' : 'pointer',
                        padding: '6px',
                        borderRadius: '4px',
                        transition: 'background 0.2s',
                        userSelect: 'none'
                      }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => handlePermissionChange(role.id, p.value, e.target.checked)}
                          disabled={role.name === 'Admin' || savingRoleId !== null}
                        />
                        <span style={{ 
                          fontSize: '13px', 
                          fontWeight: 500,
                          color: isChecked ? 'var(--text-main)' : 'var(--text-muted)' 
                        }}>
                          {p.label}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Custom Role Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div className="panel-header" style={{ padding: '20px 24px', margin: 0 }}>
              <h3 className="panel-title">Create Custom System Role</h3>
              <button className="icon-btn" onClick={() => setShowAddModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleAddSubmit}>
              <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                <div className="form-group">
                  <label className="form-label">Role Name</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Audit Manager"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    style={{ paddingLeft: '14px' }}
                    disabled={submitting}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea
                    className="form-control"
                    placeholder="Provide a brief description of the access level..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    style={{ paddingLeft: '14px', paddingTop: '10px' }}
                    disabled={submitting}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ marginBottom: '12px' }}>Role Permissions Matrix</label>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '10px',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    padding: '16px',
                    borderRadius: '6px'
                  }}>
                    {availablePermissions.map(p => {
                      const isChecked = formData.permissions.includes(p.value);
                      return (
                        <label key={p.value} className="permission-checkbox-label" style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          cursor: 'pointer'
                        }}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => handleModalPermissionToggle(p.value, e.target.checked)}
                          />
                          <span style={{ fontSize: '13px', fontWeight: 500 }}>{p.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" style={{ width: 'auto' }} onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ width: 'auto' }} disabled={submitting}>
                  {submitting ? 'Creating...' : 'Create Role'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Role Details Modal */}
      {showEditModal && selectedRole && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div className="panel-header" style={{ padding: '20px 24px', margin: 0 }}>
              <h3 className="panel-title">Edit Role Details</h3>
              <button className="icon-btn" onClick={() => setShowEditModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleEditSubmit}>
              <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                <div className="form-group">
                  <label className="form-label">Role Name</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    style={{ paddingLeft: '14px' }}
                    disabled={SYSTEM_ROLES.includes(selectedRole.name) || submitting}
                  />
                  {SYSTEM_ROLES.includes(selectedRole.name) && (
                    <small style={{ color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                      System role names cannot be renamed.
                    </small>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea
                    className="form-control"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    style={{ paddingLeft: '14px', paddingTop: '10px' }}
                    disabled={submitting}
                  />
                </div>

                {/* Permissions inside edit modal too for all-in-one editing if custom role */}
                {!SYSTEM_ROLES.includes(selectedRole.name) && (
                  <div className="form-group">
                    <label className="form-label" style={{ marginBottom: '12px' }}>Role Permissions Matrix</label>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '10px',
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-color)',
                      padding: '16px',
                      borderRadius: '6px'
                    }}>
                      {availablePermissions.map(p => {
                        const isChecked = formData.permissions.includes(p.value);
                        return (
                          <label key={p.value} className="permission-checkbox-label" style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            cursor: 'pointer'
                          }}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => handleModalPermissionToggle(p.value, e.target.checked)}
                            />
                            <span style={{ fontSize: '13px', fontWeight: 500 }}>{p.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" style={{ width: 'auto' }} onClick={() => setShowEditModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ width: 'auto' }} disabled={submitting}>
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoleManagement;
