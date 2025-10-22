module.exports = {
  postgres: {
    // Local PostgreSQL - UPDATE THESE CREDENTIALS
    local: {
      host: "localhost",
      port: 5432,
      database: "pooling_test",
      user: "postgres",
      password: "1", // <-- Change this
    },
    // Google Cloud SQL PostgreSQL
    cloudSql: {
      host: "your-cloud-sql-ip",
      port: 5432,
      database: "pooling_test",
      user: "postgres",
      password: "your-password",
      ssl: { rejectUnauthorized: false },
    },
  },

  mysql: {
    // Local MySQL
    local: {
      host: "localhost",
      port: 3306,
      database: "pooling_test",
      user: "root",
      password: "password",
    },
    // Google Cloud SQL MySQL
    cloudSql: {
      host: "your-cloud-sql-ip",
      port: 3306,
      database: "pooling_test",
      user: "root",
      password: "your-password",
      ssl: { rejectUnauthorized: false },
    },
  },

  // Test configurations
  testConfig: {
    // Connection pool sizes to test
    poolSizes: [5, 10, 20, 50, 100],

    // Concurrent user loads to test
    concurrentUsers: [10, 50, 100, 200, 500, 1000],

    // Test duration in seconds
    testDuration: 30,

    // Number of test iterations
    iterations: 3,
  },
};
