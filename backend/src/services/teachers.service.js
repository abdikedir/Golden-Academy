import pool from "../config/db.js";
import bcrypt from "bcryptjs";
import { ApiError } from "../utils/ApiError.js";
import { handleDatabaseError } from "../utils/dbErrorHandler.js";

export const teachersService = {
  list: async (filters = {}) => {
    const { departmentId } = filters;

    let query = `
      SELECT 
        t.teacher_id, t.user_id, t.department_id, t.full_name, t.created_at, t.updated_at,
        json_build_object(
          'departmentId', d.department_id,
          'name', d.name,
          'code', d.code
        ) as department,
        json_build_object(
          'userId', u.user_id,
          'email', u.email,
          'isActive', u.is_active
        ) as user
      FROM teachers t
      LEFT JOIN departments d ON t.department_id = d.department_id
      LEFT JOIN users u ON t.user_id = u.user_id
    `;

    const params = [];
    if (departmentId) {
      query += " WHERE t.department_id = $1";
      params.push(parseInt(departmentId));
    }

    query += " ORDER BY t.full_name ASC";

    const result = await pool.query(query, params);
    return result.rows.map((row) => ({
      teacherId: row.teacher_id,
      userId: row.user_id,
      departmentId: row.department_id,
      fullName: row.full_name,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      department: row.department_id ? row.department : null,
      user: row.user_id ? row.user : null,
    }));
  },

  getById: async (id) => {
    const result = await pool.query(
      `
      SELECT 
        t.teacher_id, t.user_id, t.department_id, t.full_name, t.created_at, t.updated_at,
        json_build_object(
          'departmentId', d.department_id,
          'name', d.name,
          'code', d.code
        ) as department,
        json_build_object(
          'userId', u.user_id,
          'email', u.email,
          'isActive', u.is_active
        ) as user
      FROM teachers t
      LEFT JOIN departments d ON t.department_id = d.department_id
      LEFT JOIN users u ON t.user_id = u.user_id
      WHERE t.teacher_id = $1
    `,
      [parseInt(id)],
    );

    if (result.rows.length === 0) {
      throw new ApiError(404, "Teacher not found");
    }

    const row = result.rows[0];
    return {
      teacherId: row.teacher_id,
      userId: row.user_id,
      departmentId: row.department_id,
      fullName: row.full_name,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      department: row.department_id ? row.department : null,
      user: row.user_id ? row.user : null,
    };
  },

  create: async (payload) => {
    const fullName = payload.fullName ?? payload.full_name;
    const departmentId = payload.departmentId ?? payload.department_id;
    const requestedUserId = payload.userId ?? payload.user_id;
    const email = payload.email;
    const password = payload.password;
    const roleName = payload.roleName ?? payload.role_name ?? "TEACHER";

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      let resolvedUserId = requestedUserId ? parseInt(requestedUserId) : null;

      if (resolvedUserId) {
        const userResult = await client.query(
          "SELECT user_id FROM users WHERE user_id = $1",
          [resolvedUserId],
        );

        if (userResult.rows.length === 0) {
          throw new ApiError(404, "Linked user not found");
        }

        const linkedTeacherResult = await client.query(
          "SELECT teacher_id FROM teachers WHERE user_id = $1",
          [resolvedUserId],
        );

        if (linkedTeacherResult.rows.length > 0) {
          throw new ApiError(
            409,
            "This user is already linked to another teacher profile",
          );
        }
      } else {
        if (!email || !password) {
          throw new ApiError(
            400,
            "Email and password are required to create a teacher account",
          );
        }

        const roleResult = await client.query(
          "SELECT role_id FROM roles WHERE name = $1",
          [roleName],
        );

        if (roleResult.rows.length === 0) {
          throw new ApiError(400, "Selected role does not exist");
        }

        const passwordHash = await bcrypt.hash(password, 12);

        const newUserResult = await client.query(
          "INSERT INTO users (email, password_hash, is_active) VALUES ($1, $2, TRUE) RETURNING user_id",
          [email, passwordHash],
        );

        resolvedUserId = newUserResult.rows[0].user_id;

        await client.query(
          "INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)",
          [resolvedUserId, roleResult.rows[0].role_id],
        );
      }

      const result = await client.query(
        `
        INSERT INTO teachers (full_name, user_id, department_id)
        VALUES ($1, $2, $3)
        RETURNING teacher_id
      `,
        [
          fullName,
          resolvedUserId,
          departmentId ? parseInt(departmentId) : null,
        ],
      );

      await client.query("COMMIT");
      return await teachersService.getById(result.rows[0].teacher_id);
    } catch (error) {
      await client.query("ROLLBACK");
      handleDatabaseError(error, "Failed to create teacher account");
    } finally {
      client.release();
    }
  },

  update: async (id, payload) => {
    const fullName = payload.fullName ?? payload.full_name;
    const userId = payload.userId ?? payload.user_id;
    const departmentId = payload.departmentId ?? payload.department_id;

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (fullName !== undefined) {
      updates.push(`full_name = $${paramCount++}`);
      values.push(fullName);
    }
    if (userId !== undefined) {
      updates.push(`user_id = $${paramCount++}`);
      values.push(userId ? parseInt(userId) : null);
    }
    if (departmentId !== undefined) {
      updates.push(`department_id = $${paramCount++}`);
      values.push(departmentId ? parseInt(departmentId) : null);
    }

    if (updates.length === 0) {
      throw new ApiError(400, "No fields to update");
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(parseInt(id));

    await pool.query(
      `UPDATE teachers SET ${updates.join(", ")} WHERE teacher_id = $${paramCount}`,
      values,
    );

    // Fetch updated teacher with relations
    return await teachersService.getById(id);
  },

  remove: async (id) => {
    const result = await pool.query(
      "DELETE FROM teachers WHERE teacher_id = $1 RETURNING teacher_id",
      [parseInt(id)],
    );

    if (result.rows.length === 0) {
      throw new ApiError(404, "Teacher not found");
    }

    return { success: true };
  },

  assignToSubject: async (teacherId, classSubjectId, requestingUser) => {
    // Verify teacher exists and get their department
    const teacherResult = await pool.query(
      "SELECT teacher_id, department_id FROM teachers WHERE teacher_id = $1",
      [parseInt(teacherId)],
    );

    if (teacherResult.rows.length === 0) {
      throw new ApiError(404, "Teacher not found");
    }

    const teacher = teacherResult.rows[0];

    // Get class subject with subject and department info
    const classSubjectResult = await pool.query(
      `
      SELECT cs.class_subject_id, cs.class_id, cs.subject_id, s.department_id
      FROM class_subjects cs
      JOIN subjects s ON cs.subject_id = s.subject_id
      WHERE cs.class_subject_id = $1
    `,
      [parseInt(classSubjectId)],
    );

    if (classSubjectResult.rows.length === 0) {
      throw new ApiError(404, "Class subject not found");
    }

    const classSubject = classSubjectResult.rows[0];

    // If requesting user is DEPARTMENT_ADMIN, verify both teacher and subject are in their department
    if (requestingUser.roles.includes("DEPARTMENT_ADMIN")) {
      if (teacher.department_id !== requestingUser.departmentId) {
        throw new ApiError(
          403,
          "Cannot assign teachers from other departments",
        );
      }

      if (classSubject.department_id !== requestingUser.departmentId) {
        throw new ApiError(
          403,
          "Cannot assign to subjects from other departments",
        );
      }
    }

    // Create the assignment
    const assignmentResult = await pool.query(
      `
      INSERT INTO teacher_class_subject (teacher_id, class_subject_id)
      VALUES ($1, $2)
      RETURNING teacher_class_subject_id
    `,
      [parseInt(teacherId), parseInt(classSubjectId)],
    );

    // Fetch full assignment details
    const fullAssignment = await pool.query(
      `
      SELECT 
        tcs.teacher_class_subject_id,
        json_build_object(
          'teacherId', t.teacher_id,
          'fullName', t.full_name
        ) as teacher,
        json_build_object(
          'classSubjectId', cs.class_subject_id,
          'class', json_build_object(
            'classId', c.class_id,
            'className', c.class_name
          ),
          'subject', json_build_object(
            'subjectId', s.subject_id,
            'name', s.name
          )
        ) as "classSubject"
      FROM teacher_class_subject tcs
      JOIN teachers t ON tcs.teacher_id = t.teacher_id
      JOIN class_subjects cs ON tcs.class_subject_id = cs.class_subject_id
      JOIN classes c ON cs.class_id = c.class_id
      JOIN subjects s ON cs.subject_id = s.subject_id
      WHERE tcs.teacher_class_subject_id = $1
    `,
      [assignmentResult.rows[0].teacher_class_subject_id],
    );

    const row = fullAssignment.rows[0];
    return {
      teacherClassSubjectId: row.teacher_class_subject_id,
      teacher: row.teacher,
      classSubject: row.classSubject,
    };
  },

  removeFromSubject: async (teacherId, classSubjectId) => {
    const result = await pool.query(
      "DELETE FROM teacher_class_subject WHERE teacher_id = $1 AND class_subject_id = $2 RETURNING teacher_class_subject_id",
      [parseInt(teacherId), parseInt(classSubjectId)],
    );

    if (result.rows.length === 0) {
      throw new ApiError(404, "Teacher assignment not found");
    }

    return { success: true };
  },

  getAssignments: async (teacherId) => {
    const result = await pool.query(
      `
      SELECT 
        tcs.teacher_class_subject_id,
        json_build_object(
          'classSubjectId', cs.class_subject_id,
          'class', json_build_object(
            'classId', c.class_id,
            'className', c.class_name,
            'grade', c.grade,
            'resultsPublished', c.results_published,
            'term', json_build_object(
              'termId', tm.term_id,
              'academicYear', tm.academic_year,
              'semester', tm.semester
            )
          ),
          'subject', json_build_object(
            'subjectId', s.subject_id,
            'name', s.name,
            'code', s.code
          )
        ) as "classSubject"
      FROM teacher_class_subject tcs
      JOIN class_subjects cs ON tcs.class_subject_id = cs.class_subject_id
      JOIN classes c ON cs.class_id = c.class_id
      JOIN terms tm ON c.term_id = tm.term_id
      JOIN subjects s ON cs.subject_id = s.subject_id
      WHERE tcs.teacher_id = $1
      ORDER BY c.class_name ASC, s.name ASC
    `,
      [parseInt(teacherId)],
    );

    return result.rows.map((row) => ({
      teacherClassSubjectId: row.teacher_class_subject_id,
      classSubject: row.classSubject,
    }));
  },

  getHomeroomClass: async (teacherId) => {
    const result = await pool.query(
      `
      SELECT 
        c.class_id, c.class_name, c.grade, c.results_published, c.created_at, c.updated_at,
        json_build_object(
          'termId', tm.term_id,
          'academicYear', tm.academic_year,
          'semester', tm.semester
        ) as term,
        json_agg(
          json_build_object(
            'classSubjectId', cs.class_subject_id,
            'subject', json_build_object(
              'subjectId', s.subject_id,
              'name', s.name,
              'code', s.code
            )
          )
        ) FILTER (WHERE cs.class_subject_id IS NOT NULL) as "classSubjects"
      FROM classes c
      JOIN terms tm ON c.term_id = tm.term_id
      LEFT JOIN class_subjects cs ON c.class_id = cs.class_id
      LEFT JOIN subjects s ON cs.subject_id = s.subject_id
      WHERE c.homeroom_teacher_id = $1
      GROUP BY c.class_id, c.class_name, c.grade, c.results_published, c.created_at, c.updated_at,
               tm.term_id, tm.academic_year, tm.semester
      LIMIT 1
    `,
      [parseInt(teacherId)],
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      classId: row.class_id,
      className: row.class_name,
      grade: row.grade,
      resultsPublished: row.results_published,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      term: row.term,
      classSubjects: row.classSubjects || [],
    };
  },
};
