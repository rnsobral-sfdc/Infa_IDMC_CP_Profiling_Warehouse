#!/usr/bin/env python3
"""
IDMC Profiling Extractor - Installation Verification Script

This script checks that all prerequisites are installed and configured correctly.
Run this before starting the application.
"""

import sys
import subprocess
import os
from pathlib import Path


class Colors:
    """ANSI color codes for terminal output."""
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    END = '\033[0m'
    BOLD = '\033[1m'


def print_header(text):
    """Print section header."""
    print(f"\n{Colors.BOLD}{Colors.BLUE}{'='*70}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.BLUE}{text:^70}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.BLUE}{'='*70}{Colors.END}\n")


def print_success(text):
    """Print success message."""
    print(f"{Colors.GREEN}✓{Colors.END} {text}")


def print_error(text):
    """Print error message."""
    print(f"{Colors.RED}✗{Colors.END} {text}")


def print_warning(text):
    """Print warning message."""
    print(f"{Colors.YELLOW}⚠{Colors.END} {text}")


def check_python_version():
    """Check Python version."""
    print_header("Checking Python Version")

    version = sys.version_info
    version_str = f"{version.major}.{version.minor}.{version.micro}"

    if version.major == 3 and version.minor >= 9:
        print_success(f"Python {version_str} (Requirement: Python 3.9+)")
        return True
    else:
        print_error(f"Python {version_str} (Requirement: Python 3.9+)")
        print("   Please install Python 3.9 or higher")
        return False


def check_command(command, name, install_hint):
    """Check if a command is available."""
    try:
        result = subprocess.run(
            [command, "--version"],
            capture_output=True,
            text=True,
            timeout=5
        )
        if result.returncode == 0:
            version = result.stdout.split('\n')[0]
            print_success(f"{name} installed: {version}")
            return True
    except (subprocess.TimeoutExpired, FileNotFoundError):
        pass

    print_error(f"{name} not found")
    print(f"   Install: {install_hint}")
    return False


def check_postgresql():
    """Check PostgreSQL installation."""
    print_header("Checking PostgreSQL")

    # Try psql
    if check_command("psql", "PostgreSQL Client", "https://www.postgresql.org/download/"):
        # Try to connect
        try:
            result = subprocess.run(
                ["psql", "-U", "postgres", "-c", "SELECT version();"],
                capture_output=True,
                text=True,
                timeout=5
            )
            if result.returncode == 0:
                print_success("PostgreSQL server is accessible")
                return True
            else:
                print_warning("PostgreSQL client installed but server not accessible")
                print("   Make sure PostgreSQL is running: pg_ctl status")
                return False
        except subprocess.TimeoutExpired:
            print_warning("PostgreSQL connection timeout")
            return False
    return False


def check_node():
    """Check Node.js installation."""
    print_header("Checking Node.js & npm")

    node_ok = check_command("node", "Node.js", "https://nodejs.org/")
    npm_ok = check_command("npm", "npm", "Comes with Node.js")

    return node_ok and npm_ok


def check_database():
    """Check if database exists."""
    print_header("Checking Database")

    try:
        result = subprocess.run(
            ["psql", "-U", "postgres", "-lqt"],
            capture_output=True,
            text=True,
            timeout=5
        )
        if "idmc_profiling" in result.stdout:
            print_success("Database 'idmc_profiling' exists")
            return True
        else:
            print_warning("Database 'idmc_profiling' does not exist")
            print("   Create with: psql -U postgres -c \"CREATE DATABASE idmc_profiling;\"")
            return False
    except (subprocess.TimeoutExpired, FileNotFoundError):
        print_error("Cannot check database (PostgreSQL not accessible)")
        return False


def check_files():
    """Check if required files exist."""
    print_header("Checking Required Files")

    required_files = [
        "backend/requirements.txt",
        "backend/app/main.py",
        "database/schema/01_create_tables.sql",
        "database/schema/02_seed_data.sql",
        "frontend/package.json",
        ".env"
    ]

    all_exist = True
    for file_path in required_files:
        if os.path.exists(file_path):
            print_success(f"{file_path}")
        else:
            print_error(f"{file_path} - NOT FOUND")
            all_exist = False

    return all_exist


def check_env_file():
    """Check .env file configuration."""
    print_header("Checking .env Configuration")

    if not os.path.exists(".env"):
        print_error(".env file not found")
        print("   Copy .env.example to .env and configure")
        return False

    required_vars = [
        "DATABASE_URL",
        "SECRET_KEY",
        "ENCRYPTION_KEY",
        "IDMC_BASE_URL"
    ]

    with open(".env", "r") as f:
        env_content = f.read()

    all_configured = True
    for var in required_vars:
        if var in env_content:
            # Check if it's not a placeholder
            if "change" in env_content.lower() and var in ["SECRET_KEY", "ENCRYPTION_KEY"]:
                print_warning(f"{var} - Using default value (change for production)")
            else:
                print_success(f"{var} - Configured")
        else:
            print_error(f"{var} - Not found")
            all_configured = False

    return all_configured


def check_backend_dependencies():
    """Check if backend dependencies are installed."""
    print_header("Checking Backend Dependencies")

    venv_path = Path("backend/venv")
    if not venv_path.exists():
        print_warning("Virtual environment not found")
        print("   Create with: cd backend && python -m venv venv")
        return False

    print_success("Virtual environment exists")

    # Check if packages are installed
    try:
        if sys.platform == "win32":
            pip_path = venv_path / "Scripts" / "pip.exe"
        else:
            pip_path = venv_path / "bin" / "pip"

        result = subprocess.run(
            [str(pip_path), "list"],
            capture_output=True,
            text=True,
            timeout=10
        )

        required_packages = ["fastapi", "uvicorn", "sqlalchemy", "psycopg2"]
        all_installed = True

        for package in required_packages:
            if package in result.stdout.lower():
                print_success(f"{package} installed")
            else:
                print_error(f"{package} not installed")
                all_installed = False

        if not all_installed:
            print("   Install with: pip install -r backend/requirements.txt")

        return all_installed

    except Exception as e:
        print_warning(f"Could not check packages: {e}")
        return False


def check_frontend_dependencies():
    """Check if frontend dependencies are installed."""
    print_header("Checking Frontend Dependencies")

    node_modules = Path("frontend/node_modules")
    if not node_modules.exists():
        print_warning("node_modules not found")
        print("   Install with: cd frontend && npm install")
        return False

    print_success("node_modules exists")

    # Check for key packages
    required = ["next", "react", "tailwindcss"]
    all_found = True

    for package in required:
        if (node_modules / package).exists():
            print_success(f"{package} installed")
        else:
            print_error(f"{package} not installed")
            all_found = False

    if not all_found:
        print("   Install with: cd frontend && npm install")

    return all_found


def print_summary(results):
    """Print summary of checks."""
    print_header("Installation Verification Summary")

    total = len(results)
    passed = sum(results.values())

    print(f"\nChecks Passed: {passed}/{total}\n")

    for check, result in results.items():
        if result:
            print_success(check)
        else:
            print_error(check)

    print("\n")

    if passed == total:
        print(f"{Colors.GREEN}{Colors.BOLD}✓ All checks passed! Ready to start the application.{Colors.END}\n")
        print("Next steps:")
        print("  1. Windows: START.bat")
        print("  2. Mac/Linux: ./START.sh")
        print("  3. Open browser: http://localhost:3000\n")
        return True
    else:
        print(f"{Colors.RED}{Colors.BOLD}✗ Some checks failed. Please fix the issues above.{Colors.END}\n")
        print("Refer to SETUP.md for detailed instructions.\n")
        return False


def main():
    """Main verification routine."""
    print(f"\n{Colors.BOLD}IDMC Profiling Extractor - Installation Verification{Colors.END}")
    print(f"{Colors.BOLD}{'='*70}{Colors.END}\n")

    results = {
        "Python 3.9+": check_python_version(),
        "PostgreSQL": check_postgresql(),
        "Node.js & npm": check_node(),
        "Database 'idmc_profiling'": check_database(),
        "Required Files": check_files(),
        ".env Configuration": check_env_file(),
        "Backend Dependencies": check_backend_dependencies(),
        "Frontend Dependencies": check_frontend_dependencies()
    }

    success = print_summary(results)

    return 0 if success else 1


if __name__ == "__main__":
    sys.exit(main())
