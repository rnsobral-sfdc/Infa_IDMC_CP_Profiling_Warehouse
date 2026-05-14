# IDMC Profiling Extractor

A comprehensive data warehouse solution for extracting, storing, and analyzing data quality profiling data from Informatica Data Quality (IDMC). Built with FastAPI (Python), Next.js (React), and SQLite, featuring a star schema design optimized for business intelligence.

![Platform Support](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-blue)
![Python](https://img.shields.io/badge/python-3.10%2B-blue)
![Node](https://img.shields.io/badge/node-16%2B-green)
![License](https://img.shields.io/badge/license-Apache%202.0-blue)

---

## ⚠️ IMPORTANT DISCLAIMER - Educational Use Only

**This software is provided for educational and informational purposes only.**

This software is intended solely to demonstrate and teach the use of Informatica Intelligent Data Management Cloud (IDMC) profiling APIs and does not constitute official Salesforce or Informatica documentation, product training, or professional services.

**THIS SOFTWARE IS PROVIDED "AS IS," WITHOUT WARRANTY OF ANY KIND**, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, ACCURACY, OR NONINFRINGEMENT.

IN NO EVENT SHALL SALESFORCE, INC., ITS AFFILIATES, OFFICERS, EMPLOYEES, AGENTS, OR LICENSORS BE LIABLE FOR ANY CLAIM, DAMAGES, OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT, OR OTHERWISE, ARISING FROM, OUT OF, OR IN CONNECTION WITH THIS SOFTWARE OR THE USE OR RELIANCE UPON ANY INFORMATION CONTAINED HEREIN.

### Key Points:
- ✅ Educational software for learning API usage patterns
- ✅ Always refer to official product documentation for production implementations
- ✅ API endpoints, parameters, and response formats may change without notice
- ✅ Test thoroughly in non-production environments before any production use
- ✅ Follow your organization's security and data governance policies

**This is not a substitute for official product documentation**, and no information herein should be relied upon for production system design or implementation.

For full legal disclaimer, see the [Disclaimer](frontend/pages/disclaimer.tsx) page in the application.

---

## Features

- **Automated Data Extraction**: Pull profiling data from IDMC REST APIs
- **Star Schema Design**: Optimized dimensional model for BI and analytics
- **Multi-Organization Support**: Handle multiple IDMC organizations
- **Incremental Sync**: Delta-only updates to minimize API calls
- **Rule Validation Metrics**: Track data quality rules across runs with trend charts
- **Column Quality Metrics**: Monitor data quality metrics with drift detection
- **Built-in Web UI**: Modern React-based interface for management
- **Direct Database Access**: SQLite database for Power BI, Tableau, Excel integration
- **Cross-Platform**: Works on Windows, macOS, and Linux

## Architecture

```
IDMC Cloud (REST APIs)
         ↓
Backend (FastAPI + SQLAlchemy)
         ↓
SQLite Database (Star Schema)
         ↓
Frontend (Next.js + FluentUI) + External BI Tools
```

## Technology Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| Backend | Python + FastAPI | Python 3.10+, FastAPI 0.100+ |
| Database | SQLite | 3.x |
| ORM | SQLAlchemy | 2.0+ |
| Frontend | Next.js + React | Next.js 13+, React 18+ |
| UI Library | Fluent UI v2 | 9.x |

## Prerequisites

- **Python** 3.10 or higher
- **Node.js** 16 or higher
- **npm** or **yarn** package manager
- **IDMC account** with access to Data Quality profiling
- **IDMC API credentials** (username/password)

## Quick Start

### Step 1: Get the Code

---

### 🎯 IF YOU ARE NOT A GIT USER

**Just want to run the application? Download the ZIP file.**

1. Go to: https://github.com/rnsobral-sfdc/Infa_IDMC_CP_Profiling_Warehouse
2. Click the green **Code** button
3. Click **Download ZIP**
4. Extract the ZIP file to your desired location (e.g., `C:\Projects` or `~/Projects`)
5. Open a terminal/command prompt and navigate to the extracted folder

**Windows:**
```bash
cd C:\Projects\Infa_IDMC_CP_Profiling_Warehouse-main
```

**macOS/Linux:**
```bash
cd ~/Projects/Infa_IDMC_CP_Profiling_Warehouse-main
```

**Then skip to Step 2 below.**

---

### 👥 IF YOU WANT TO COLLABORATE AND USE GIT

**For developers who want to contribute or track changes.**

```bash
# Clone the repository
git clone https://github.com/rnsobral-sfdc/Infa_IDMC_CP_Profiling_Warehouse.git
cd Infa_IDMC_CP_Profiling_Warehouse
```

**Why use Git?**
- ✅ Get updates easily with `git pull`
- ✅ Track your own changes with commits
- ✅ Create branches to experiment safely
- ✅ Contribute improvements via pull requests
- ✅ Collaborate with other developers

---

### Step 2: Start the Application

#### Automated Setup (Recommended)

**Windows:**
```bash
start_servers.bat
```

**macOS/Linux:**
```bash
# Make the script executable (first time only)
chmod +x start_servers.sh

# Run the script
./start_servers.sh
```

The script will automatically:
- ✓ Check and install Python dependencies
- ✓ Check and install Node.js dependencies  
- ✓ Generate encryption keys if missing
- ✓ Initialize the database
- ✓ Start both backend and frontend servers

Backend will be available at: **http://localhost:8000**  
Frontend will be available at: **http://localhost:3000**

---

### Alternative: Manual Setup (Advanced Users)

If you prefer complete control over the setup process:

**Backend Setup (Windows):**
```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python -c "from app.core.database import init_db; init_db()"
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Backend Setup (macOS/Linux):**
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python -c "from app.core.database import init_db; init_db()"
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Backend will be available at: **http://localhost:8000**

**Frontend Setup (All Platforms):**
```bash
cd frontend
npm install
npm run dev
```

Frontend will be available at: **http://localhost:3000**

## First-Time Configuration

1. Navigate to **http://localhost:3000**
2. Go to **Connections** page
3. Click **Add Connection**
4. Enter IDMC credentials:
   - **Name**: Friendly name for connection
   - **Base URL**: `https://usw1.dm-us.informaticacloud.com/saas` (adjust region as needed)
   - **Profiling URL**: `https://na1-dqprofile.dm-us.informaticacloud.com/metric-store/api/v1` (adjust region as needed)
   - **Username**: Your IDMC username
   - **Password**: Your IDMC password
5. Click **Test Connection** to verify
6. Go to **Sync Jobs** page
7. Create a new sync job with your connection
8. Click **Run** to start initial data sync

## Star Schema Overview

The data warehouse uses a star schema with the following structure:

### Dimension Tables
- `dim_dq_asset` - Data sources being profiled
- `dim_profiling_task` - Profiling task configurations
- `dim_profiling_run` - Individual profiling executions
- `dim_data_source_field` - Column metadata
- `dim_rule_mapplet` - Data quality rules
- `dim_rule_occurrence` - Rule configurations with thresholds
- `dim_connection` - Connection metadata
- `dim_column` - Column definitions
- `dim_time` - Time dimension

### Fact Tables
- `fact_profiling_result` - Main metrics table
- `fact_rule_input_mapping` - Rule input mappings
- `fact_rule_output_mapping` - Rule output mappings
- `fact_column_pattern` - Pattern analysis
- `fact_column_data_type` - Type inference
- `fact_column_value_frequency` - Value distribution
- `fact_api_log` - API call logs

## Key Features

### Rule Validation Metrics
- Track data quality rules across multiple runs
- Trend charts showing score evolution
- Configurable thresholds (low/high)
- Color-coded bands (red/yellow/green)
- Boolean/binary output detection (TRUE/FALSE, 0/1, Valid/Invalid)

### Column Quality Metrics
- Monitor distinct count, null count, blank count, etc.
- Drift detection between runs (percentage change)
- Color-coded alerts (yellow >5%, red >10%)
- Historical trending across all runs

### Sync Modes
- **Incremental Sync**: Only extract new profiling runs
- **Full Sync**: Extract all runs (useful after schema changes)

## Database Location

SQLite database file: `backend/idmc_profiling.db`

This file can be accessed directly by BI tools like Power BI, Tableau, Excel, etc.

## BI Integration

### Power BI
1. Open Power BI Desktop
2. Get Data → More... → SQLite Database
3. Browse to `backend/idmc_profiling.db`
4. Select tables and transform data

### Tableau
1. Connect → To a File → Other Databases (ODBC)
2. Select SQLite ODBC driver
3. Configure connection with database path
4. Drag tables to canvas

### Excel
Use ODBC connection with Microsoft Query or Power Query

## Configuration

### Environment Variables

Create a `.env` file in the `backend` directory:

```env
# Database
DATABASE_URL=sqlite:///./idmc_profiling.db

# Security (generate a secure key)
SECRET_KEY=your-secret-key-here

# CORS (adjust for production)
CORS_ORIGINS=["http://localhost:3000"]
```

### Frontend Configuration

Create a `.env.local` file in the `frontend` directory:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## API Documentation

Interactive API documentation available at:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## Development

### Running Tests

```bash
cd backend
pytest
```

### Code Quality

```bash
# Backend
cd backend
flake8 app/
black app/

# Frontend
cd frontend
npm run lint
```

## Troubleshooting

### "Fernet key must be 32 url-safe base64-encoded bytes" Error

**This is the most common error when starting for the first time.**

**Cause**: The `.env` file is missing or has an invalid encryption key.

**Solution**:
```bash
# Navigate to backend folder
cd backend

# Windows
venv\Scripts\activate
python generate_env.py

# macOS/Linux
source venv/bin/activate
python3 generate_env.py
```

This creates a valid `.env` file with a properly formatted encryption key.

### Nested folder after ZIP extraction

**Issue**: After extracting ZIP, you have nested folders like:
```
Infa_IDMC_CP_Profiling_Warehouse-main\Infa_IDMC_CP_Profiling_Warehouse-main\
```

**Solution**: Navigate to the inner folder where `start_servers.bat` is located:
```bash
cd Infa_IDMC_CP_Profiling_Warehouse-main\Infa_IDMC_CP_Profiling_Warehouse-main
start_servers.bat
```

Or simply move the contents of the inner folder up one level.

### Backend won't start
- Ensure Python 3.10+ is installed
- Check if port 8000 is already in use
- Verify virtual environment is activated
- Run `pip install -r requirements.txt` again

### Frontend won't start
- Ensure Node.js 16+ is installed
- Check if port 3000 is already in use
- Delete `node_modules` and run `npm install` again
- Clear `.next` directory: `rm -rf .next`

### Database errors
- Delete `idmc_profiling.db` and run init_db again
- Check file permissions
- Ensure SQLite is available on your system

### Connection errors
- Verify IDMC credentials are correct
- Check network connectivity
- Ensure base_url and profiling_url match your IDMC region
- Some IDMC orgs may have API restrictions

## Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

Apache License 2.0 - see [LICENSE](LICENSE) file for details

Copyright 2026 Salesforce, Inc.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

## Support

For issues, questions, or contributions:
- Open an issue on GitHub
- Check existing documentation in the `/docs` folder

## Acknowledgments

Built with:
- [FastAPI](https://fastapi.tiangolo.com/)
- [Next.js](https://nextjs.org/)
- [Fluent UI](https://react.fluentui.dev/)
- [SQLAlchemy](https://www.sqlalchemy.org/)
- Informatica Data Quality (IDMC)

