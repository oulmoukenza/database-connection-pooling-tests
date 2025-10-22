#!/bin/bash

# PostgreSQL Reset Script for macOS
# This script resets PostgreSQL to use simple credentials for development

set -e  # Exit on any error

echo "🚀 PostgreSQL Reset Script for macOS"
echo "====================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}🔄 $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Check if PostgreSQL is installed
check_postgres_installation() {
    print_status "Checking PostgreSQL installation..."
    
    # Check for Homebrew installation
    if command -v brew >/dev/null 2>&1; then
        if brew list postgresql@14 >/dev/null 2>&1 || brew list postgresql@15 >/dev/null 2>&1 || brew list postgresql >/dev/null 2>&1; then
            print_success "Found Homebrew PostgreSQL installation"
            POSTGRES_TYPE="homebrew"
            return 0
        fi
    fi
    
    # Check for Postgres.app
    if [ -d "/Applications/Postgres.app" ]; then
        print_success "Found Postgres.app installation"
        POSTGRES_TYPE="postgresapp"
        return 0
    fi
    
    # Check for system installation
    if command -v psql >/dev/null 2>&1; then
        print_success "Found system PostgreSQL installation"
        POSTGRES_TYPE="system"
        return 0
    fi
    
    print_error "PostgreSQL not found. Please install PostgreSQL first."
    echo "You can install it using:"
    echo "  - Homebrew: brew install postgresql"
    echo "  - Postgres.app: https://postgresapp.com/"
    exit 1
}

# Find PostgreSQL data directory
find_data_directory() {
    print_status "Finding PostgreSQL data directory..."
    
    case $POSTGRES_TYPE in
        "homebrew")
            # Try different Homebrew versions
            for version in 15 14 13; do
                DATA_DIR="/opt/homebrew/var/postgresql@${version}"
                if [ -d "$DATA_DIR" ]; then
                    print_success "Found data directory: $DATA_DIR"
                    return 0
                fi
                DATA_DIR="/usr/local/var/postgresql@${version}"
                if [ -d "$DATA_DIR" ]; then
                    print_success "Found data directory: $DATA_DIR"
                    return 0
                fi
            done
            # Try generic path
            DATA_DIR="/opt/homebrew/var/postgres"
            if [ -d "$DATA_DIR" ]; then
                print_success "Found data directory: $DATA_DIR"
                return 0
            fi
            DATA_DIR="/usr/local/var/postgres"
            if [ -d "$DATA_DIR" ]; then
                print_success "Found data directory: $DATA_DIR"
                return 0
            fi
            ;;
        "postgresapp")
            DATA_DIR="$HOME/Library/Application Support/Postgres/var-15"
            if [ -d "$DATA_DIR" ]; then
                print_success "Found data directory: $DATA_DIR"
                return 0
            fi
            DATA_DIR="$HOME/Library/Application Support/Postgres/var-14"
            if [ -d "$DATA_DIR" ]; then
                print_success "Found data directory: $DATA_DIR"
                return 0
            fi
            ;;
    esac
    
    print_error "Could not find PostgreSQL data directory"
    exit 1
}

# Stop PostgreSQL service
stop_postgres() {
    print_status "Stopping PostgreSQL service..."
    
    case $POSTGRES_TYPE in
        "homebrew")
            if brew services list | grep postgresql | grep started >/dev/null 2>&1; then
                brew services stop postgresql || brew services stop postgresql@15 || brew services stop postgresql@14
                print_success "PostgreSQL service stopped"
            else
                print_warning "PostgreSQL service was not running"
            fi
            ;;
        "postgresapp")
            print_warning "Please stop Postgres.app manually if it's running"
            ;;
        "system")
            sudo launchctl unload /Library/LaunchDaemons/com.edb.launchd.postgresql-*.plist 2>/dev/null || true
            print_success "PostgreSQL service stopped"
            ;;
    esac
}

# Start PostgreSQL service
start_postgres() {
    print_status "Starting PostgreSQL service..."
    
    case $POSTGRES_TYPE in
        "homebrew")
            brew services start postgresql || brew services start postgresql@15 || brew services start postgresql@14
            print_success "PostgreSQL service started"
            ;;
        "postgresapp")
            print_warning "Please start Postgres.app manually"
            ;;
        "system")
            sudo launchctl load /Library/LaunchDaemons/com.edb.launchd.postgresql-*.plist 2>/dev/null || true
            print_success "PostgreSQL service started"
            ;;
    esac
    
    # Wait for PostgreSQL to start
    print_status "Waiting for PostgreSQL to start..."
    sleep 3
}

# Backup and modify pg_hba.conf
setup_trust_auth() {
    print_status "Setting up trust authentication..."
    
    PG_HBA_FILE="$DATA_DIR/pg_hba.conf"
    
    if [ ! -f "$PG_HBA_FILE" ]; then
        print_error "pg_hba.conf not found at $PG_HBA_FILE"
        exit 1
    fi
    
    # Backup original file
    cp "$PG_HBA_FILE" "$PG_HBA_FILE.backup"
    print_success "Backed up pg_hba.conf"
    
    # Create trust configuration
    cat > "$PG_HBA_FILE" << EOF
# TYPE  DATABASE        USER            ADDRESS                 METHOD
# Allow local connections with trust (for reset)
local   all             all                                     trust
host    all             all             127.0.0.1/32            trust
host    all             all             ::1/128                 trust
EOF
    
    print_success "Updated pg_hba.conf for trust authentication"
}

# Reset password using psql
reset_password() {
    print_status "Resetting postgres user password..."
    
    # Try to connect and reset password
    if psql -h localhost -U postgres -d postgres -c "ALTER USER postgres PASSWORD '1';" 2>/dev/null; then
        print_success "Password reset to '1' for user 'postgres'"
        
        # Create test database if it doesn't exist
        psql -h localhost -U postgres -d postgres -c "SELECT 1 FROM pg_database WHERE datname='testdb'" | grep -q 1 || \
        psql -h localhost -U postgres -d postgres -c "CREATE DATABASE testdb;" 2>/dev/null
        print_success "Ensured test database 'testdb' exists"
        
        return 0
    else
        print_error "Failed to reset password"
        return 1
    fi
}

# Create secure pg_hba.conf
setup_secure_auth() {
    print_status "Setting up secure password authentication..."
    
    PG_HBA_FILE="$DATA_DIR/pg_hba.conf"
    
    cat > "$PG_HBA_FILE" << EOF
# TYPE  DATABASE        USER            ADDRESS                 METHOD
# Local connections
local   all             postgres                                md5
local   all             all                                     md5

# IPv4 local connections:
host    all             postgres        127.0.0.1/32            md5
host    all             all             127.0.0.1/32            md5

# IPv6 local connections:
host    all             postgres        ::1/128                 md5
host    all             all             ::1/128                 md5
EOF
    
    print_success "Updated pg_hba.conf with secure password authentication"
}

# Test the connection
test_connection() {
    print_status "Testing connection with new credentials..."
    
    if PGPASSWORD=1 psql -h localhost -U postgres -d postgres -c "SELECT version();" >/dev/null 2>&1; then
        print_success "Connection test successful!"
        return 0
    else
        print_error "Connection test failed"
        return 1
    fi
}

# Restore original configuration
restore_config() {
    print_status "Restoring original configuration..."
    
    PG_HBA_FILE="$DATA_DIR/pg_hba.conf"
    
    if [ -f "$PG_HBA_FILE.backup" ]; then
        cp "$PG_HBA_FILE.backup" "$PG_HBA_FILE"
        print_success "Original pg_hba.conf restored"
    fi
}

# Main execution
main() {
    # Check if running as root
    if [ "$EUID" -eq 0 ]; then
        print_error "Please don't run this script as root"
        exit 1
    fi
    
    # Install psycopg2 if needed for Python script
    if command -v python3 >/dev/null 2>&1; then
        print_status "Checking Python dependencies..."
        python3 -c "import psycopg2" 2>/dev/null || {
            print_status "Installing psycopg2-binary..."
            pip3 install psycopg2-binary || {
                print_warning "Failed to install psycopg2-binary. The Python script may not work."
            }
        }
    fi
    
    # Main process
    check_postgres_installation
    find_data_directory
    stop_postgres
    setup_trust_auth
    start_postgres
    
    if reset_password; then
        stop_postgres
        setup_secure_auth
        start_postgres
        
        if test_connection; then
            echo
            print_success "🎉 SUCCESS!"
            echo "PostgreSQL has been reset with the following credentials:"
            echo "  Host: localhost"
            echo "  Port: 5432"
            echo "  User: postgres"
            echo "  Password: 1"
            echo "  Database: postgres"
            echo
            echo "You can now connect using:"
            echo "  psql -h localhost -U postgres -d postgres"
            echo "  (when prompted, enter password: 1)"
        else
            print_error "Connection test failed. Something went wrong."
            exit 1
        fi
    else
        print_error "Failed to reset password. Restoring original configuration..."
        stop_postgres
        restore_config
        start_postgres
        exit 1
    fi
}

# Run main function
main "$@"