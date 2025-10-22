# PostgreSQL Setup Scripts

This directory contains scripts to help you set up PostgreSQL with simple credentials for development and testing.

## For macOS Users

### Quick Setup (Recommended)

Run the macOS-specific script:

```bash
./setup/postgres-reset-mac.sh
```

This script will:
- ✅ Detect your PostgreSQL installation (Homebrew, Postgres.app, or system)
- ✅ Safely backup your current configuration
- ✅ Reset the `postgres` user password to `1`
- ✅ Create a test database
- ✅ Set up secure password authentication
- ✅ Test the connection

### Manual Setup

If the script doesn't work, you can try these manual steps:

1. **Stop PostgreSQL:**
   ```bash
   brew services stop postgresql
   # or for specific versions:
   brew services stop postgresql@15
   ```

2. **Find your data directory:**
   ```bash
   # Common locations:
   ls /opt/homebrew/var/postgres*
   ls /usr/local/var/postgres*
   ```

3. **Edit pg_hba.conf temporarily:**
   ```bash
   # Backup first
   cp /path/to/data/pg_hba.conf /path/to/data/pg_hba.conf.backup
   
   # Edit to allow trust authentication
   echo "local all all trust" > /path/to/data/pg_hba.conf
   echo "host all all 127.0.0.1/32 trust" >> /path/to/data/pg_hba.conf
   ```

4. **Start PostgreSQL and reset password:**
   ```bash
   brew services start postgresql
   psql -U postgres -c "ALTER USER postgres PASSWORD '1';"
   ```

5. **Restore secure authentication:**
   ```bash
   brew services stop postgresql
   cp /path/to/data/pg_hba.conf.backup /path/to/data/pg_hba.conf
   brew services start postgresql
   ```

## For Windows Users

Use the batch script:

```cmd
setup\postgres-reset.bat
```

Or run the Python script directly:

```cmd
python setup\postgres-reset.py
```

## For Linux Users

Use the Python script:

```bash
python3 setup/postgres-reset.py
```

## After Setup

Once the reset is complete, you can connect to PostgreSQL using:

- **Host:** localhost
- **Port:** 5432
- **User:** postgres
- **Password:** 1
- **Database:** postgres

### Test Connection

```bash
psql -h localhost -U postgres -d postgres
# Enter password: 1
```

### Connection String for Applications

```
postgresql://postgres:1@localhost:5432/postgres
```

## Troubleshooting

### Common Issues

1. **"PostgreSQL not found"**
   - Install PostgreSQL using Homebrew: `brew install postgresql`
   - Or download Postgres.app from https://postgresapp.com/

2. **"Permission denied"**
   - Make sure the script is executable: `chmod +x setup/postgres-reset-mac.sh`
   - Don't run as root/sudo

3. **"Data directory not found"**
   - Check if PostgreSQL is properly installed
   - Look for data directory manually: `find /usr/local /opt/homebrew -name "pg_hba.conf" 2>/dev/null`

4. **"Connection failed"**
   - Make sure PostgreSQL service is running: `brew services list | grep postgresql`
   - Check if port 5432 is available: `lsof -i :5432`

### Getting Help

If you encounter issues:

1. Check PostgreSQL logs:
   ```bash
   tail -f /opt/homebrew/var/log/postgresql@15.log
   # or
   tail -f /usr/local/var/log/postgresql@15.log
   ```

2. Check service status:
   ```bash
   brew services list | grep postgresql
   ```

3. Verify installation:
   ```bash
   which psql
   psql --version
   ```

## Security Note

⚠️ **Important:** These scripts set up PostgreSQL with a simple password (`1`) for development purposes only. 

**DO NOT use these credentials in production environments.**

For production, always use:
- Strong, unique passwords
- Proper authentication methods
- Network security measures
- Regular security updates