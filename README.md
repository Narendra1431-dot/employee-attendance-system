# Professional Employee Attendance System

A high-fidelity, industry-grade attendance management system built with **FastAPI**, **SQLAlchemy**, and **Vanilla JavaScript**.

## 🚀 Key Features
- **Secure Authentication**: JWT-based auth with RBAC (Admin, Manager, Employee).
- **Automated Attendance**: Intelligent check-in/out with Late & Half-Day detection based on configurable office hours.
- **Admin Dashboard**: Daily stats, searchable employee CRUD, and system integrity reports.
- **Data Export**: Export attendance records to CSV for any date range or employee.
- **Audit Trail**: Every manual correction is logged with the reason and the administrator's ID.
- **Responsive UI**: Modern Glassmorphism design optimized for all screen sizes.

## 🛠️ Setup & Installation (Cross-Platform)

### Prerequisites
- **Docker & Docker Compose** (Recommended) OR
- **Python 3.10+** and **Node.js** (if you plan to modify frontend assets)

### 🐋 Option 1: Docker Deployment (Easiest)
This is the best way to run the project on **Windows, macOS, or Linux** with zero configuration.

1.  **Install Docker Desktop**: [Download here](https://www.docker.com/products/docker-desktop/)
2.  **Clone/Copy project**: Ensure all files are in a local directory.
3.  **Run the System**:
    ```bash
    docker-compose up --build
    ```
4.  **Access**: Open `http://localhost:8888` in your browser.

---

### 🐍 Option 2: Manual Setup (Development)

#### 1. Backend Setup
1.  **Create a Virtual Environment**:
    ```bash
    python -m venv venv
    source venv/bin/activate  # On Windows: venv\Scripts\activate
    ```
2.  **Install Dependencies**:
    ```bash
    pip install -r backend/requirements.txt
    ```
3.  **Environment Variables**:
    Create a `.env` file in the `backend/` directory:
    ```env
    DATABASE_URL=sqlite:///./attendance.db
    SECRET_KEY=yoursecretkeyhere
    ALGORITHM=HS256
    ```
4.  **Initialize Database**:
    ```bash
    cd backend
    alembic upgrade head
    ```
5.  **Run Server**:
    ```bash
    uvicorn app.main:app --reload --port 8888
    ```

#### 2. Frontend Setup
The frontend is served statically by FastAPI. Simply ensure the `/frontend` directory is in the same parent folder as the `/backend` directory.

---

### 🌐 Firewall & Network (Other Systems)
If you want to access the app from **another device on the same network**:
1. Find your host IP (e.g., `192.168.1.10`).
2. Ensure your firewall allows inbound traffic on port `8888`.
3. Access via `http://192.168.1.10:8888`.

## 🔐 Credentials (Initial)
Register an Admin or Manager account directly from the login page! The first registered user can manage systemic settings.

## 🧪 Testing
Run unit tests for core attendance logic:
```bash
pytest backend/tests
```

## 📁 Project Structure
- `backend/app/models`: SQLAlchemy data models.
- `backend/app/routes`: RESTful API endpoints.
- `backend/app/core/dependencies`: Role-based permission logic.
- `frontend/static`: Modern CSS and orchestration JS.
- `frontend/templates`: Semantic HTML views.
