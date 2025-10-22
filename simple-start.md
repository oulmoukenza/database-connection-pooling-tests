# Simple Start - PostgreSQL Only

## 1. Update Your Database Password
Edit `config/database.js` and change the PostgreSQL password to match your local setup.

## 2. Install Dependencies
```bash
cd connection-pooling-tests
npm install
```

## 3. Setup Test Database
```bash
npm run setup:postgres
```

## 4. Run PostgreSQL Tests
```bash
npm run test:postgres
```

## 5. Generate Report
```bash
npm run generate:report
```

That's it! You'll get:
- Performance comparison charts
- Detailed report in `reports/performance-report.md`
- Raw data in `results/` folder

## Expected Results
- **2-5x throughput improvement** with pooling
- **50-80% latency reduction**
- **Dramatic resource savings**

## For Cloud Testing
Update the `cloudSql` section in `config/database.js` with your cloud database credentials and run the same tests.

## Quick Test (30 seconds)
```bash
node tests/connection-overhead-test.js
```
This will immediately show you connection establishment time differences.