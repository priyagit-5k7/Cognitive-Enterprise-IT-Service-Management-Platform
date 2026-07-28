import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { ShieldAlert } from 'lucide-react';

const ProtectedRoute = ({ children, requiredPermission }) => {
  const { user, loading, hasPermission } = useContext(AuthContext);

  if (loading) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-app)', color: 'var(--text-muted)' }}>
        Loading session...
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Check RBAC permission if specified
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return (
      <div className="panel" style={{ maxWidth: '500px', margin: '40px auto', textAlign: 'center', padding: '40px' }}>
        <div style={{ display: 'inline-flex', padding: '16px', borderRadius: '50%', backgroundColor: 'var(--status-error-bg)', color: 'var(--status-error)', marginBottom: '20px' }}>
          <ShieldAlert size={48} />
        </div>
        <h3 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '12px' }}>Access Denied</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '15px', marginBottom: '24px' }}>
          Your security role (<strong>{user.role_name}</strong>) does not have authorization to view this resource. Required permission: <code>{requiredPermission}</code>
        </p>
        <a href="/" className="btn btn-primary" style={{ display: 'inline-flex', width: 'auto' }}>
          Return to Dashboard
        </a>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;
