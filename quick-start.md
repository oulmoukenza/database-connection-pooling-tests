# Quick Start Guide

## Option 1: Using Docker (Recommended)

### 1. Start databases
```bash
docker-compose up -d postgres mysql
```

### 2. Install dependencies
```bash
npm install
```

### 3. Set up test databases
```bash
npm run setup:postgres
npm run setup:mysql
```

### 4. Run all tests
```bash
npm run test:all
```

### 5. Generate report
```bash
npm run generate:report
```

## Option 2: Using Local Databases

### Prerequisites
- PostgreSQL 13+ installed and running
- MySQL 8+ installed and running
- Node.js 16+ installed

### 1. Update database configuration
Edit `config/database.js` with your database credentials.

### 2. Install dependencies
```bash
npm install
```

### 3. Set up databases
```bash
npm run setup:postgres
npm run setup:mysql
```

### 4. Run tests
```bash
# Run individual tests
npm run test:postgres
npm run test:mysql

# Or run all tests
node run-all-tests.js
```

## Test Results

After running tests, you'll find:
- **Raw data**: `results/*.json`
- **Report**: `reports/performance-report.md`
- **Charts**: `reports/*.png`

## Expected Results

You should see dramatic improvements with connection pooling:
- **50-300% increase** in throughput
- **60-90% reduction** in latency
- **Elimination** of connection timeout errors
- **Significant reduction** in CPU/memory usage

## Troubleshooting

### Database Connection Issues
```bash
# Test connections
node setup/postgres-setup.js
node setup/mysql-setup.js
```

### Port Conflicts
If ports 5432 or 3306 are in use, update `docker-compose.yml`:
```yaml
ports:
  - "5433:5432"  # Use different port
```

### Memory Issues
For high concurrent user tests (500+), ensure adequate system memory:
- Minimum 8GB RAM recommended
- Adjust `concurrentUsers` in `config/database.js` if needed

## Customization

### Adjust Test Parameters
Edit `config/database.js`:
```javascript
testConfig: {
  poolSizes: [5, 10, 20, 50],        // Pool sizes to test
  concurrentUsers: [10, 50, 100],    // Concurrent load levels
  testDuration: 30,                   // Test duration in seconds
  iterations: 3                       // Number of test runs
}
```

### Add Custom Tests
Create new test files in `tests/` directory following the existing patterns.

## Cloud Testing

### Google Cloud SQL
1. Create Cloud SQL instance
2. Update `config/database.js` with Cloud SQL credentials
3. Enable Cloud SQL Auth Proxy if needed
4. Run tests with cloud configuration

### AWS RDS
Similar process - update configuration with RDS endpoint details.

## Performance Tips

1. **Run tests on dedicated hardware** for consistent results
2. **Close other applications** during testing
3. **Use SSD storage** for better database performance
4. **Monitor system resources** during tests
5. **Run multiple iterations** and average results