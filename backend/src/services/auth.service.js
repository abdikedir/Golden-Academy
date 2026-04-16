import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { ApiError } from "../utils/ApiError.js";
import pool from "../config/db.js";
import { handleDatabaseError } from "../utils/dbErrorHandler.js";

const createToken = (payload) =>
  jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn });

export const register = async ({ email, password, roleName = "TEACHER" }) => {
  // Check if user already exists
  const existingResult = await pool.query(
    "SELECT user_id FROM users WHERE email = $1",
    [email],
  );

  if (existingResult.rows.length > 0) {
    throw new ApiError(409, "Email already registered");
  }

  // Hash password with bcrypt (cost factor 12)
  const passwordHash = await bcrypt.hash(password, 12);

  // Find role
  const roleResult = await pool.query(
    "SELECT role_id FROM roles WHERE name = $1",
    [roleName],
  );

  if (roleResult.rows.length === 0) {
    throw new ApiError(400, "Role does not exist");
  }

  const roleId = roleResult.rows[0].role_id;

  // Create user with role assignment in a transaction
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const userResult = await client.query(
      "INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING user_id, email, is_active, created_at",
      [email, passwordHash],
    );

    const user = userResult.rows[0];

    await client.query(
      "INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)",
      [user.user_id, roleId],
    );

    await client.query("COMMIT");

    const token = createToken({ user_id: user.user_id, email: user.email });

    return {
      token,
      user: {
        user_id: user.user_id,
        email: user.email,
        is_active: user.is_active,
        created_at: user.created_at,
      },
    };
  } catch (error) {
    await client.query("ROLLBACK");
    handleDatabaseError(error, "Email already registered");
  } finally {
    client.release();
  }
};

export const login = async ({ email, password }) => {
  // Fetch user with roles and teacher profile
  const userResult = await pool.query(
    `
    SELECT 
      u.user_id, u.email, u.password_hash, u.is_active,
      json_agg(
        json_build_object('role_id', r.role_id, 'name', r.name)
      ) FILTER (WHERE r.role_id IS NOT NULL) as roles,
      t.teacher_id, t.full_name, t.department_id,
      d.name as department_name, d.code as department_code
    FROM users u
    LEFT JOIN user_roles ur ON u.user_id = ur.user_id
    LEFT JOIN roles r ON ur.role_id = r.role_id
    LEFT JOIN teachers t ON u.user_id = t.user_id
    LEFT JOIN departments d ON t.department_id = d.department_id
    WHERE u.email = $1
    GROUP BY u.user_id, t.teacher_id, t.full_name, t.department_id, d.name, d.code
  `,
    [email],
  );

  if (userResult.rows.length === 0) {
    throw new ApiError(401, "Invalid email or password");
  }

  const user = userResult.rows[0];

  if (!user.is_active) {
    throw new ApiError(403, "User account is inactive");
  }

  // Verify password
  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) {
    throw new ApiError(401, "Invalid email or password");
  }

  // Extract roles
  const roles = user.roles
    ? user.roles.map((r) => r?.name).filter(Boolean)
    : [];

  if (roles.length === 0 && user.teacher_id) {
    roles.push("TEACHER");
  }

  const token = createToken({
    user_id: user.user_id,
    email: user.email,
    roles,
  });

  return {
    token,
    user: {
      user_id: user.user_id,
      email: user.email,
      is_active: user.is_active,
      roles,
      teacher: user.teacher_id
        ? {
            teacher_id: user.teacher_id,
            full_name: user.full_name,
            department_id: user.department_id,
            department: user.department_id
              ? {
                  department_id: user.department_id,
                  name: user.department_name,
                  code: user.department_code,
                }
              : null,
          }
        : null,
    },
  };
};
