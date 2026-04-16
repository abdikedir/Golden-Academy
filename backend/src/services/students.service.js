import pool from "../config/db.js";
import { ApiError } from "../utils/ApiError.js";
import { handleDatabaseError } from "../utils/dbErrorHandler.js";

const getAcademicYearCode = (date = new Date()) => {
  const year = date.getFullYear();
  const current = String(year).slice(-2);
  const next = String(year + 1).slice(-2);
  return `${current}${next}`;
};

const generateStudentSchoolId = async (client) => {
  const academicYearCode = getAcademicYearCode();
  await client.query("SELECT pg_advisory_xact_lock($1)", [
    parseInt(academicYearCode, 10),
  ]);

  const maxResult = await client.query(
    `
      SELECT COALESCE(
        MAX((regexp_match(student_school_id, '^GA(\\d{4})/' || $1 || '$'))[1]::int),
        0
      ) AS max_seq
      FROM students
      WHERE student_school_id ~ ('^GA\\d{4}/' || $1 || '$')
    `,
    [academicYearCode],
  );

  const nextSequence = (maxResult.rows[0]?.max_seq || 0) + 1;
  const sequencePart = String(nextSequence).padStart(4, "0");
  return `GA${sequencePart}/${academicYearCode}`;
};

export const studentsService = {
  list: async () => {
    const result = await pool.query(`
      SELECT 
        student_id, 
        student_school_id, 
        full_name, 
        gender, 
        created_at, 
        updated_at
      FROM students
      ORDER BY full_name ASC
    `);

    return result.rows.map((row) => ({
      studentId: row.student_id,
      studentSchoolId: row.student_school_id,
      fullName: row.full_name,
      gender: row.gender,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  },

  getById: async (id) => {
    const result = await pool.query(
      `
      SELECT 
        student_id, 
        student_school_id, 
        full_name, 
        gender, 
        created_at, 
        updated_at
      FROM students
      WHERE student_id = $1
    `,
      [parseInt(id)],
    );

    if (result.rows.length === 0) {
      throw new ApiError(404, "Student not found");
    }

    const row = result.rows[0];
    return {
      studentId: row.student_id,
      studentSchoolId: row.student_school_id,
      fullName: row.full_name,
      gender: row.gender,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  },

  create: async (payload) => {
    const { fullName, gender } = payload;

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const generatedStudentSchoolId = await generateStudentSchoolId(client);

      const result = await client.query(
        `
        INSERT INTO students (student_school_id, full_name, gender)
        VALUES ($1, $2, $3)
        RETURNING student_id, student_school_id, full_name, gender, created_at, updated_at
      `,
        [generatedStudentSchoolId, fullName, gender || null],
      );

      await client.query("COMMIT");

      const row = result.rows[0];
      return {
        studentId: row.student_id,
        studentSchoolId: row.student_school_id,
        fullName: row.full_name,
        gender: row.gender,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    } catch (error) {
      await client.query("ROLLBACK");
      handleDatabaseError(error, "Student with this school ID already exists");
    } finally {
      client.release();
    }
  },

  update: async (id, payload) => {
    const { studentSchoolId, fullName, gender } = payload;

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (studentSchoolId !== undefined) {
      updates.push(`student_school_id = $${paramCount++}`);
      values.push(studentSchoolId);
    }
    if (fullName !== undefined) {
      updates.push(`full_name = $${paramCount++}`);
      values.push(fullName);
    }
    if (gender !== undefined) {
      updates.push(`gender = $${paramCount++}`);
      values.push(gender);
    }

    if (updates.length === 0) {
      throw new ApiError(400, "No fields to update");
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(parseInt(id));

    try {
      const result = await pool.query(
        `
        UPDATE students 
        SET ${updates.join(", ")} 
        WHERE student_id = $${paramCount}
        RETURNING student_id, student_school_id, full_name, gender, created_at, updated_at
      `,
        values,
      );

      if (result.rows.length === 0) {
        throw new ApiError(404, "Student not found");
      }

      const row = result.rows[0];
      return {
        studentId: row.student_id,
        studentSchoolId: row.student_school_id,
        fullName: row.full_name,
        gender: row.gender,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    } catch (error) {
      handleDatabaseError(error, "Student with this school ID already exists");
    }
  },

  remove: async (id) => {
    const result = await pool.query(
      "DELETE FROM students WHERE student_id = $1 RETURNING student_id",
      [parseInt(id)],
    );

    if (result.rows.length === 0) {
      throw new ApiError(404, "Student not found");
    }

    return { success: true };
  },

  search: async (searchTerm, page = 1, limit = 50) => {
    const safePage = Math.max(1, parseInt(page, 10) || 1);
    const safeLimit = Math.min(1000, Math.max(1, parseInt(limit, 10) || 50));
    const offset = (safePage - 1) * safeLimit;
    const normalizedSearch = String(searchTerm ?? "").trim();

    let query;
    let countQuery;
    let params;

    if (normalizedSearch.length > 0) {
      // Search with filter
      query = `
        SELECT 
          student_id, 
          student_school_id, 
          full_name, 
          gender, 
          created_at, 
          updated_at
        FROM students
        WHERE 
          student_school_id ILIKE $1 OR 
          full_name ILIKE $1 OR
          CAST(student_id AS TEXT) ILIKE $1 OR
          ($2 <> '' AND regexp_replace(lower(student_school_id), '[^a-z0-9]', '', 'g') LIKE '%' || $2 || '%') OR
          ($2 <> '' AND regexp_replace(lower(full_name), '[^a-z0-9]', '', 'g') LIKE '%' || $2 || '%')
        ORDER BY full_name ASC
        LIMIT $3 OFFSET $4
      `;

      countQuery = `
        SELECT COUNT(*) as count
        FROM students
        WHERE 
          student_school_id ILIKE $1 OR 
          full_name ILIKE $1 OR
          CAST(student_id AS TEXT) ILIKE $1 OR
          ($2 <> '' AND regexp_replace(lower(student_school_id), '[^a-z0-9]', '', 'g') LIKE '%' || $2 || '%') OR
          ($2 <> '' AND regexp_replace(lower(full_name), '[^a-z0-9]', '', 'g') LIKE '%' || $2 || '%')
      `;

      const searchPattern = `%${normalizedSearch}%`;
      const normalizedPattern = normalizedSearch
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
      params = [searchPattern, normalizedPattern, safeLimit, offset];

      const [studentsResult, countResult] = await Promise.all([
        pool.query(query, params),
        pool.query(countQuery, [searchPattern, normalizedPattern]),
      ]);

      const students = studentsResult.rows.map((row) => ({
        studentId: row.student_id,
        studentSchoolId: row.student_school_id,
        fullName: row.full_name,
        gender: row.gender,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));

      const total = parseInt(countResult.rows[0].count);

      return {
        students,
        total,
        page: safePage,
        totalPages: Math.ceil(total / safeLimit),
      };
    } else {
      // No search term - return all with pagination
      query = `
        SELECT 
          student_id, 
          student_school_id, 
          full_name, 
          gender, 
          created_at, 
          updated_at
        FROM students
        ORDER BY full_name ASC
        LIMIT $1 OFFSET $2
      `;

      countQuery = "SELECT COUNT(*) as count FROM students";

      const [studentsResult, countResult] = await Promise.all([
        pool.query(query, [safeLimit, offset]),
        pool.query(countQuery),
      ]);

      const students = studentsResult.rows.map((row) => ({
        studentId: row.student_id,
        studentSchoolId: row.student_school_id,
        fullName: row.full_name,
        gender: row.gender,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));

      const total = parseInt(countResult.rows[0].count);

      return {
        students,
        total,
        page: safePage,
        totalPages: Math.ceil(total / safeLimit),
      };
    }
  },

  /**
   * Get student with current enrollment information
   * Requirement 5.5: Return student data with nested enrollment and class information
   */
  getByIdWithEnrollment: async (id) => {
    const result = await pool.query(
      `
      SELECT 
        s.student_id, 
        s.student_school_id, 
        s.full_name, 
        s.gender, 
        s.created_at, 
        s.updated_at,
        json_agg(
          json_build_object(
            'enrollmentId', se.enrollment_id,
            'classId', se.class_id,
            'enrolledAt', se.enrolled_at,
            'class', json_build_object(
              'classId', c.class_id,
              'className', c.class_name,
              'grade', c.grade,
              'resultsPublished', c.results_published,
              'term', json_build_object(
                'termId', t.term_id,
                'academicYear', t.academic_year,
                'semester', t.semester
              )
            )
          )
        ) FILTER (WHERE se.enrollment_id IS NOT NULL) as enrollments
      FROM students s
      LEFT JOIN student_enrollments se ON s.student_id = se.student_id
      LEFT JOIN classes c ON se.class_id = c.class_id
      LEFT JOIN terms t ON c.term_id = t.term_id
      WHERE s.student_id = $1
      GROUP BY s.student_id
    `,
      [parseInt(id)],
    );

    if (result.rows.length === 0) {
      throw new ApiError(404, "Student not found");
    }

    const row = result.rows[0];
    return {
      studentId: row.student_id,
      studentSchoolId: row.student_school_id,
      fullName: row.full_name,
      gender: row.gender,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      enrollments: row.enrollments || [],
    };
  },

  /**
   * Get complete enrollment history for a student across all terms
   * Requirement 5.3: Student history retrieved with JOIN statements across enrollments, classes, and terms
   */
  getEnrollmentHistory: async (id) => {
    const parsedId = parseInt(id);

    // First verify student exists
    const studentResult = await pool.query(
      `
      SELECT 
        student_id, 
        student_school_id, 
        full_name, 
        gender, 
        created_at, 
        updated_at
      FROM students
      WHERE student_id = $1
    `,
      [parsedId],
    );

    if (studentResult.rows.length === 0) {
      throw new ApiError(404, "Student not found");
    }

    const student = {
      studentId: studentResult.rows[0].student_id,
      studentSchoolId: studentResult.rows[0].student_school_id,
      fullName: studentResult.rows[0].full_name,
      gender: studentResult.rows[0].gender,
      createdAt: studentResult.rows[0].created_at,
      updatedAt: studentResult.rows[0].updated_at,
    };

    // Get enrollment history with classes, terms, homeroom teachers, and marks
    const enrollmentsResult = await pool.query(
      `
      SELECT 
        se.enrollment_id,
        se.class_id,
        se.enrolled_at,
        c.class_name,
        c.grade,
        c.results_published,
        t.term_id,
        t.academic_year,
        t.semester,
        json_build_object(
          'teacherId', ht.teacher_id,
          'fullName', ht.full_name
        ) as homeroom_teacher,
        json_agg(
          json_build_object(
            'markId', m.mark_id,
            'markObtained', m.mark_obtained,
            'submittedAt', m.submitted_at,
            'subject', json_build_object(
              'subjectId', sub.subject_id,
              'name', sub.name,
              'code', sub.code,
              'totalMark', sub.total_mark
            )
          )
        ) FILTER (WHERE m.mark_id IS NOT NULL) as marks
      FROM student_enrollments se
      JOIN classes c ON se.class_id = c.class_id
      JOIN terms t ON c.term_id = t.term_id
      LEFT JOIN teachers ht ON c.homeroom_teacher_id = ht.teacher_id
      LEFT JOIN marks m ON se.enrollment_id = m.enrollment_id
      LEFT JOIN subjects sub ON m.subject_id = sub.subject_id
      WHERE se.student_id = $1
      GROUP BY 
        se.enrollment_id, se.class_id, se.enrolled_at,
        c.class_name, c.grade, c.results_published,
        t.term_id, t.academic_year, t.semester,
        ht.teacher_id, ht.full_name
      ORDER BY t.academic_year DESC, t.semester DESC
    `,
      [parsedId],
    );

    const enrollments = enrollmentsResult.rows.map((row) => ({
      enrollmentId: row.enrollment_id,
      classId: row.class_id,
      enrolledAt: row.enrolled_at,
      class: {
        classId: row.class_id,
        className: row.class_name,
        grade: row.grade,
        resultsPublished: row.results_published,
        term: {
          termId: row.term_id,
          academicYear: row.academic_year,
          semester: row.semester,
        },
        homeroomTeacher: row.homeroom_teacher,
      },
      marks: row.marks || [],
    }));

    return {
      student,
      enrollments,
    };
  },
};
