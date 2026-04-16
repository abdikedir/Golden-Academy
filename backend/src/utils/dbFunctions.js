/**
 * Database Functions and Procedures
 *
 * This file provides wrappers for PostgreSQL stored procedures and functions
 * that are preserved from the original schema.sql
 * These functions are called through direct pool.query() with SQL
 */

import pool from "../config/db.js";

/**
 * Submit Student Mark
 * Validates and submits marks with authorization checks
 *
 * @param {number} teacherId - ID of the teacher submitting the mark
 * @param {number} enrollmentId - ID of the student enrollment
 * @param {number} subjectId - ID of the subject
 * @param {number} mark - Mark obtained (0-100)
 * @throws {Error} If validation fails or teacher not authorized
 */
export async function submitStudentMark(
  teacherId,
  enrollmentId,
  subjectId,
  mark,
) {
  try {
    await pool.query(
      `SELECT submit_student_mark($1::INT, $2::INT, $3::INT, $4::INT)`,
      [teacherId, enrollmentId, subjectId, mark]
    );
  } catch (error) {
    // Re-throw with more context
    throw new Error(error.message || "Failed to submit student mark");
  }
}

/**
 * Check Class Marks Completion
 * Verifies if all marks have been submitted for a class
 *
 * @param {number} classId - ID of the class
 * @returns {Promise<boolean>} True if all marks are complete
 */
export async function checkClassMarksComplete(classId) {
  const result = await pool.query(
    `SELECT check_class_marks_complete($1::INT) as complete`,
    [classId]
  );
  return result.rows[0]?.complete || false;
}

/**
 * Promote Students
 * Bulk promotes students from current class to next class
 *
 * @param {number} currentClassId - ID of the current class
 * @param {number} nextClassId - ID of the next class
 * @param {number} nextTermId - ID of the next term
 */
export async function promoteStudents(currentClassId, nextClassId, nextTermId) {
  await pool.query(
    `SELECT promote_students($1::INT, $2::INT, $3::INT)`,
    [currentClassId, nextClassId, nextTermId]
  );
}

/**
 * Publish Class Results
 * Publishes results for a class after verifying all marks are complete
 *
 * @param {number} classId - ID of the class
 * @throws {Error} If marks are incomplete
 */
export async function publishClassResults(classId) {
  try {
    await pool.query(
      `SELECT publish_class_results($1::INT)`,
      [classId]
    );
  } catch (error) {
    throw new Error(error.message || "Failed to publish class results");
  }
}

/**
 * Get Student Academic Report
 * Retrieves comprehensive academic report with rankings
 * Uses the student_academic_report view
 *
 * @param {Object} filters - Filter options
 * @param {number} [filters.studentId] - Filter by student ID
 * @param {number} [filters.classId] - Filter by class ID
 * @param {string} [filters.academicYear] - Filter by academic year
 * @param {string} [filters.semester] - Filter by semester
 * @returns {Promise<Array>} Array of student academic reports
 */
export async function getStudentAcademicReport(filters = {}) {
  const { studentId, classId, academicYear, semester } = filters;

  const conditions = [];
  const params = [];
  let paramCount = 1;

  if (studentId) {
    conditions.push(`student_id = $${paramCount++}`);
    params.push(studentId);
  }

  if (classId) {
    conditions.push(`class_name = (SELECT class_name FROM classes WHERE class_id = $${paramCount++})`);
    params.push(classId);
  }

  if (academicYear) {
    conditions.push(`academic_year = $${paramCount++}`);
    params.push(academicYear);
  }

  if (semester) {
    conditions.push(`semester = $${paramCount++}`);
    params.push(semester);
  }

  const whereClause = conditions.length > 0 
    ? `WHERE ${conditions.join(' AND ')}` 
    : '';

  const query = `
    SELECT * FROM student_academic_report 
    ${whereClause}
    ORDER BY rank NULLS LAST, average_score DESC
  `;

  const result = await pool.query(query, params);
  return result.rows;
}

/**
 * Get Student Subject Marks
 * Retrieves marks for students with subject details
 * Uses the student_subject_marks view
 *
 * @param {Object} filters - Filter options
 * @param {number} [filters.studentId] - Filter by student ID
 * @param {number} [filters.classId] - Filter by class ID
 * @param {number} [filters.subjectId] - Filter by subject ID
 * @returns {Promise<Array>} Array of student subject marks
 */
export async function getStudentSubjectMarks(filters = {}) {
  const { studentId, classId, subjectId } = filters;

  const conditions = [];
  const params = [];
  let paramCount = 1;

  if (studentId) {
    conditions.push(`student_id = $${paramCount++}`);
    params.push(studentId);
  }

  if (classId) {
    conditions.push(`class_id = $${paramCount++}`);
    params.push(classId);
  }

  if (subjectId) {
    conditions.push(`subject_id = $${paramCount++}`);
    params.push(subjectId);
  }

  const whereClause = conditions.length > 0 
    ? `WHERE ${conditions.join(' AND ')}` 
    : '';

  const query = `SELECT * FROM student_subject_marks ${whereClause}`;

  const result = await pool.query(query, params);
  return result.rows;
}

/**
 * Get Student Average
 * Retrieves student averages and totals
 * Uses the student_average view
 *
 * @param {Object} filters - Filter options
 * @param {number} [filters.enrollmentId] - Filter by enrollment ID
 * @param {number} [filters.classId] - Filter by class ID
 * @returns {Promise<Array>} Array of student averages
 */
export async function getStudentAverage(filters = {}) {
  const { enrollmentId, classId } = filters;

  const conditions = [];
  const params = [];
  let paramCount = 1;

  if (enrollmentId) {
    conditions.push(`enrollment_id = $${paramCount++}`);
    params.push(enrollmentId);
  }

  if (classId) {
    conditions.push(`class_id = $${paramCount++}`);
    params.push(classId);
  }

  const whereClause = conditions.length > 0 
    ? `WHERE ${conditions.join(' AND ')}` 
    : '';

  const query = `SELECT * FROM student_average ${whereClause}`;

  const result = await pool.query(query, params);
  return result.rows;
}
