import pg from 'pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env') });

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const email = 'admin@golden.edu';
    const plainPassword = 'Admin123@';
    
    // Check if user already exists
    const checkRes = await client.query('SELECT user_id FROM users WHERE email = $1', [email]);
    if (checkRes.rows.length > 0) {
      console.log('Admin user already exists.');
      return;
    }

    console.log('Creating initial SYSTEM_ADMIN user...');
    const hash = await bcrypt.hash(plainPassword, 12);
    
    const userResult = await client.query(
      'INSERT INTO users (email, password_hash, is_active) VALUES ($1, $2, TRUE) RETURNING user_id',
      [email, hash]
    );
    const userId = userResult.rows[0].user_id;

    // Get SYSTEM_ADMIN role_id
    const roleResult = await client.query('SELECT role_id FROM roles WHERE name = $1', ['SYSTEM_ADMIN']);
    const roleId = roleResult.rows[0].role_id;

    if (!roleId) {
      throw new Error("Roles haven't been created yet. Ensure schema.sql has been run.");
    }

    // Link user to role
    await client.query('INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)', [userId, roleId]);

    await client.query('COMMIT');
    console.log(`\n🎉 Seed completed successfully!`);
    console.log(`Use the following credentials to login:`);
    console.log(`Email:    ${email}`);
    console.log(`Password: ${plainPassword}\n`);

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seed error:', err.message);
  } finally {
    client.release();
    pool.end();
  }
}

seed();