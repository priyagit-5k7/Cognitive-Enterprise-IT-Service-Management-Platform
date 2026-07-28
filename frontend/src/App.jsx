import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import ToastProvider from './components/ToastProvider';

// Auth Pages
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';

// Phase 1-11 Core Pages
import Dashboard from './pages/Dashboard';
import UserManagement from './pages/UserManagement';
import RoleManagement from './pages/RoleManagement';
import Tickets from './pages/Tickets';
import TicketDetail from './pages/TicketDetail';
import AiIntelligence from './pages/AiIntelligence';
import KnowledgeBase from './pages/KnowledgeBase';
import Chatbot from './pages/Chatbot';
import SlaPolicies from './pages/SlaPolicies';
import NotificationPage from './pages/NotificationPage';
import AnalyticsDashboard from './pages/AnalyticsDashboard';
import SearchResultsPage from './pages/SearchResultsPage';

// Phase 12-23 Advanced Pages
import DocumentManagement from './pages/DocumentManagement';
import AssetManagement from './pages/AssetManagement';
import ChangeManagement from './pages/ChangeManagement';
import ProblemManagement from './pages/ProblemManagement';
import ReleaseManagement from './pages/ReleaseManagement';
import CmdbPage from './pages/CmdbPage';
import WorkflowAutomation from './pages/WorkflowAutomation';
import AiPlatform from './pages/AiPlatform';
import DevOpsPage from './pages/DevOpsPage';
import SecurityManagement from './pages/SecurityManagement';
import MonitoringDashboard from './pages/MonitoringDashboard';
import EnterpriseAiCommandCenter from './pages/EnterpriseAiCommandCenter';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <NotificationProvider>
          <BrowserRouter>
            <ToastProvider />
            <Routes>
              {/* Public Auth Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />

              {/* Protected Workspace Layout */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }
              >
                {/* Phase 1-11 Routes */}
                <Route index element={<Dashboard />} />
                <Route path="tickets" element={<ProtectedRoute requiredPermission="tickets:read"><Tickets /></ProtectedRoute>} />
                <Route path="tickets/:id" element={<ProtectedRoute requiredPermission="tickets:read"><TicketDetail /></ProtectedRoute>} />
                <Route path="users" element={<ProtectedRoute requiredPermission="users:read"><UserManagement /></ProtectedRoute>} />
                <Route path="roles" element={<ProtectedRoute requiredPermission="roles:read"><RoleManagement /></ProtectedRoute>} />
                <Route path="ai-intelligence" element={<ProtectedRoute><AiIntelligence /></ProtectedRoute>} />
                <Route path="knowledge-base" element={<ProtectedRoute><KnowledgeBase /></ProtectedRoute>} />
                <Route path="chatbot" element={<ProtectedRoute><Chatbot /></ProtectedRoute>} />
                <Route path="sla-policies" element={<ProtectedRoute requiredPermission="manage_users"><SlaPolicies /></ProtectedRoute>} />
                <Route path="notifications" element={<ProtectedRoute><NotificationPage /></ProtectedRoute>} />
                <Route path="analytics" element={<ProtectedRoute><AnalyticsDashboard /></ProtectedRoute>} />
                <Route path="search" element={<ProtectedRoute><SearchResultsPage /></ProtectedRoute>} />

                {/* Phase 12-23 Routes */}
                <Route path="documents" element={<ProtectedRoute><DocumentManagement /></ProtectedRoute>} />
                <Route path="assets" element={<ProtectedRoute><AssetManagement /></ProtectedRoute>} />
                <Route path="changes" element={<ProtectedRoute><ChangeManagement /></ProtectedRoute>} />
                <Route path="problems" element={<ProtectedRoute><ProblemManagement /></ProtectedRoute>} />
                <Route path="releases" element={<ProtectedRoute><ReleaseManagement /></ProtectedRoute>} />
                <Route path="cmdb" element={<ProtectedRoute><CmdbPage /></ProtectedRoute>} />
                <Route path="workflows" element={<ProtectedRoute><WorkflowAutomation /></ProtectedRoute>} />
                <Route path="ai-platform" element={<ProtectedRoute><AiPlatform /></ProtectedRoute>} />
                <Route path="devops" element={<ProtectedRoute><DevOpsPage /></ProtectedRoute>} />
                <Route path="security" element={<ProtectedRoute requiredPermission="settings:read"><SecurityManagement /></ProtectedRoute>} />
                <Route path="monitoring" element={<ProtectedRoute requiredPermission="settings:read"><MonitoringDashboard /></ProtectedRoute>} />
                <Route path="enterprise-ai" element={<ProtectedRoute requiredPermission="settings:read"><EnterpriseAiCommandCenter /></ProtectedRoute>} />

                {/* Wildcard fallback inside layout */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>

              {/* Wildcard fallback outside layout */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </NotificationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
