const { Client } = require('pg');
const config = require('../config/database');

async function setupPostgresDatabase() {
  console.log('🐘 Setting up PostgreSQL test database...');
  
  try {
    // Connect to default postgres database first
    const adminClient = new Client({
      ...config.postgres.local,
      database: 'postgres'
    });
    
    await adminClient.connect();
    console.log('✅ Connected to PostgreSQL server');
    
    // Create test database if it doesn't exist
    try {
      await adminClient.query('CREATE DATABASE pooling_test');
      console.log('✅ Created pooling_test database');
    } catch (error) {
      if (error.code === '42P04') {
        console.log('ℹ️  Database pooling_test already exists');
      } else {
        throw error;
      }
    }
    
    await adminClient.end();
    
    // Connect to the test database and create test table
    const testClient = new Client(config.postgres.local);
    await testClient.connect();
    
    // Create a simple test table
    await testClient.query(`
      CREATE TABLE IF NOT EXISTS test_data (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    // Insert some test data
    await testClient.query(`
      INSERT INTO test_data (name) 
      SELECT 'Test User ' || generate_series(1, 1000)
      ON CONFLICT DO NOTHING
    `);
    
    console.log('✅ Created test table and inserted sample data');
    
    // Test connection
    const result = await testClient.query('SELECT COUNT(*) FROM test_data');
    console.log(`✅ Test query successful: ${result.rows[0].count} records in test table`);
    
    await testClient.end();
    console.log('🎉 PostgreSQL setup completed successfully!');
    
  } catch (error) {
    console.error('❌ PostgreSQL setup failed:', error.message);
    console.log('\n📋 Setup Instructions:');
    console.log('1. Install PostgreSQL: https://www.postgresql.org/download/');
    console.log('2. Start PostgreSQL service');
    console.log('3. Update config/database.js with your PostgreSQL credentials');
    console.log('4. Run this setup script again');
    process.exit(1);
  }
}

async function testConnection() {
  console.log('\n🔍 Testing PostgreSQL connection...');
  
  try {
    const client = new Client(config.postgres.local);
    await client.connect();
    
    const result = await client.query('SELECT version()');
    console.log('✅ PostgreSQL version:', result.rows[0].version.split(' ')[0] + ' ' + result.rows[0].version.split(' ')[1]);
    
    await client.end();
    return true;
  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
    return false;
  }
}

if (require.main === module) {
  setupPostgresDatabase().catch(console.error);
}

module.exports = { setupPostgresDatabase, testConnection };