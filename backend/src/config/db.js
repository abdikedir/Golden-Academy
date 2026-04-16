import pkg from "pg";
const { Pool } = pkg;

// Parse connection string or use individual parameters
const getPoolConfig = () => {
  // If DATABASE_URL is provided, use it (works for both cloud and local)
  if (process.env.DATABASE_URL) {
    return {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
      // Connection pool settings
      max: parseInt(process.env.DB_POOL_MAX || '20'),
      idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
      connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '10000'),
    };
  }
  
  // Fallback to individual parameters (for local development)
  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'student_records',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    ssl: false,
    max: parseInt(process.env.DB_POOL_MAX || '20'),
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
    connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '10000'),
  };
};

export const pool = new Pool(getPoolConfig());

// Test connection on startup
pool.on('connect', () => {
  console.log('✓ Database connected successfully');
});

pool.on('error', (err) => {
  console.error('✗ Unexpected database error:', err);
  // Don't exit immediately - let the application handle reconnection
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing database pool...');
  await pool.end();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, closing database pool...');
  await pool.end();
  process.exit(0);
});

export default pool;
