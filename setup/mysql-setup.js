const mysql = require('mysql2/promise');
const config = require('../config/database');

async function setupMySQLDatabase() {
  console.log('🐬 Setting up MySQL test database...');
  
  try {
    // Connect to MySQL server (without specifying database)
    const adminConnection = await mysql.createConnection({
      ...config.mysql.local,
      database: undefined
    });
    
    console.log('✅ Connected to MySQL server');
    
    // Create test database if it doesn't exist
    try {
      await adminConnection.execute('CREATE DATABASE pooling_test');
      console.log('✅ Created pooling_test database');
    } catch (error) {
      if (error.code === 'ER_DB_CREATE_EXISTS') {
        console.log('ℹ️  Database pooling_test already exists');
      } else {
        throw error;
      }
    }
    
    await adminConnection.end();
    
    // Connect to the test database and create test table
    const testConnection = await mysql.createConnection(config.mysql.local);
    
    // Create a simple test table
    await testConnection.execute(`
      CREATE TABLE IF NOT EXISTS test_data (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Check if we need to insert test data
    const [countResult] = await testConnection.execute('SELECT COUNT(*) as count FROM test_data');
    
    if (countResult[0].count === 0) {
      // Insert test data in batches
      console.log('📝 Inserting test data...');
      for (let i = 1; i <= 1000; i += 100) {
        const values = [];
        const placeholders = [];
        
        for (let j = i; j < i + 100 && j <= 1000; j++) {
          values.push(`Test User ${j}`);
          placeholders.push('(?)');
        }
        
        await testConnection.execute(
          `INSERT INTO test_data (name) VALUES ${placeholders.join(', ')}`,
          values
        );
      }
    }
    
    console.log('✅ Created test table and inserted sample data');
    
    // Test connection
    const [result] = await testConnection.execute('SELECT COUNT(*) as count FROM test_data');
    console.log(`✅ Test query successful: ${result[0].count} records in test table`);
    
    await testConnection.end();
    console.log('🎉 MySQL setup completed successfully!');
    
  } catch (error) {
    console.error('❌ MySQL setup failed:', error.message);
    console.log('\n📋 Setup Instructions:');
    console.log('1. Install MySQL: https://dev.mysql.com/downloads/mysql/');
    console.log('2. Start MySQL service');
    console.log('3. Update config/database.js with your MySQL credentials');
    console.log('4. Run this setup script again');
    process.exit(1);
  }
}

async function testConnection() {
  console.log('\n🔍 Testing MySQL connection...');
  
  try {
    const connection = await mysql.createConnection(config.mysql.local);
    
    const [result] = await connection.execute('SELECT VERSION() as version');
    console.log('✅ MySQL version:', result[0].version);
    
    await connection.end();
    return true;
  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
    return false;
  }
}

if (require.main === module) {
  setupMySQLDatabase().catch(console.error);
}

module.exports = { setupMySQLDatabase, testConnection };