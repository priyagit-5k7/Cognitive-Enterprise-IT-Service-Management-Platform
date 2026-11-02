# ROLE ACCESS MATRIX & DEVELOPMENT TEST ACCOUNTS
**Smart Support Desk — Cognitive Enterprise IT Service Management Platform**

---

## 1. Role Access Matrix

| Role | Database `name` | Default Dashboard View | Permitted Modules & Navigation | Backend API Restrictions | Ticket Queue Visibility |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **System Administrator** | `Admin` | System Overview & Telemetry Controls | Full access to all 15+ modules: Users, Roles, Security, Monitoring, Enterprise AI, CMDB, Workflows, SLA Policies, ITIL. | Full CRUD across all endpoints. | All tickets across the enterprise. |
| **IT Operations Manager** | `Manager` | Service Delivery & SLA Compliance | Dashboard, Tickets, Team Analytics, SLA Performance, Change Control, Problem Management, Releases, Assets, CMDB, Users list. | Blocked from `/roles`, `/security`, `/monitoring/alerts/resolve` without explicit admin permissions. | All team tickets & unassigned queue. |
| **Support Engineer** | `Support Engineer` | Engineering Workbench & Assigned Queue | Dashboard, Tickets Queue, Knowledge Base, AI Copilot, Documents, Problem KEDB, Asset Lookup, CMDB View. | Blocked from `/users`, `/roles`, `/security`, `/monitoring`, `/analytics`. | All tickets in queue; focus on assigned pool. |
| **Enterprise Client** | `Client` | Self-Service Portal & Request Tracker | Dashboard (Personal Tickets), My Tickets, Submit Ticket, Knowledge Base, AI Support Assistant Chatbot, Notifications. | Restricted to own data: `tickets:create`, `tickets:read` (filtered by `created_by = user.id`), `knowledge:read`. | **Strict tenant isolation**: Can ONLY see tickets created by their user account. |

---

## 2. Development Test Accounts

Use these accounts to test each role's distinct UI, navigation, and API security:

| Role | Email Address | Password | Purpose & Verification Focus |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin@desk.com` | `Admin@123456` | Full system governance, user/role management, security logs, telemetry. |
| **IT Operations Manager** | `manager@desk.com` | `Password@123` | Operations dashboard, SLA performance metrics, team analytics, change approvals. |
| **Support Engineer** | `engineer@desk.com` | `Password@123` | Engineering workbench, ticket triage, AI recommendations, resolution tools. |
| **Enterprise Client** | `client@desk.com` | `Password@123` | Self-service portal, raise tickets, view personal requests, AI chatbot assistance. |
