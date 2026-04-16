import pool from "../config/db.js";
import { ApiError } from "../utils/ApiError.js";
import { handleDatabaseError } from "../utils/dbErrorHandler.js";

export const departmentsService = {
  list: async () => {
    const result = await pool.query(`
      SELECT 
        d.department_id,
        d.name,
        d.code,
        d.created_at,
        d.updated_at,
        COUNT(DISTINCT t.teacher_id) as teacher_count,
        COUNT(DISTINCT s.subject_id) as subject_count
      FROM departments d
      LEFT JOIN teachers t ON d.department_id = t.department_id
      LEFT JOIN subjects s ON d.department_id = s.department_id
      GROUP BY d.department_id, d.name, d.code, d.created_at, d.updated_at
      ORDER BY d.name ASC
    `);
    
    return result.rows.map(row => ({
      departmentId: row.department_id,
      name: row.name,
      code: row.code,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      teacherCount: parseInt(row.teacher_count),
      subjectCount: parseInt(row.subject_count)
    }));
  },

  getById: async (id) => {
    const result = await pool.query(`
      SELECT 
        d.department_id,
        d.name,
        d.code,
        d.created_at,
        d.updated_at,
        COUNT(DISTINCT t.teacher_id) as teacher_count,
        COUNT(DISTINCT s.subject_id) as subject_count
      FROM departments d
      LEFT JOIN teachers t ON d.department_id = t.department_id
      LEFT JOIN subjects s ON d.department_id = s.department_id
      WHERE d.department_id = $1
      GROUP BY d.department_id, d.name, d.code, d.created_at, d.updated_at
    `, [parseInt(id)]);
    
    if (result.rows.length === 0) {
      throw new ApiError(404, 'Department not found');
    }
    
    const row = result.rows[0];
    return {
      departmentId: row.department_id,
      name: row.name,
      code: row.code,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      teacherCount: parseInt(row.teacher_count),
      subjectCount: parseInt(row.subject_count)
    };
  },

  create: async (payload) => {
    const { name, code } = payload;
    
    try {
      const result = await pool.query(
        'INSERT INTO departments (name, code) VALUES ($1, $2) RETURNING department_id, name, code, created_at, updated_at',
        [name, code]
      );
      
      const row = result.rows[0];
      return {
        departmentId: row.department_id,
        name: row.name,
        code: row.code,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };
    } catch (error) {
      handleDatabaseError(error, 'Department with this name or code already exists');
    }
  },

  update: async (id, payload) => {
    const { name, code } = payload;
    
    const updates = [];
    const values = [];
    let paramCount = 1;
    
    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(name);
    }
    if (code !== undefined) {
      updates.push(`code = $${paramCount++}`);
      values.push(code);
    }
    
    if (updates.length === 0) {
      throw new ApiError(400, 'No fields to update');
    }
    
    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(parseInt(id));
    
    try {
      const result = await pool.query(
        `UPDATE departments SET ${updates.join(', ')} WHERE department_id = $${paramCount} RETURNING department_id, name, code, created_at, updated_at`,
        values
      );
      
      if (result.rows.length === 0) {
        throw new ApiError(404, 'Department not found');
      }
      
      const row = result.rows[0];
      return {
        departmentId: row.department_id,
        name: row.name,
        code: row.code,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };
    } catch (error) {
      handleDatabaseError(error, 'Department with this name or code already exists');
    }
  },

  remove: async (id) => {
    try {
      const result = await pool.query(
        'DELETE FROM departments WHERE department_id = $1 RETURNING department_id',
        [parseInt(id)]
      );
      
      if (result.rows.length === 0) {
        throw new ApiError(404, 'Department not found');
      }
      
      return { success: true };
    } catch (error) {
      handleDatabaseError(error, 'Cannot delete department with associated teachers or subjects');
    }
  }
};
