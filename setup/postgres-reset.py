#!/usr/bin/env python3
"""
PostgreSQL User and Password Reset Script
This script resets PostgreSQL to use simple credentials for development.
"""

import subprocess
import sys
import os
import platform
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

def run_command(command, shell=True, capture_output=True):
    """Run a system command and return the result."""
    try:
        result = subprocess.run(command, shell=shell, capture_output=capture_output, text=True)
        return result.returncode == 0, result.stdout, result.stderr
    except Exception as e:
        return False, "", str(e)

def find_postgres_service():
    """Find the PostgreSQL service name on different systems."""
    system = platform.system().lower()
    
    if system == "windows":
        # Common PostgreSQL service names on Windows
        services = ["postgresql-x64-14", "postgresql-x64-15", "postgresql-x64-16", "PostgreSQL"]
        for service in services:
            success, _, _ = run_command(f'sc query "{service}"')
            if success:
                return service
    elif system == "linux":
        return "postgresql"
    elif system == "darwin":  # macOS
        return "postgresql"
    
    return None

def stop_postgres():
    """Stop PostgreSQL service."""
    system = platform.system().lower()
    service_name = find_postgres_service()
    
    if not service_name:
        print("❌ Could not find PostgreSQL service")
        return False
    
    print(f"🔄 Stopping PostgreSQL service: {service_name}")
    
    if system == "windows":
        success, _, error = run_command(f'net stop "{service_name}"')
    else:
        success, _, error = run_command(f'sudo systemctl stop {service_name}')
    
    if success:
        print("✅ PostgreSQL service stopped")
        return True
    else:
        print(f"⚠️  Warning: Could not stop PostgreSQL service: {error}")
        return False

def start_postgres():
    """Start PostgreSQL service."""
    system = platform.system().lower()
    service_name = find_postgres_service()
    
    if not service_name:
        print("❌ Could not find PostgreSQL service")
        return False
    
    print(f"🔄 Starting PostgreSQL service: {service_name}")
    
    if system == "windows":
        success, _, error = run_command(f'net start "{service_name}"')
    else:
        success, _, error = run_command(f'sudo systemctl start {service_name}')
    
    if success:
        print("✅ PostgreSQL service started")
        return True
    else:
        print(f"❌ Failed to start PostgreSQL service: {error}")
        return False

def find_postgres_data_dir():
    """Find PostgreSQL data directory."""
    system = platform.system().lower()
    
    common_paths = []
    
    if system == "windows":
        common_paths = [
            "C:\\Program Files\\PostgreSQL\\14\\data",
            "C:\\Program Files\\PostgreSQL\\15\\data",
            "C:\\Program Files\\PostgreSQL\\16\\data",
            "C:\\PostgreSQL\\data",
        ]
    elif system == "linux":
        common_paths = [
            "/var/lib/postgresql/data",
            "/var/lib/pgsql/data",
            "/usr/local/var/postgres",
        ]
    elif system == "darwin":  # macOS
        common_paths = [
            "/usr/local/var/postgres",
            "/opt/homebrew/var/postgres",
            "/Library/PostgreSQL/14/data",
            "/Library/PostgreSQL/15/data",
        ]
    
    for path in common_paths:
        if os.path.exists(path):
            return path
    
    return None

def reset_postgres_auth():
    """Reset PostgreSQL authentication to trust mode temporarily."""
    data_dir = find_postgres_data_dir()
    
    if not data_dir:
        print("❌ Could not find PostgreSQL data directory")
        return False
    
    pg_hba_path = os.path.join(data_dir, "pg_hba.conf")
    
    if not os.path.exists(pg_hba_path):
        print(f"❌ Could not find pg_hba.conf at {pg_hba_path}")
        return False
    
    print(f"🔄 Backing up and modifying {pg_hba_path}")
    
    # Backup original file
    backup_path = pg_hba_path + ".backup"
    try:
        with open(pg_hba_path, 'r') as original:
            with open(backup_path, 'w') as backup:
                backup.write(original.read())
        print(f"✅ Backup created at {backup_path}")
    except Exception as e:
        print(f"❌ Failed to backup pg_hba.conf: {e}")
        return False
    
    # Create new pg_hba.conf with trust authentication
    trust_config = """# TYPE  DATABASE        USER            ADDRESS                 METHOD
# Allow local connections with trust (for reset)
local   all             all                                     trust
host    all             all             127.0.0.1/32            trust
host    all             all             ::1/128                 trust
"""
    
    try:
        with open(pg_hba_path, 'w') as f:
            f.write(trust_config)
        print("✅ pg_hba.conf updated to allow trust authentication")
        return True
    except Exception as e:
        print(f"❌ Failed to update pg_hba.conf: {e}")
        return False

def restore_postgres_auth():
    """Restore original PostgreSQL authentication."""
    data_dir = find_postgres_data_dir()
    
    if not data_dir:
        return False
    
    pg_hba_path = os.path.join(data_dir, "pg_hba.conf")
    backup_path = pg_hba_path + ".backup"
    
    if os.path.exists(backup_path):
        try:
            with open(backup_path, 'r') as backup:
                with open(pg_hba_path, 'w') as original:
                    original.write(backup.read())
            print("✅ Original pg_hba.conf restored")
            return True
        except Exception as e:
            print(f"❌ Failed to restore pg_hba.conf: {e}")
            return False
    
    return False

def reset_postgres_password():
    """Reset postgres user password."""
    try:
        print("🔄 Connecting to PostgreSQL to reset password...")
        
        # Connect as postgres user (should work with trust auth)
        conn = psycopg2.connect(
            host="localhost",
            database="postgres",
            user="postgres"
        )
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        
        cursor = conn.cursor()
        
        # Reset password to '1'
        cursor.execute("ALTER USER postgres PASSWORD '1';")
        print("✅ Password reset to '1' for user 'postgres'")
        
        # Create test database if it doesn't exist
        cursor.execute("SELECT 1 FROM pg_database WHERE datname='testdb'")
        if not cursor.fetchone():
            cursor.execute("CREATE DATABASE testdb;")
            print("✅ Created test database 'testdb'")
        
        cursor.close()
        conn.close()
        
        return True
        
    except Exception as e:
        print(f"❌ Failed to reset password: {e}")
        return False

def test_connection():
    """Test the new connection."""
    try:
        print("🔄 Testing connection with new credentials...")
        
        conn = psycopg2.connect(
            host="localhost",
            database="postgres",
            user="postgres",
            password="1"
        )
        
        cursor = conn.cursor()
        cursor.execute("SELECT version();")
        version = cursor.fetchone()[0]
        print(f"✅ Connection successful! PostgreSQL version: {version}")
        
        cursor.close()
        conn.close()
        
        return True
        
    except Exception as e:
        print(f"❌ Connection test failed: {e}")
        return False

def create_secure_pg_hba():
    """Create a secure pg_hba.conf with password authentication."""
    data_dir = find_postgres_data_dir()
    
    if not data_dir:
        return False
    
    pg_hba_path = os.path.join(data_dir, "pg_hba.conf")
    
    secure_config = """# TYPE  DATABASE        USER            ADDRESS                 METHOD
# Local connections
local   all             postgres                                md5
local   all             all                                     md5

# IPv4 local connections:
host    all             postgres        127.0.0.1/32            md5
host    all             all             127.0.0.1/32            md5

# IPv6 local connections:
host    all             postgres        ::1/128                 md5
host    all             all             ::1/128                 md5
"""
    
    try:
        with open(pg_hba_path, 'w') as f:
            f.write(secure_config)
        print("✅ pg_hba.conf updated with secure password authentication")
        return True
    except Exception as e:
        print(f"❌ Failed to create secure pg_hba.conf: {e}")
        return False

def main():
    """Main function to reset PostgreSQL."""
    print("🚀 PostgreSQL Reset Script")
    print("=" * 50)
    
    # Check if psycopg2 is available
    try:
        import psycopg2
    except ImportError:
        print("❌ psycopg2 not found. Installing...")
        success, _, _ = run_command(f"{sys.executable} -m pip install psycopg2-binary")
        if not success:
            print("❌ Failed to install psycopg2. Please install it manually:")
            print("   pip install psycopg2-binary")
            return False
    
    # Step 1: Stop PostgreSQL
    if not stop_postgres():
        print("⚠️  Continuing anyway...")
    
    # Step 2: Reset authentication to trust
    if not reset_postgres_auth():
        print("❌ Failed to reset authentication. Exiting.")
        return False
    
    # Step 3: Start PostgreSQL
    if not start_postgres():
        print("❌ Failed to start PostgreSQL. Exiting.")
        return False
    
    # Wait a moment for PostgreSQL to fully start
    import time
    print("⏳ Waiting for PostgreSQL to start...")
    time.sleep(3)
    
    # Step 4: Reset password
    if not reset_postgres_password():
        print("❌ Failed to reset password. Restoring original config...")
        stop_postgres()
        restore_postgres_auth()
        start_postgres()
        return False
    
    # Step 5: Create secure pg_hba.conf
    stop_postgres()
    create_secure_pg_hba()
    start_postgres()
    
    # Wait for restart
    time.sleep(3)
    
    # Step 6: Test connection
    if test_connection():
        print("\n🎉 SUCCESS!")
        print("PostgreSQL has been reset with the following credentials:")
        print("  Host: localhost")
        print("  Port: 5432")
        print("  User: postgres")
        print("  Password: 1")
        print("  Database: postgres")
        return True
    else:
        print("\n❌ FAILED!")
        print("Something went wrong. Check the error messages above.")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)