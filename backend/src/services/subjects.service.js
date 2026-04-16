import pool from "../config/db.js";
import { ApiError } from "../utils/ApiError.js";
import { handleDatabaseError } from "../utils/dbErrorHandler.js";

export const subjectsService = {
  list: async (filters = {}) => {
    const { departmentId } = filters;
    
    let query = `
      SELECT 
        s.subject_id, s.department_id, s.name, s.code, s.total_mark, s.created_at, s.updated_at,
        json_build_object(
          'departmentId', d.department_id,
          'name', d.name,
          'code', d.code
        ) as department
      FROM subjects s
      LEFT JOIN departments d ON s.department_id = d.department_id
    `;
    
    const params = [];
    if (departmentId) {
      query += ' WHERE s.department_id = $1';
      params.push(parseInt(departmentId));
    }
    
    query += ' ORDER BY s.name ASC';
    
    const result = await pool.query(query, params);
    return result.rows.map(row => ({
      subjectId: row.subject_id,
      departmentId: row.department_id,
      name: row.name,
      code: row.code,
      totalMark: row.total_mark,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      department: row.department_id ? row.department : null
    }));
  },

  getById: async (id) => {
    const result = await pool.query(`
      SELECT 
        s.subject_id, s.department_id, s.name, s.code, s.total_mark, s.created_at, s.updated_at,
        json_build_object(
          'departmentId', d.department_id,
          'name', d.name,
          'code', d.code
        ) as department
      FROM subjects s
      LEFT JOIN departments d ON s.department_id = d.department_id
      WHERE s.subject_id = $1
    `, [parseInt(id)]);
    
    if (result.rows.length === 0) {
      throw new ApiError(404, 'Subject not found');
    }
    
    const row = result.rows[0];
    return {
      subjectId: row.subject_id,
      departmentId: row.department_id,
      name: row.name,
      code: row.code,
      totalMark: row.total_mark,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      department: row.department_id ? row.department : null
    };
  },

  create: async (payload) => {
    const { name, code, departmentId, totalMark } = payload;
    
    const result = await pool.query(`
      INSERT INTO subjects (name, code, department_id, total_mark)
      VALUES ($1, $2, $3, $4)
      RETURNING subject_id
    `, [
      name,
      code,
      departmentId ? parseInt(departmentId) : null,
      totalMark !== undefined ? parseInt(totalMark) : 100
    ]);
    
    return await subjectsService.getById(result.rows[0].subject_id);
  },

  update: async (id, payload) => {
    const { name, code, departmentId, totalMark } = payload;
    
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
    if (departmentId !== undefined) {
      updates.push(`department_id = $${paramCount++}`);
      values.push(departmentId ? parseInt(departmentId) : null);
    }
    if (totalMark !== undefined) {
      updates.push(`total_mark = $${paramCount++}`);
      values.push(parseInt(totalMark));
    }
    
    if (updates.length === 0) {
      throw new ApiError(400, 'No fields to update');
    }
    
    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(parseInt(id));
    
    const result = await pool.query(
      `UPDATE subjects SET ${updates.join(', ')} WHERE subject_id = $${paramCount} RETURNING subject_id`,
      values
    );
    
    if (result.rows.length === 0) {
      throw new ApiError(404, 'Subject not found');
    }
    
    return await subjectsService.getById(id);
  },

  remove: async (id) => {
    const result = await pool.query(
      'DELETE FROM subjects WHERE subject_id = $1 RETURNING subject_id',
      [parseInt(id)]
    );
    
    if (result.rows.length === 0) {
      throw new ApiError(404, 'Subject not found');
    }
    
    return { success: true };
  }
};
