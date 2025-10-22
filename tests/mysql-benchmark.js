const mysql = require('mysql2/promise');
const autocannon = require('autocannon');
const pidusage = require('pidusage');
const fs = require('fs-extra');
const config = require('../config/database');

class MySQLBenchmark {
  constructor() {
    this.results = {
      withPooling: [],
      withoutPooling: [],
      resourceUsage: []
    };
  }

  // Test WITHOUT connection pooling
  async testWithoutPooling(concurrentUsers, duration) {
    console.log(`\n🔴 MySQL WITHOUT pooling - ${concurrentUsers} concurrent users`);
    
    const server = require('http').createServer(async (req, res) => {
      const startTime = Date.now();
      
      try {
        // Create new connection for each request (BAD practice)
        const connection = await mysql.createConnection(config.mysql.local);
        
        // Simulate a simple query
        const [rows] = await connection.execute('SELECT NOW() as current_time, SLEEP(0.01) as delay');
        
        await connection.end();
        
        const responseTime = Date.now() - startTime;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: true, 
          responseTime,
          timestamp: rows[0].current_time 
        }));
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: false, 
          error: error.message 
        }));
      }
    });

    server.listen(3003);

    // Monitor resource usage
    const resourceMonitor = setInterval(async () => {
      try {
        const stats = await pidusage(process.pid);
        this.results.resourceUsage.push({
          timestamp: Date.now(),
          type: 'without-pooling',
          cpu: stats.cpu,
          memory: stats.memory,
          concurrentUsers
        });
      } catch (err) {
        console.error('Resource monitoring error:', err);
      }
    }, 1000);

    // Run load test
    const result = await autocannon({
      url: 'http://localhost:3003',
      connections: concurrentUsers,
      duration: duration,
      pipelining: 1
    });

    clearInterval(resourceMonitor);
    server.close();

    this.results.withoutPooling.push({
      concurrentUsers,
      ...result
    });

    return result;
  }

  // Test WITH connection pooling
  async testWithPooling(concurrentUsers, duration, poolSize = 20) {
    console.log(`\n🟢 MySQL WITH pooling (pool size: ${poolSize}) - ${concurrentUsers} concurrent users`);
    
    // Create connection pool
    const pool = mysql.createPool({
      ...config.mysql.local,
      connectionLimit: poolSize,
      acquireTimeout: 60000,
      timeout: 60000,
      reconnect: true
    });

    const server = require('http').createServer(async (req, res) => {
      const startTime = Date.now();
      
      try {
        // Use connection from pool (GOOD practice)
        const [rows] = await pool.execute('SELECT NOW() as current_time, SLEEP(0.01) as delay');
        
        const responseTime = Date.now() - startTime;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: true, 
          responseTime,
          timestamp: rows[0].current_time 
        }));
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: false, 
          error: error.message 
        }));
      }
    });

    server.listen(3004);

    // Monitor resource usage
    const resourceMonitor = setInterval(async () => {
      try {
        const stats = await pidusage(process.pid);
        this.results.resourceUsage.push({
          timestamp: Date.now(),
          type: 'with-pooling',
          cpu: stats.cpu,
          memory: stats.memory,
          concurrentUsers,
          poolSize
        });
      } catch (err) {
        console.error('Resource monitoring error:', err);
      }
    }, 1000);

    // Run load test
    const result = await autocannon({
      url: 'http://localhost:3004',
      connections: concurrentUsers,
      duration: duration,
      pipelining: 1
    });

    clearInterval(resourceMonitor);
    server.close();
    await pool.end();

    this.results.withPooling.push({
      concurrentUsers,
      poolSize,
      ...result
    });

    return result;
  }

  async runFullBenchmark() {
    console.log('🚀 Starting MySQL Connection Pooling Benchmark\n');
    
    const { concurrentUsers, testDuration } = config.testConfig;
    
    for (const users of concurrentUsers) {
      if (users > 200) {
        console.log(`⚠️  Skipping ${users} users for non-pooled test (would likely crash)`);
        continue;
      }
      
      await this.testWithoutPooling(users, testDuration);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    for (const users of concurrentUsers) {
      await this.testWithPooling(users, testDuration, 20);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    await this.saveResults();
    this.printSummary();
  }

  async saveResults() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `results/mysql-benchmark-${timestamp}.json`;
    
    await fs.ensureDir('results');
    await fs.writeJson(filename, this.results, { spaces: 2 });
    
    console.log(`\n📊 Results saved to: ${filename}`);
  }

  printSummary() {
    console.log('\n📈 BENCHMARK SUMMARY - MySQL');
    console.log('===============================');
    
    console.log('\n🔴 WITHOUT Connection Pooling:');
    this.results.withoutPooling.forEach(result => {
      console.log(`  ${result.concurrentUsers} users: ${result.requests.average.toFixed(0)} req/s, ${result.latency.p99.toFixed(1)}ms p99`);
    });
    
    console.log('\n🟢 WITH Connection Pooling:');
    this.results.withPooling.forEach(result => {
      console.log(`  ${result.concurrentUsers} users: ${result.requests.average.toFixed(0)} req/s, ${result.latency.p99.toFixed(1)}ms p99`);
    });
  }
}

if (require.main === module) {
  const benchmark = new MySQLBenchmark();
  benchmark.runFullBenchmark().catch(console.error);
}

module.exports = MySQLBenchmark;