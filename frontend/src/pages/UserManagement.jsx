import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { 
  Search, UserPlus, Edit2, Trash2, X, Check, Shield, Eye, Wrench, Ticket,
  ArrowUp, ArrowDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight 
} from 'lucide-react';

const CATEGORY_SPECIALIZATIONS = [
  'Network & Internet',
  'Software Issues',
  'Hardware Support',
  'Account & Access',
  'General Request'
];

const UserManagement = () => {
  const { authFetch, API_BASE } = useContext(AuthContext);
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Pagination & Filtering States
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('DESC');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // Form Fields
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    roleId: '',
    status: 'Active',
    specialization: '',
    department: ''
  });

  const [submitting, setSubmitting] = useState(false);

  // Fetch Users and Roles
  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const queryParams = new URLSearchParams();
      if (search) queryParams.append('search', search);
      if (roleFilter) queryParams.append('roleId', roleFilter);
      if (statusFilter) queryParams.append('status', statusFilter);
      queryParams.append('sortBy', sortBy);
      queryParams.append('sortOrder', sortOrder);
      queryParams.append('page', page.toString());
      queryParams.append('limit', limit.toString());
      
      const usersRes = await authFetch(`${API_BASE}/users?${queryParams.toString()}`);
      if (!usersRes.ok) throw new Error('Failed to load users');
      const usersData = await usersRes.json();
      
      setUsers(usersData.users || []);
      setPagination(usersData.pagination || { total: 0, pages: 1 });

      // Fetch roles if not loaded
      if (roles.length === 0) {
        const rolesRes = await authFetch(`${API_BASE}/roles`);
        if (rolesRes.ok) {
          const rolesData = await rolesRes.json();
          setRoles(rolesData);
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch directory resources');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, roleFilter, statusFilter, sortBy, sortOrder, page, limit]);

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC');
    } else {
      setSortBy(field);
      setSortOrder('ASC');
    }
    setPage(1);
  };

  const isEngineerRole = (roleId) => {
    const r = roles.find(role => role.id === roleId);
    return r && r.name === 'Support Engineer';
  };

  const handleOpenAddModal = () => {
    setFormData({
      name: '',
      email: '',
      password: 'Password@123',
      roleId: roles.length > 0 ? roles[0].id : '',
      status: 'Active',
      specialization: '',
      department: ''
    });
    setError('');
    setShowAddModal(true);
  };

  const handleOpenEditModal = (user) => {
    setSelectedUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: '',
      roleId: user.role_id,
      status: user.status || 'Active',
      specialization: user.specialization || '',
      department: user.department || ''
    });
    setError('');
    setShowEditModal(true);
  };

  const handleOpenDetailsModal = (user) => {
    setSelectedUser(user);
    setShowDetailsModal(true);
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    try {
      setError('');
      setSubmitting(true);
      const res = await authFetch(`${API_BASE}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          roleId: formData.roleId,
          status: formData.status,
          specialization: formData.specialization || null,
          department: formData.department || null
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to create user');

      setSuccess('User created successfully');
      setShowAddModal(false);
      fetchData();
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
      const res = await authFetch(`${API_BASE}/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          roleId: formData.roleId,
          status: formData.status,
          specialization: formData.specialization || null,
          department: formData.department || null
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update user');

      setSuccess('User updated successfully');
      setShowEditModal(false);
      fetchData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (userId, newStatus) => {
    try {
      setError('');
      const res = await authFetch(`${API_BASE}/users/${userId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Status update failed');
      
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: newStatus, is_active: newStatus === 'Active' } : u));
      setSuccess(`User status changed to ${newStatus}`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user account?')) return;
    try {
      setError('');
      const res = await authFetch(`${API_BASE}/users/${userId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Delete user failed');

      setSuccess('User removed from active directory');
      fetchData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Active': return 'status-success';
      case 'Suspended': return 'status-warning';
      case 'Inactive': return 'status-error';
      default: return 'status-default';
    }
  };

  const getStatusBadgeStyle = (status) => {
    switch (status) {
      case 'Active': return { backgroundColor: 'var(--status-success-bg)', color: 'var(--status-success)', border: '1px solid var(--status-success)' };
      case 'Suspended': return { backgroundColor: 'var(--status-warning-bg)', color: 'var(--status-warning)', border: '1px solid var(--status-warning)' };
      case 'Inactive': return { backgroundColor: 'var(--status-error-bg)', color: 'var(--status-error)', border: '1px solid var(--status-error)' };
      default: return {};
    }
  };

  const renderSortIcon = (field) => {
    if (sortBy !== field) return null;
    return sortOrder === 'ASC' ? <ArrowUp size={14} style={{ marginLeft: '4px' }} /> : <ArrowDown size={14} style={{ marginLeft: '4px' }} />;
  };

  const showingFrom = (page - 1) * limit + 1;
  const showingTo = Math.min(page * limit, pagination.total);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '28px', fontWeight: 700, fontFamily: 'Outfit' }}>User & Engineer Directory</h2>
          <p style={{ color: 'var(--text-muted)' }}>Manage user directories, IT support engineer specializations, and access levels.</p>
        </div>
        <button className="btn btn-primary" style={{ width: 'auto' }} onClick={handleOpenAddModal}>
          <UserPlus size={18} />
          <span>Add Account</span>
        </button>
      </div>

      {error && <div className="alert alert-error"><span>{error}</span></div>}
      {success && <div className="alert alert-success"><span>{success}</span></div>}

      {/* Directory Filters */}
      <div className="panel" style={{ padding: '16px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="input-container" style={{ flexGrow: 1, minWidth: '240px', margin: 0 }}>
            <Search className="input-icon" size={18} />
            <input
              type="text"
              className="form-control"
              placeholder="Search by name, email, or specialization..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              style={{ paddingLeft: '40px' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', width: 'auto' }}>
            <select
              className="form-control"
              value={roleFilter}
              onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
              style={{ width: 'auto', minWidth: '160px', paddingLeft: '12px' }}
            >
              <option value="">All Roles</option>
              {roles.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>

            <select
              className="form-control"
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              style={{ width: 'auto', minWidth: '160px', paddingLeft: '12px' }}
            >
              <option value="">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Suspended">Suspended</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Directory Grid */}
      <div className="panel" style={{ padding: 0, overflow: 'hidden', marginBottom: '24px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
            <div style={{ marginBottom: '12px' }}>Querying directory...</div>
          </div>
        ) : users.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
            No accounts match the criteria
          </div>
        ) : (
          <>
            <div className="table-responsive">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th onClick={() => handleSort('name')} style={{ cursor: 'pointer' }}>
                      <span style={{ display: 'flex', alignItems: 'center' }}>User {renderSortIcon('name')}</span>
                    </th>
                    <th onClick={() => handleSort('email')} style={{ cursor: 'pointer' }}>
                      <span style={{ display: 'flex', alignItems: 'center' }}>Email {renderSortIcon('email')}</span>
                    </th>
                    <th onClick={() => handleSort('role')} style={{ cursor: 'pointer' }}>
                      <span style={{ display: 'flex', alignItems: 'center' }}>Role {renderSortIcon('role')}</span>
                    </th>
                    <th onClick={() => handleSort('specialization')} style={{ cursor: 'pointer' }}>
                      <span style={{ display: 'flex', alignItems: 'center' }}>Specialization {renderSortIcon('specialization')}</span>
                    </th>
                    <th>Workload</th>
                    <th onClick={() => handleSort('status')} style={{ cursor: 'pointer' }}>
                      <span style={{ display: 'flex', alignItems: 'center' }}>Status {renderSortIcon('status')}</span>
                    </th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div className="avatar-initials" style={{ width: '32px', height: '32px', fontSize: '12px' }}>
                            {u.name.substring(0, 2).toUpperCase()}
                          </div>
                          <span style={{ fontWeight: 600 }}>{u.name}</span>
                        </div>
                      </td>
                      <td>{u.email}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                          <Shield size={14} style={{ color: u.role_name === 'Admin' ? 'var(--color-primary)' : 'var(--text-muted)' }} />
                          <span>{u.role_name}</span>
                        </div>
                      </td>
                      <td>
                        {u.role_name === 'Support Engineer' ? (
                          u.specialization ? (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              backgroundColor: 'rgba(99, 102, 241, 0.1)',
                              color: 'var(--color-primary)',
                              fontSize: '12px',
                              fontWeight: 600
                            }}>
                              <Wrench size={12} />
                              {u.specialization}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>General</span>
                          )
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>—</span>
                        )}
                      </td>
                      <td>
                        {u.role_name === 'Support Engineer' ? (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '12px',
                            fontWeight: 600,
                            color: parseInt(u.open_tickets_count || 0, 10) > 3 ? 'var(--status-warning)' : 'var(--text-main)'
                          }}>
                            <Ticket size={13} style={{ color: 'var(--color-primary)' }} />
                            {u.open_tickets_count || 0} open
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>—</span>
                        )}
                      </td>
                      <td>
                        <select
                          value={u.status || 'Active'}
                          onChange={(e) => handleStatusChange(u.id, e.target.value)}
                          style={{
                            ...getStatusBadgeStyle(u.status),
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            outline: 'none'
                          }}
                          className={`badge ${getStatusBadgeClass(u.status)}`}
                        >
                          <option value="Active" style={{ background: 'var(--bg-surface)', color: 'var(--text-main)' }}>Active</option>
                          <option value="Suspended" style={{ background: 'var(--bg-surface)', color: 'var(--text-main)' }}>Suspended</option>
                          <option value="Inactive" style={{ background: 'var(--bg-surface)', color: 'var(--text-main)' }}>Inactive</option>
                        </select>
                      </td>
                      <td>
                        <div className="action-buttons" style={{ justifyContent: 'flex-end' }}>
                          <button className="icon-btn" onClick={() => handleOpenDetailsModal(u)} title="View Details">
                            <Eye size={16} />
                          </button>
                          <button className="icon-btn" onClick={() => handleOpenEditModal(u)} title="Edit User">
                            <Edit2 size={16} />
                          </button>
                          <button className="icon-btn icon-btn-danger" onClick={() => handleDeleteUser(u.id)} title="Delete User">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '16px 24px',
              borderTop: '1px solid var(--border-color)',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
                {pagination.total > 0 ? (
                  <span>Showing {showingFrom} to {showingTo} of {pagination.total} entries</span>
                ) : (
                  <span>Showing 0 to 0 of 0 entries</span>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Show</span>
                  <select
                    className="form-control"
                    value={limit}
                    onChange={(e) => { setLimit(parseInt(e.target.value, 10)); setPage(1); }}
                    style={{ width: 'auto', padding: '4px 8px', height: 'auto', fontSize: '14px' }}
                  >
                    <option value="5">5</option>
                    <option value="10">10</option>
                    <option value="25">25</option>
                    <option value="50">50</option>
                  </select>
                  <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>entries</span>
                </div>

                <div style={{ display: 'flex', gap: '4px' }}>
                  <button
                    className="icon-btn"
                    disabled={page === 1}
                    onClick={() => setPage(1)}
                    style={{ padding: '6px' }}
                  >
                    <ChevronsLeft size={16} />
                  </button>
                  <button
                    className="icon-btn"
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                    style={{ padding: '6px' }}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0 12px',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: 'var(--text-main)'
                  }}>
                    Page {page} of {pagination.pages}
                  </span>
                  <button
                    className="icon-btn"
                    disabled={page === pagination.pages}
                    onClick={() => setPage(page + 1)}
                    style={{ padding: '6px' }}
                  >
                    <ChevronRight size={16} />
                  </button>
                  <button
                    className="icon-btn"
                    disabled={page === pagination.pages}
                    onClick={() => setPage(pagination.pages)}
                    style={{ padding: '6px' }}
                  >
                    <ChevronsRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="panel-header" style={{ padding: '20px 24px', margin: 0 }}>
              <h3 className="panel-title">Add New User / Engineer</h3>
              <button className="icon-btn" onClick={() => setShowAddModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleAddSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Arjun Kumar"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    style={{ paddingLeft: '14px' }}
                    disabled={submitting}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input
                    type="email"
                    className="form-control"
                    placeholder="e.g. arjun.network@desk.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    style={{ paddingLeft: '14px' }}
                    disabled={submitting}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Password</label>
                  <input
                    type="password"
                    className="form-control"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    style={{ paddingLeft: '14px' }}
                    disabled={submitting}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">System Role</label>
                  <select
                    className="form-control"
                    value={formData.roleId}
                    onChange={(e) => setFormData({ ...formData, roleId: e.target.value })}
                    required
                    style={{ paddingLeft: '12px' }}
                    disabled={submitting}
                  >
                    {roles.map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>

                {/* Show specialization if Support Engineer */}
                {isEngineerRole(formData.roleId) && (
                  <div className="form-group">
                    <label className="form-label">Category Specialization</label>
                    <select
                      className="form-control"
                      value={formData.specialization}
                      onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                      style={{ paddingLeft: '12px' }}
                      disabled={submitting}
                    >
                      <option value="">Select Specialization...</option>
                      {CATEGORY_SPECIALIZATIONS.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Department</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Infrastructure, IT Operations"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    style={{ paddingLeft: '14px' }}
                    disabled={submitting}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select
                    className="form-control"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    required
                    style={{ paddingLeft: '12px' }}
                    disabled={submitting}
                  >
                    <option value="Active">Active</option>
                    <option value="Suspended">Suspended</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" style={{ width: 'auto' }} onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ width: 'auto' }} disabled={submitting}>
                  {submitting ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="panel-header" style={{ padding: '20px 24px', margin: 0 }}>
              <h3 className="panel-title">Edit Account Profile</h3>
              <button className="icon-btn" onClick={() => setShowEditModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleEditSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    style={{ paddingLeft: '14px' }}
                    disabled={submitting}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input
                    type="email"
                    className="form-control"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    style={{ paddingLeft: '14px' }}
                    disabled={submitting}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">System Role</label>
                  <select
                    className="form-control"
                    value={formData.roleId}
                    onChange={(e) => setFormData({ ...formData, roleId: e.target.value })}
                    required
                    style={{ paddingLeft: '12px' }}
                    disabled={submitting}
                  >
                    {roles.map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>

                {isEngineerRole(formData.roleId) && (
                  <div className="form-group">
                    <label className="form-label">Category Specialization</label>
                    <select
                      className="form-control"
                      value={formData.specialization}
                      onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                      style={{ paddingLeft: '12px' }}
                      disabled={submitting}
                    >
                      <option value="">Select Specialization...</option>
                      {CATEGORY_SPECIALIZATIONS.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Department</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    style={{ paddingLeft: '14px' }}
                    disabled={submitting}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select
                    className="form-control"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    required
                    style={{ paddingLeft: '12px' }}
                    disabled={submitting}
                  >
                    <option value="Active">Active</option>
                    <option value="Suspended">Suspended</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
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

      {/* Details View Modal */}
      {showDetailsModal && selectedUser && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div className="panel-header" style={{ padding: '20px 24px', margin: 0 }}>
              <h3 className="panel-title">User Account Directory Details</h3>
              <button className="icon-btn" onClick={() => setShowDetailsModal(false)}><X size={18} /></button>
            </div>
            <div className="modal-body" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '24px', borderBottom: '1px solid var(--border-color)', paddingBottom: '20px' }}>
                <div className="avatar-initials" style={{ width: '64px', height: '64px', fontSize: '24px' }}>
                  {selectedUser.name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h4 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 4px 0' }}>{selectedUser.name}</h4>
                  <span className={`badge ${getStatusBadgeClass(selectedUser.status)}`} style={{ ...getStatusBadgeStyle(selectedUser.status), marginRight: '8px' }}>
                    {selectedUser.status || 'Active'}
                  </span>
                  <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>UID: {selectedUser.id}</span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Email Address</div>
                  <div style={{ fontSize: '15px', fontWeight: 500, marginTop: '4px', wordBreak: 'break-all' }}>{selectedUser.email}</div>
                </div>

                <div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Assigned Role</div>
                  <div style={{ fontSize: '15px', fontWeight: 500, marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Shield size={16} style={{ color: 'var(--color-primary)' }} />
                    {selectedUser.role_name}
                  </div>
                </div>

                {selectedUser.specialization && (
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Category Specialization</div>
                    <div style={{ fontSize: '15px', fontWeight: 600, marginTop: '4px', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Wrench size={16} />
                      {selectedUser.specialization}
                    </div>
                  </div>
                )}

                {selectedUser.role_name === 'Support Engineer' && (
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Current Open Workload</div>
                    <div style={{ fontSize: '15px', fontWeight: 600, marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Ticket size={16} style={{ color: 'var(--color-primary)' }} />
                      {selectedUser.open_tickets_count || 0} active tickets
                    </div>
                  </div>
                )}

                <div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Department</div>
                  <div style={{ fontSize: '15px', fontWeight: 500, marginTop: '4px' }}>{selectedUser.department || 'Not Assigned'}</div>
                </div>

                <div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Registration Date</div>
                  <div style={{ fontSize: '15px', fontWeight: 500, marginTop: '4px' }}>{new Date(selectedUser.created_at).toLocaleDateString()}</div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" style={{ width: 'auto' }} onClick={() => setShowDetailsModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
