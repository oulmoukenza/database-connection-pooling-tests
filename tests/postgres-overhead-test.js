const { Pool, Client } = require('pg');
const config = require('../config/database');

class PostgresOverheadTest {
  constructor() {
    this.results = {
      postgres: { direct: [], pooled: [] }
    };
  }

  // Measure pure connection establishment time
  async measurePostgresConnectionTime(iterations = 100) {
    console.log('\n🔍 Measuring PostgreSQL Connection Overhead...');
    
    // Test direct connections
    console.log('Testing direct connections...');
    for (let i = 0; i < iterations; i++) {
      const startTime = process.hrtime.bigint();
      
      try {
        const client = new Client(config.postgres.local);
        await client.connect();
        await client.end();
        
        const endTime = process.hrtime.bigint();
        const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
        
        this.results.postgres.direct.push(duration);
      } catch (error) {
        console.error(`Connection ${i} failed:`, error.message);
      }
      
      if (i % 10 === 0) process.stdout.write('.');
    }
    
    // Test pooled connections
    console.log('\nTesting pooled connections...');
    const pool = new Pool({
      ...config.postgres.local,
      max: 10,
      idleTimeoutMillis: 30000
    });
    
    for (let i = 0; i < iterations; i++) {
      const startTime = process.hrtime.bigint();
      
      try {
        const client = await pool.connect();
        client.release();
        
        const endTime = process.hrtime.bigint();
        const duration = Number(endTime - startTime) / 1000000;
        
        this.results.postgres.pooled.push(duration);
      } catch (error) {
        console.error(`Pooled connection ${i} failed:`, error.message);
      }
      
      if (i % 10 === 0) process.stdout.write('.');
    }
    
    await pool.end();
    console.log('\n✅ PostgreSQL connection overhead test completed');
  }

  calculateStats(measurements) {
    const sorted = measurements.sort((a, b) => a - b);
    const len = sorted.length;
    
    return {
      count: len,
      min: sorted[0],
      max: sorted[len - 1],
      average: measurements.reduce((a, b) => a + b, 0) / len,
      median: len % 2 === 0 ? (sorted[len/2 - 1] + sorted[len/2]) / 2 : sorted[Math.floor(len/2)],
      p95: sorted[Math.floor(len * 0.95)],
      p99: sorted[Math.floor(len * 0.99)]
    };
  }

  async runOverheadTests() {
    console.log('🚀 Starting PostgreSQL Connection Overhead Analysis\n');
    
    await this.measurePostgresConnectionTime();
    
    this.printResults();
    await this.saveResults();
  }

  printResults() {
    console.log('\n📊 CONNECTION OVERHEAD ANALYSIS RESULTS');
    console.log('=========================================');
    
    // PostgreSQL Results
    console.log('\n🐘 PostgreSQL:');
    const pgDirect = this.calculateStats(this.results.postgres.direct);
    const pgPooled = this.calculateStats(this.results.postgres.pooled);
    
    console.log('  Direct Connections:');
    console.log(`    Average: ${pgDirect.average.toFixed(2)}ms`);
    console.log(`    Median:  ${pgDirect.median.toFixed(2)}ms`);
    console.log(`    P95:     ${pgDirect.p95.toFixed(2)}ms`);
    console.log(`    P99:     ${pgDirect.p99.toFixed(2)}ms`);
    
    console.log('  Pooled Connections:');
    console.log(`    Average: ${pgPooled.average.toFixed(2)}ms`);
    console.log(`    Median:  ${pgPooled.median.toFixed(2)}ms`);
    console.log(`    P95:     ${pgPooled.p95.toFixed(2)}ms`);
    console.log(`    P99:     ${pgPooled.p99.toFixed(2)}ms`);
    
    const pgImprovement = ((pgDirect.average - pgPooled.average) / pgDirect.average * 100).toFixed(1);
    console.log(`  🎯 Improvement: ${pgImprovement}% faster with pooling`);
    
    console.log('\n💡 Key Insights:');
    console.log(`  • Pooled connections are ${pgImprovement}% faster to acquire`);
    console.log(`  • Direct connections take ${pgDirect.average.toFixed(1)}ms on average`);
    console.log(`  • Pooled connections take ${pgPooled.average.toFixed(1)}ms on average`);
    console.log(`  • Time saved per connection: ${(pgDirect.average - pgPooled.average).toFixed(1)}ms`);
  }

  async saveResults() {
    const fs = require('fs-extra');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `results/connection-overhead-${timestamp}.json`;
    
    await fs.ensureDir('results');
    await fs.writeJson(filename, {
      results: this.results,
      analysis: {
        postgres: {
          direct: this.calculateStats(this.results.postgres.direct),
          pooled: this.calculateStats(this.results.postgres.pooled)
        }
      }
    }, { spaces: 2 });
    
    console.log(`\n📁 Results saved to: ${filename}`);
  }
}

if (require.main === module) {
  const test = new PostgresOverheadTest();
  test.runOverheadTests().catch(console.error);
}

module.exports = PostgresOverheadTest;