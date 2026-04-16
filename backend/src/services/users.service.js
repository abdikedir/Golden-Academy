import pool from "../config/db.js";
import bcrypt from "bcryptjs";
import { ApiError } from "../utils/ApiError.js";
import { handleDatabaseError } from "../utils/dbErrorHandler.js";

export const usersService = {
  list: async () => {
    const result = await pool.query(
      "SELECT user_id, email, is_active, created_at, updated_at FROM users ORDER BY user_id ASC",
    );
    return result.rows;
  },

  getById: async (id) => {
    const result = await pool.query(
      "SELECT user_id, email, is_active, created_at, updated_at FROM users WHERE user_id = $1",
      [parseInt(id)],
    );

    if (result.rows.length === 0) {
      throw new ApiError(404, "User not found");
    }

    return result.rows[0];
  },

  create: async (payload) => {
    const { email, password } = payload;
    const isActive = payload.isActive ?? payload.is_active;

    // Hash password with bcrypt (cost factor 12)
    const passwordHash = await bcrypt.hash(password, 12);

    try {
      const result = await pool.query(
        "INSERT INTO users (email, password_hash, is_active) VALUES ($1, $2, $3) RETURNING user_id, email, is_active, created_at, updated_at",
        [email, passwordHash, isActive !== undefined ? isActive : true],
      );

      return result.rows[0];
    } catch (error) {
      handleDatabaseError(error, "Email already registered");
    }
  },

  update: async (id, payload) => {
    const { email, password } = payload;
    const isActive = payload.isActive ?? payload.is_active;

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (email !== undefined) {
      updates.push(`email = $${paramCount++}`);
      values.push(email);
    }
    if (password !== undefined) {
      // Hash password with bcrypt (cost factor 12)
      const passwordHash = await bcrypt.hash(password, 12);
      updates.push(`password_hash = $${paramCount++}`);
      values.push(passwordHash);
    }
    if (isActive !== undefined) {
      updates.push(`is_active = $${paramCount++}`);
      values.push(isActive);
    }

    if (updates.length === 0) {
      throw new ApiError(400, "No fields to update");
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(parseInt(id));

    try {
      const result = await pool.query(
        `UPDATE users SET ${updates.join(", ")} WHERE user_id = $${paramCount} RETURNING user_id, email, is_active, created_at, updated_at`,
        values,
      );

      if (result.rows.length === 0) {
        throw new ApiError(404, "User not found");
      }

      return result.rows[0];
    } catch (error) {
      handleDatabaseError(error, "Email already registered");
    }
  },

  remove: async (id) => {
    try {
      const result = await pool.query(
        "DELETE FROM users WHERE user_id = $1 RETURNING user_id",
        [parseInt(id)],
      );

      if (result.rows.length === 0) {
        throw new ApiError(404, "User not found");
      }

      return { success: true };
    } catch (error) {
      handleDatabaseError(error);
    }
  },

  listWithRoles: async () => {
    const result = await pool.query(`
      SELECT 
        u.user_id, u.email, u.is_active,
        COALESCE(
          json_agg(r.name) FILTER (WHERE r.name IS NOT NULL),
          '[]'
        ) as roles
      FROM users u
      LEFT JOIN user_roles ur ON u.user_id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.role_id
      GROUP BY u.user_id, u.email, u.is_active
      ORDER BY u.user_id ASC
    `);

    return result.rows.map((row) => ({
      user_id: row.user_id,
      email: row.email,
      is_active: row.is_active,
      roles: row.roles,
    }));
  },

  assignRole: async (userId, roleId) => {
    // Check if user exists
    const userResult = await pool.query(
      "SELECT user_id FROM users WHERE user_id = $1",
      [parseInt(userId)],
    );

    if (userResult.rows.length === 0) {
      throw new ApiError(404, "User not found");
    }

    // Check if role exists
    const roleResult = await pool.query(
      "SELECT role_id FROM roles WHERE role_id = $1",
      [parseInt(roleId)],
    );

    if (roleResult.rows.length === 0) {
      throw new ApiError(404, "Role not found");
    }

    // Check if already assigned
    const existingResult = await pool.query(
      "SELECT * FROM user_roles WHERE user_id = $1 AND role_id = $2",
      [parseInt(userId), parseInt(roleId)],
    );

    if (existingResult.rows.length > 0) {
      throw new ApiError(409, "Role already assigned to user");
    }

    // Assign role
    try {
      await pool.query(
        "INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)",
        [parseInt(userId), parseInt(roleId)],
      );

      return { success: true, message: "Role assigned successfully" };
    } catch (error) {
      handleDatabaseError(error);
    }
  },

  removeRole: async (userId, roleId) => {
    try {
      // Check if assignment exists
      const result = await pool.query(
        "DELETE FROM user_roles WHERE user_id = $1 AND role_id = $2 RETURNING *",
        [parseInt(userId), parseInt(roleId)],
      );

      if (result.rows.length === 0) {
        throw new ApiError(404, "Role assignment not found");
      }

      return { success: true, message: "Role removed successfully" };
    } catch (error) {
      handleDatabaseError(error);
    }
  },
};
