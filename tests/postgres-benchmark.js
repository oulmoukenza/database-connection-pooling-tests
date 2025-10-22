const { Pool, Client } = require('pg');
const autocannon = require('autocannon');
const pidusage = require('pidusage');
const fs = require('fs-extra');
const config = require('../config/database');

class PostgresBenchmark {
  constructor() {
    this.results = {
      withPooling: [],
      withoutPooling: [],
      resourceUsage: []
    };
  }

  // Test WITHOUT connection pooling - creates new connection per request
  async testWithoutPooling(concurrentUsers, duration) {
    console.log(`\n🔴 Testing WITHOUT pooling - ${concurrentUsers} concurrent users`);
    
    const server = require('http').createServer(async (req, res) => {
      const startTime = Date.now();
      
      try {
        // Create new connection for each request (BAD practice)
        const client = new Client(config.postgres.local);
        await client.connect();
        
        // Simulate a simple query
        const result = await client.query('SELECT NOW(), pg_sleep(0.01)');
        
        await client.end();
        
        const responseTime = Date.now() - startTime;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: true, 
          responseTime,
          timestamp: result.rows[0].now 
        }));
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: false, 
          error: error.message 
        }));
      }
    });

    server.listen(3001);

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
      url: 'http://localhost:3001',
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

  // Test WITH connection pooling - reuses connections
  async testWithPooling(concurrentUsers, duration, poolSize = 20) {
    console.log(`\n🟢 Testing WITH pooling (pool size: ${poolSize}) - ${concurrentUsers} concurrent users`);
    
    // Create connection pool
    const pool = new Pool({
      ...config.postgres.local,
      max: poolSize,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    const server = require('http').createServer(async (req, res) => {
      const startTime = Date.now();
      
      try {
        // Use connection from pool (GOOD practice)
        const client = await pool.connect();
        
        // Simulate a simple query
        const result = await client.query('SELECT NOW(), pg_sleep(0.01)');
        
        client.release(); // Return connection to pool
        
        const responseTime = Date.now() - startTime;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: true, 
          responseTime,
          timestamp: result.rows[0].now 
        }));
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: false, 
          error: error.message 
        }));
      }
    });

    server.listen(3002);

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
      url: 'http://localhost:3002',
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
    console.log('🚀 Starting PostgreSQL Connection Pooling Benchmark\n');
    
    const { concurrentUsers, testDuration } = config.testConfig;
    
    for (const users of concurrentUsers) {
      if (users > 200) {
        console.log(`⚠️  Skipping ${users} users for non-pooled test (would likely crash)`);
        continue;
      }
      
      // Test without pooling first
      await this.testWithoutPooling(users, testDuration);
      
      // Wait between tests
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    for (const users of concurrentUsers) {
      // Test with pooling
      await this.testWithPooling(users, testDuration, 20);
      
      // Wait between tests
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Save results
    await this.saveResults();
    this.printSummary();
  }

  async saveResults() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `results/postgres-benchmark-${timestamp}.json`;
    
    await fs.ensureDir('results');
    await fs.writeJson(filename, this.results, { spaces: 2 });
    
    console.log(`\n📊 Results saved to: ${filename}`);
  }

  printSummary() {
    console.log('\n📈 BENCHMARK SUMMARY - PostgreSQL');
    console.log('=====================================');
    
    console.log('\n🔴 WITHOUT Connection Pooling:');
    this.results.withoutPooling.forEach(result => {
      console.log(`  ${result.concurrentUsers} users: ${result.requests.average.toFixed(0)} req/s, ${result.latency.p99.toFixed(1)}ms p99`);
    });
    
    console.log('\n🟢 WITH Connection Pooling:');
    this.results.withPooling.forEach(result => {
      console.log(`  ${result.concurrentUsers} users: ${result.requests.average.toFixed(0)} req/s, ${result.latency.p99.toFixed(1)}ms p99`);
    });

    // Calculate improvements
    console.log('\n🎯 Performance Improvements:');
    this.results.withPooling.forEach(pooled => {
      const nonPooled = this.results.withoutPooling.find(r => r.concurrentUsers === pooled.concurrentUsers);
      if (nonPooled) {
        const throughputImprovement = ((pooled.requests.average - nonPooled.requests.average) / nonPooled.requests.average * 100).toFixed(1);
        const latencyImprovement = ((nonPooled.latency.p99 - pooled.latency.p99) / nonPooled.latency.p99 * 100).toFixed(1);
        
        console.log(`  ${pooled.concurrentUsers} users: +${throughputImprovement}% throughput, -${latencyImprovement}% latency`);
      }
    });
  }
}

// Run benchmark if called directly
if (require.main === module) {
  const benchmark = new PostgresBenchmark();
  benchmark.runFullBenchmark().catch(console.error);
}

module.exports = PostgresBenchmark;