
# Cognitive Enterprise IT Service Management Platform

This is the repository for the Cognitive Enterprise IT Service Management Platform project.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
=======
# Cognitive-Enterprise-IT-Service-Management-Platform
A next-generation Cognitive Enterprise IT Service Management (ITSM) Platform designed to streamline IT operations. It leverages advanced automation, intelligent ticketing, and a centralized CMDB to enhance incident resolution, optimize resource allocation, and deliver proactive, AI-driven IT service delivery for modern enterprises.

# Cognitive Enterprise IT Service Management Platform
### AI-Powered Smart Support Desk

An intelligent IT Service Management (ITSM) platform designed to streamline enterprise IT support operations through centralized ticket management, AI-assisted ticket analysis, intelligent assignment, SLA monitoring, and historical knowledge-based resolution assistance.

---

## 1. Project Overview

The **Cognitive Enterprise IT Service Management Platform** is designed to improve traditional IT support desk operations by combining IT Service Management workflows with Artificial Intelligence and Machine Learning capabilities.

In conventional IT support environments, incidents and service requests are often handled manually. Support teams may experience delays in ticket classification, priority assignment, engineer allocation, issue resolution, and tracking recurring problems.

This project proposes a centralized platform that helps organizations manage the complete IT support lifecycle while using intelligent assistance to improve operational efficiency and support decision-making.

The platform aims to help support teams identify issues, prioritize tickets, recommend suitable engineers, and retrieve relevant historical resolution information.

## 2. Problem Statement

Traditional IT service desks face several challenges:

- Manual ticket classification and prioritization.
- Delays in assigning tickets to appropriate support engineers.
- Difficulty identifying recurring incidents.
- Limited reuse of previously resolved ticket information.
- Inefficient SLA tracking and escalation.
- Lack of centralized visibility into IT support activities.
- Time-consuming communication between users and support teams.

These challenges can increase resolution time, reduce support efficiency, and negatively affect user satisfaction.

The proposed platform addresses these problems through centralized ITSM workflows and AI-assisted support capabilities.

## 3. Project Objectives

- Develop a centralized enterprise IT support management system.
- Implement secure authentication and role-based access control.
- Automate ticket classification and priority prediction where supported by the configured AI components.
- Assist in assigning tickets to appropriate support engineers.
- Maintain historical ticket and resolution information.
- Provide knowledge-based resolution recommendations.
- Monitor Service Level Agreements (SLAs).
- Support incident, service request, problem, and change management workflows.
- Provide dashboards and reports for monitoring support activities.
- Improve transparency, traceability, and operational efficiency.

## 4. Key Features and Modules

| Module | Description |
|---|---|
| Authentication | Secure user login and authentication |
| Role-Based Access Control | Access management based on user roles |
| User Management | Manage users and support personnel |
| Ticket Management | Create, update, assign, track, and resolve tickets |
| AI Ticket Classification | Identify ticket categories from submitted descriptions |
| Priority Prediction | Assist in determining ticket urgency and priority |
| Intelligent Assignment | Recommend suitable support engineers |
| Knowledge Assistance | Retrieve relevant historical tickets and resolution information |
| Incident Management | Track and manage IT incidents |
| Service Request Management | Handle user service requests |
| Problem Management | Identify and manage recurring issues |
| Change Management | Manage IT infrastructure and service changes |
| SLA Management | Monitor service targets and escalation conditions |
| Notifications | Communicate ticket updates and important events |
| Dashboard and Analytics | Display ticket statistics and operational insights |
| CMDB | Maintain configuration item information and relationships |

*The availability and completeness of individual modules depend on the current implementation.*

## 5. System Architecture

The platform follows a layered architecture.

```text
                 Users
                   |
                   v
          React Frontend
          (Vite / JavaScript)
                   |
                   v
          Node.js / Express
             REST APIs
                   |
          +--------+--------+
          |                 |
          v                 v
     PostgreSQL        Python AI Service
      Database          (FastAPI)
          |                 |
          |          AI Processing
          |          and Analysis
          |                 |
          +--------+--------+
                   |
                   v
       Ticket and ITSM Workflows
                   |
          +--------+--------+
          |                 |
          v                 v
     Notifications       SLA Monitoring
     and Email            and Escalation
```

### Architecture Components

**Frontend**
- React
- Vite
- JavaScript / JSX
- CSS

**Backend**
- Node.js
- Express.js
- REST API architecture
- Socket.IO for real-time communication

**Database**
- PostgreSQL
- Relational data management

**AI Service**
- Python
- FastAPI
- AI-assisted ticket processing and analysis

**Additional Services**
- Email notifications
- Background job scheduling
- SLA monitoring
- Real-time updates

## 6. Technology Stack

| Technology | Purpose |
|---|---|
| React | Frontend user interface |
| Vite | Frontend development and build tool |
| JavaScript | Application development |
| Node.js | Backend runtime |
| Express.js | Backend API framework |
| Python | AI service development |
| FastAPI | AI service API framework |
| PostgreSQL | Relational database |
| Socket.IO | Real-time communication |
| REST APIs | Frontend-backend communication |
| Git and GitHub | Version control and source code management |

## 7. Project Structure

```text
Cognitive-Enterprise-IT-Service-Management-Platform/
│
├── backend/
│   ├── controllers/
│   ├── routes/
│   ├── middleware/
│   ├── services/
│   ├── config/
│   ├── migrations/
│   ├── server.js
│   └── package.json
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── context/
│   │   ├── utils/
│   │   └── config.js
│   └── package.json
│
├── start-local.bat
├── launch-smart-desk.bat
├── README.md
└── .gitignore
```

*The structure above is a high-level overview. Individual directories and files may vary as development progresses.*

## 8. Installation and Setup

### Prerequisites

Install the following software:

- Node.js and npm
- PostgreSQL
- Python 3
- Git
- Visual Studio Code (recommended)

### Step 1: Clone the Repository

```bash
git clone https://github.com/priyagit-5k7/Cognitive-Enterprise-IT-Service-Management-Platform.git
```

Navigate to the project:

```bash
cd Cognitive-Enterprise-IT-Service-Management-Platform
```

### Step 2: Configure the Backend

```bash
cd backend
npm install
```

Create a `.env` file using the provided example:

```bash
copy .env.example .env
```

Configure the required environment variables in `backend/.env`.

Example:

```env
PORT=5000
NODE_ENV=development
DATABASE_URL=your_postgresql_connection_string
```

Add other required authentication, email, and AI service configuration values according to the project's environment setup.

**Important:** Never commit `.env` files, passwords, API keys, or private credentials to GitHub.

### Step 3: Configure the Frontend

Open another terminal:

```bash
cd frontend
npm install
```

Configure the frontend API base URL to point to the local backend:

```text
http://localhost:5000/api/v1
```

Use the project's existing configuration mechanism rather than hardcoding production or local URLs throughout the application.

### Step 4: Start the Application

From the project root, run:

```powershell
.\start-local.bat
```

The launcher is intended to start the local PostgreSQL service, backend, and frontend.

Alternatively, start the backend manually:

```bash
cd backend
npm run dev
```

Start the frontend in another terminal:

```bash
cd frontend
npm run dev
```

### Step 5: Access the Application

| Service | Local URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:5000/api/v1 |
| Backend Health | http://localhost:5000/health |

Keep the backend and frontend processes running while accessing the application.

## 9. API Overview

The backend exposes REST API endpoints for application operations.

The API base URL is:

```text
http://localhost:5000/api/v1
```

Example endpoint categories:

| API Category | Purpose |
|---|---|
| Authentication | Login and authentication operations |
| Users | User management |
| Tickets | Ticket creation and management |
| Incidents | Incident tracking |
| Services | Service request management |
| SLA | SLA policies and monitoring |
| Analytics | Dashboard and reporting |
| CMDB | Configuration item management |

Exact routes and request formats should be verified against the backend implementation.

## 10. AI-Assisted Capabilities

The platform is designed to incorporate AI capabilities into IT support workflows.

### Ticket Classification
Analyzes submitted ticket descriptions to identify the appropriate issue category.

### Priority Prediction
Assists in determining ticket priority using issue characteristics and available ticket information.

### Intelligent Engineer Recommendation
Helps identify suitable support engineers based on relevant assignment criteria.

### Historical Resolution Assistance
Uses previously resolved ticket information and knowledge resources to suggest potentially relevant troubleshooting steps.

### Continuous Improvement
Historical ticket outcomes can support future improvements to classification, recommendations, and knowledge retrieval.

*The actual AI model, training methodology, evaluation results, and deployment configuration should be documented according to the implemented system. Rule-based or mock responses should not be presented as trained machine-learning predictions.*

## 11. Expected Benefits

- Reduced manual effort in IT support operations.
- Improved ticket organization and visibility.
- Faster identification of ticket priorities.
- Better support engineer allocation.
- Reuse of historical issue-resolution knowledge.
- Improved SLA monitoring.
- Centralized management of IT support activities.
- Better operational reporting and decision-making.

## 12. Future Enhancements

- Integration of trained machine-learning models.
- Advanced Retrieval-Augmented Generation (RAG) for knowledge assistance.
- Semantic search across historical tickets.
- Automated resolution recommendations.
- Advanced engineer workload optimization.
- Predictive SLA breach detection.
- Integration with enterprise monitoring systems.
- Enhanced CMDB dependency visualization.
- Production deployment with cloud-hosted database and backend services.

## 13. Project Type

**Category:** Hybrid – Application Development and AI/ML Research

**Domain:** Artificial Intelligence, Machine Learning, Enterprise IT Service Management

**Application Area:** IT Support Automation and Service Management

## 14. Contributors

Developed as a Final Year Project.

## 15. License

This project is distributed under the MIT License. Refer to the `LICENSE` file for details.

---

**Cognitive Enterprise IT Service Management Platform – Towards Smarter, Faster, and More Intelligent IT Support.**
