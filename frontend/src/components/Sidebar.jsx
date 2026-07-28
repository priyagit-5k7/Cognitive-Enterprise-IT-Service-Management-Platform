import React, { useContext, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import {
  LayoutDashboard, Users, ShieldCheck, LogOut, Key, Ticket, BrainCircuit,
  BookOpen, MessageSquare, Clock, Bell, BarChart2, Search,
  FileText, Package, GitMerge, AlertTriangle, Rocket, Database,
  Workflow, Cpu, GitBranch, Lock, Activity, ChevronDown, ChevronRight
} from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';

const SidebarGroup = ({ label, icon: Icon, children, defaultOpen = false }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <li className="sidebar-group">
      <button
        className="sidebar-group-header"
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: '8px', width: '100%',
          background: 'none', border: 'none', cursor: 'pointer',
          padding: '7px 12px', borderRadius: '8px', fontSize: '11px',
          fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase',
          color: 'var(--text-muted, #94a3b8)', justifyContent: 'space-between',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {Icon && <Icon size={13} />} {label}
        </span>
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
      </button>
      {open && <ul style={{ listStyle: 'none', padding: '0 0 0 8px', margin: 0 }}>{children}</ul>}
    </li>
  );
};

const SidebarLink = ({ to, icon: Icon, label, badge, onClick }) => (
  <li className="sidebar-item" onClick={onClick}>
    <NavLink to={to} className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
      {Icon && <Icon size={17} />}
      <span>{label}</span>
      {badge != null && badge > 0 && (
        <span style={{
          marginLeft: 'auto', background: '#6366F1', color: '#fff',
          fontSize: '9px', fontWeight: 700, borderRadius: '999px',
          padding: '1px 5px', minWidth: '16px', textAlign: 'center',
        }}>{badge > 99 ? '99+' : badge}</span>
      )}
    </NavLink>
  </li>
);

const Sidebar = ({ isOpen, toggleMobileMenu }) => {
  const { user, logout, hasPermission } = useContext(AuthContext);
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };
  const getInitials = (name) => {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };
  const tm = toggleMobileMenu;

  return (
    <aside className={`sidebar ${isOpen ? 'mobile-open' : ''}`} style={{ overflowY: 'auto' }}>
      <div className="sidebar-brand">
        <Key size={24} />
        <span>Smart Desk</span>
      </div>

      <ul className="sidebar-menu">

        {/* ── CORE ─────────────────────────────────── */}
        <SidebarLink to="/" icon={LayoutDashboard} label="Dashboard" onClick={tm} />
        {hasPermission('tickets:read') && (
          <SidebarLink to="/tickets" icon={Ticket} label="Tickets" onClick={tm} />
        )}
        <SidebarLink to="/notifications" icon={Bell} label="Notifications" badge={unreadCount} onClick={tm} />
        <SidebarLink to="/search" icon={Search} label="Search" onClick={tm} />

        {/* ── SERVICE MANAGEMENT ───────────────────── */}
        <SidebarGroup label="Service Mgmt" icon={BarChart2} defaultOpen={true}>
          {hasPermission('analytics:read') && (
            <SidebarLink to="/analytics" icon={BarChart2} label="Analytics" onClick={tm} />
          )}
          <SidebarLink to="/knowledge-base" icon={BookOpen} label="Knowledge Base" onClick={tm} />
          <SidebarLink to="/documents" icon={FileText} label="Documents" onClick={tm} />
          {hasPermission('manage_users') && (
            <SidebarLink to="/sla-policies" icon={Clock} label="SLA Policies" onClick={tm} />
          )}
        </SidebarGroup>

        {/* ── ITSM MODULES ─────────────────────────── */}
        <SidebarGroup label="ITSM" icon={GitMerge} defaultOpen={true}>
          <SidebarLink to="/assets" icon={Package} label="Assets" onClick={tm} />
          <SidebarLink to="/changes" icon={GitMerge} label="Change Mgmt" onClick={tm} />
          <SidebarLink to="/problems" icon={AlertTriangle} label="Problems" onClick={tm} />
          <SidebarLink to="/releases" icon={Rocket} label="Releases" onClick={tm} />
        </SidebarGroup>

        {/* ── INFRASTRUCTURE ───────────────────────── */}
        <SidebarGroup label="Infrastructure" icon={Database}>
          <SidebarLink to="/cmdb" icon={Database} label="CMDB" onClick={tm} />
          <SidebarLink to="/workflows" icon={Workflow} label="Workflows" onClick={tm} />
          <SidebarLink to="/devops" icon={GitBranch} label="DevOps" onClick={tm} />
        </SidebarGroup>

        {/* ── AI PLATFORM ──────────────────────────── */}
        <SidebarGroup label="AI Platform" icon={BrainCircuit} defaultOpen={true}>
          <SidebarLink to="/ai-intelligence" icon={BrainCircuit} label="AI Insights" onClick={tm} />
          <SidebarLink to="/ai-platform" icon={Cpu} label="AI Studio" onClick={tm} />
          <SidebarLink to="/chatbot" icon={MessageSquare} label="AI Assistant" onClick={tm} />
          <SidebarLink to="/enterprise-ai" icon={Rocket} label="AI Command Center" onClick={tm} />
        </SidebarGroup>

        {/* ── ADMIN ────────────────────────────────── */}
        <SidebarGroup label="Administration" icon={ShieldCheck}>
          {hasPermission('users:read') && (
            <SidebarLink to="/users" icon={Users} label="Users" onClick={tm} />
          )}
          {hasPermission('roles:read') && (
            <SidebarLink to="/roles" icon={ShieldCheck} label="Roles" onClick={tm} />
          )}
          <SidebarLink to="/security" icon={Lock} label="Security" onClick={tm} />
          <SidebarLink to="/monitoring" icon={Activity} label="Monitoring" onClick={tm} />
        </SidebarGroup>

      </ul>

      <div className="sidebar-footer">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {user && (
            <div className="user-profile-badge">
              <div className="avatar-initials">{getInitials(user.name)}</div>
              <div className="user-badge-info">
                <span className="user-badge-name">{user.name}</span>
                <span className="user-badge-role">{user.role_name}</span>
              </div>
            </div>
          )}
          <button onClick={handleLogout} className="btn btn-secondary" style={{ padding: '8px 12px', fontSize: '13px', justifyContent: 'center' }}>
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
