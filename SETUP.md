# Detailed Setup Guide

This guide provides step-by-step instructions for setting up the IDMC Profiling Extractor on different platforms.

## Table of Contents
- [Windows Setup](#windows-setup)
- [macOS Setup](#macos-setup)
- [Linux Setup](#linux-setup)
- [Docker Setup](#docker-setup-coming-soon)
- [Troubleshooting](#troubleshooting)

---

## Windows Setup

### 1. Install Prerequisites

#### Python 3.10+
1. Download from [python.org](https://www.python.org/downloads/)
2. Run installer, **check "Add Python to PATH"**
3. Verify: `python --version`

#### Node.js 16+
1. Download from [nodejs.org](https://nodejs.org/)
2. Run installer with default options
3. Verify: `node --version` and `npm --version`

#### Git
1. Download from [git-scm.com](https://git-scm.com/download/win)
2. Run installer with default options
3. Verify: `git --version`

### 2. Clone and Setup

Open Command Prompt or PowerShell:

```powershell
# Clone repository
git clone https://github.com/YOUR_USERNAME/idmc-profiling-extractor.git
cd idmc-profiling-extractor

# Backend setup
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt

# Initialize database
python -c "from app.core.database import init_db; init_db()"

# Start backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Open a **new** Command Prompt/PowerShell window:

```powershell
# Frontend setup
cd frontend
npm install
npm run dev
```

---

## macOS Setup

### 1. Install Prerequisites

#### Homebrew (if not installed)
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

#### Python 3.10+
```bash
brew install python@3.10
python3 --version
```

#### Node.js 16+
```bash
brew install node
node --version
npm --version
```

#### Git
```bash
brew install git
git --version
```

### 2. Clone and Setup

```bash
# Clone repository
git clone https://github.com/YOUR_USERNAME/idmc-profiling-extractor.git
cd idmc-profiling-extractor

# Backend setup
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Initialize database
python -c "from app.core.database import init_db; init_db()"

# Start backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Open a **new** terminal window:

```bash
# Frontend setup
cd frontend
npm install
npm run dev
```

---

## Linux Setup

### 1. Install Prerequisites

#### Ubuntu/Debian

```bash
# Update package list
sudo apt update

# Install Python 3.10+
sudo apt install python3.10 python3.10-venv python3-pip

# Install Node.js 16+
curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
sudo apt install nodejs

# Install Git
sudo apt install git

# Verify installations
python3 --version
node --version
npm --version
git --version
```

#### RHEL/CentOS/Fedora

```bash
# Install Python 3.10+
sudo dnf install python3.10 python3-pip

# Install Node.js 16+
curl -fsSL https://rpm.nodesource.com/setup_16.x | sudo bash -
sudo dnf install nodejs

# Install Git
sudo dnf install git

# Verify installations
python3 --version
node --version
npm --version
git --version
```

### 2. Clone and Setup

```bash
# Clone repository
git clone https://github.com/YOUR_USERNAME/idmc-profiling-extractor.git
cd idmc-profiling-extractor

# Backend setup
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Initialize database
python -c "from app.core.database import init_db; init_db()"

# Start backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Open a **new** terminal:

```bash
# Frontend setup
cd frontend
npm install
npm run dev
```

---

## Docker Setup (Coming Soon)

Docker support will be added in a future release. Stay tuned!

---

## Troubleshooting

### Port Already in Use

**Backend (Port 8000)**
```bash
# Windows
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# macOS/Linux
lsof -ti:8000 | xargs kill -9
```

**Frontend (Port 3000)**
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# macOS/Linux
lsof -ti:3000 | xargs kill -9
```

### Python Version Issues

Ensure Python 3.10+ is installed:
```bash
python --version  # Windows
python3 --version  # macOS/Linux
```

If you have multiple Python versions, specify the version:
```bash
python3.10 -m venv venv
```

### Node.js Version Issues

Check Node.js version:
```bash
node --version
```

If version is below 16, update:
```bash
# Windows: Download installer
# macOS: brew upgrade node
# Linux: Use version manager (nvm)
```

### Database Permission Errors

Ensure the backend directory is writable:
```bash
# macOS/Linux
chmod -R 755 backend/
```

### Frontend Build Errors

Clear cache and reinstall:
```bash
cd frontend
rm -rf node_modules .next
npm install
npm run dev
```

### SSL Certificate Errors

If you encounter SSL errors with IDMC API:
- Check your network/firewall settings
- Ensure your system's root certificates are up to date
- Contact your IT department if behind a corporate proxy

### IDMC Connection Errors

1. Verify credentials are correct
2. Check base_url matches your IDMC region:
   - US West: `https://usw1.dm-us.informaticacloud.com/saas`
   - US East: `https://use1.dm-us.informaticacloud.com/saas`
   - Europe: `https://euc1.dm-eu.informaticacloud.com/saas`
   - Asia Pacific: `https://ap1.dm-ap.informaticacloud.com/saas`
3. Verify profiling_url matches your region
4. Some IDMC orgs may have API access restrictions

### Need More Help?

- Check the [README](README.md) for general information
- Review API logs in the backend console
- Open an issue on GitHub with:
  - Your operating system
  - Python and Node.js versions
  - Full error message
  - Steps to reproduce

---

## Next Steps

After successful setup:
1. Access the frontend at http://localhost:3000
2. Add your IDMC connection in the Connections page
3. Create a sync job
4. Start extracting profiling data
5. Explore reports and analytics
6. Connect your BI tools to the SQLite database
