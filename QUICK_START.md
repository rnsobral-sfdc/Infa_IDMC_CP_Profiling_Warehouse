# Quick Start Guide

Get up and running with IDMC Profiling Extractor in 5 minutes!

## Prerequisites Check

```bash
# Check Python version (need 3.10+)
python --version  # Windows
python3 --version  # macOS/Linux

# Check Node.js version (need 16+)
node --version

# Check npm version
npm --version

# Check Git
git --version
```

If any are missing, see [SETUP.md](SETUP.md) for installation instructions.

## Installation

### 1. Get the Code

```bash
git clone https://github.com/YOUR_USERNAME/idmc-profiling-extractor.git
cd idmc-profiling-extractor
```

### 2. Backend Setup (5 commands)

**Windows:**
```powershell
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python -c "from app.core.database import init_db; init_db()"
```

**macOS/Linux:**
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python -c "from app.core.database import init_db; init_db()"
```

### 3. Frontend Setup (2 commands)

In a **new terminal window**:

```bash
cd frontend
npm install
```

## Running the Application

### Terminal 1: Backend

**Windows:**
```powershell
cd backend
venv\Scripts\activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**macOS/Linux:**
```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

✅ Backend running at: **http://localhost:8000**

### Terminal 2: Frontend

```bash
cd frontend
npm run dev
```

✅ Frontend running at: **http://localhost:3000**

## First Sync

1. Open browser: **http://localhost:3000**
2. Click **Connections** in sidebar
3. Click **Add Connection** button
4. Fill in your IDMC details:
   ```
   Name: My IDMC Org
   Base URL: https://usw1.dm-us.informaticacloud.com/saas
   Profiling URL: https://na1-dqprofile.dm-us.informaticacloud.com/metric-store/api/v1
   Username: your-username
   Password: your-password
   ```
5. Click **Test Connection**
6. If successful, click **Save**
7. Click **Sync Jobs** in sidebar
8. Click **Create Sync Job**
9. Select your connection, set limits (optional)
10. Click **Create**
11. Click **Run** to start sync

## Verify It Works

### Check Backend API
Open: http://localhost:8000/docs

You should see the Swagger API documentation.

### Check Database
After sync completes, the SQLite database should exist:
```bash
# Check file exists
ls backend/idmc_profiling.db  # macOS/Linux
dir backend\idmc_profiling.db  # Windows

# Check tables
sqlite3 backend/idmc_profiling.db ".tables"
```

### Check Frontend
Navigate through the UI:
- **Dashboard**: See overview stats
- **Profiling Tasks**: View all tasks
- **Reports**: See column quality and rule validation metrics

## What's Next?

- **[Full Documentation](README.md)**: Complete feature list
- **[Setup Guide](SETUP.md)**: Detailed platform-specific instructions
- **[BI Integration](README.md#bi-integration)**: Connect Power BI/Tableau
- **[API Reference](http://localhost:8000/docs)**: Explore all endpoints

## Common Issues

### "Port already in use"
Kill the process using the port:
```bash
# Windows
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# macOS/Linux
lsof -ti:8000 | xargs kill -9
```

### "Module not found"
Ensure virtual environment is activated:
```bash
# Windows
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate
```

### "Connection failed"
- Check IDMC credentials
- Verify base_url matches your region
- Check network/firewall settings

### "Database locked"
Stop all backend processes and restart:
```bash
pkill -f uvicorn  # macOS/Linux
taskkill /F /IM python.exe  # Windows (if needed)
```

## Stopping the Application

1. Frontend: Press `Ctrl+C` in terminal
2. Backend: Press `Ctrl+C` in terminal
3. Deactivate venv: `deactivate`

## Quick Commands Reference

```bash
# Start backend
cd backend && source venv/bin/activate && uvicorn app.main:app --reload

# Start frontend
cd frontend && npm run dev

# Run tests
cd backend && pytest

# Check code style
cd backend && flake8 app/
cd frontend && npm run lint

# Update dependencies
cd backend && pip install -r requirements.txt --upgrade
cd frontend && npm update

# Clean restart
cd backend && rm -f idmc_profiling.db && python -c "from app.core.database import init_db; init_db()"
cd frontend && rm -rf .next node_modules && npm install
```

## Getting Help

- Read full [README.md](README.md)
- Check [Troubleshooting](SETUP.md#troubleshooting) section
- Open an issue on GitHub
- Check API logs in backend console

Happy profiling! 🚀
