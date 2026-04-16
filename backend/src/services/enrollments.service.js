import pool from "../config/db.js";
import { ApiError } from "../utils/ApiError.js";
import { handleDatabaseError } from "../utils/dbErrorHandler.js";

const parseAcademicYearStart = (academicYear) => {
  const match = String(academicYear ?? "").match(/^(\d{4})/);
  return match ? parseInt(match[1], 10) : NaN;
};

const extractSection = (grade, className) => {
  const normalizedClassName = String(className ?? "")
    .trim()
    .toUpperCase();
  const normalizedGrade = String(grade ?? "")
    .trim()
    .toUpperCase();

  if (normalizedGrade && normalizedClassName.startsWith(normalizedGrade)) {
    return normalizedClassName
      .slice(normalizedGrade.length)
      .replace(/[^A-Z]/g, "");
  }

  const fallback = normalizedClassName.match(/([A-Z]+)$/);
  return fallback ? fallback[1] : "";
};

export const enrollmentsService = {
  /**
   * List enrollments with optional filtering
   */
  list: async (filters = {}) => {
    const { classId, termId, page = 1, limit = 50 } = filters;
    const safePage = Math.max(1, parseInt(page, 10) || 1);
    const safeLimit = Math.min(1000, Math.max(1, parseInt(limit, 10) || 50));
    const offset = (safePage - 1) * safeLimit;

    // Build dynamic WHERE clause
    const conditions = [];
    const params = [];
    let paramCount = 1;

    if (classId) {
      conditions.push(`se.class_id = $${paramCount++}`);
      params.push(parseInt(classId));
    }
    if (termId) {
      conditions.push(`c.term_id = $${paramCount++}`);
      params.push(parseInt(termId));
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // Add limit and offset to params
    const limitParam = `$${paramCount++}`;
    const offsetParam = `$${paramCount++}`;
    params.push(safeLimit, offset);

    // Execute queries in parallel
    const [enrollmentsResult, countResult] = await Promise.all([
      pool.query(
        `
        SELECT 
          se.enrollment_id,
          se.student_id,
          se.class_id,
          se.enrolled_at,
          json_build_object(
            'studentId', s.student_id,
            'studentSchoolId', s.student_school_id,
            'fullName', s.full_name,
            'gender', s.gender
          ) as student,
          json_build_object(
            'classId', c.class_id,
            'className', c.class_name,
            'grade', c.grade,
            'termId', c.term_id,
            'homeroomTeacherId', c.homeroom_teacher_id,
            'resultsPublished', c.results_published,
            'term', json_build_object(
              'termId', t.term_id,
              'academicYear', t.academic_year,
              'semester', t.semester
            )
          ) as class
        FROM student_enrollments se
        JOIN students s ON se.student_id = s.student_id
        JOIN classes c ON se.class_id = c.class_id
        JOIN terms t ON c.term_id = t.term_id
        ${whereClause}
        ORDER BY se.enrolled_at DESC
        LIMIT ${limitParam} OFFSET ${offsetParam}
      `,
        params,
      ),
      pool.query(
        `
        SELECT COUNT(*) as count
        FROM student_enrollments se
        JOIN classes c ON se.class_id = c.class_id
        ${whereClause}
      `,
        params.slice(0, -2),
      ), // Remove limit and offset for count query
    ]);

    const enrollments = enrollmentsResult.rows.map((row) => ({
      enrollmentId: row.enrollment_id,
      studentId: row.student_id,
      classId: row.class_id,
      enrolledAt: row.enrolled_at,
      student: row.student,
      class: row.class,
    }));

    const total = parseInt(countResult.rows[0].count);

    return {
      enrollments,
      total,
      page: safePage,
      totalPages: Math.ceil(total / safeLimit),
    };
  },

  /**
   * Enroll a student in a class with validation
   * Rule: One student can only be enrolled in one class per term
   */
  enrollStudent: async ({ studentId, classId }) => {
    const parsedStudentId = parseInt(studentId);
    const parsedClassId = parseInt(classId);

    // Verify student exists
    const studentResult = await pool.query(
      "SELECT student_id FROM students WHERE student_id = $1",
      [parsedStudentId],
    );

    if (studentResult.rows.length === 0) {
      throw new ApiError(404, "Student not found");
    }

    // Verify class exists and get term info
    const classResult = await pool.query(
      `
      SELECT c.class_id, c.class_name, c.term_id, c.grade,
             t.term_id, t.academic_year, t.semester
      FROM classes c
      JOIN terms t ON c.term_id = t.term_id
      WHERE c.class_id = $1
    `,
      [parsedClassId],
    );

    if (classResult.rows.length === 0) {
      throw new ApiError(404, "Class not found");
    }

    const classData = classResult.rows[0];

    // Check if student is already enrolled in another class for the same term
    const existingEnrollmentResult = await pool.query(
      `
      SELECT se.enrollment_id, se.class_id, c.class_name
      FROM student_enrollments se
      JOIN classes c ON se.class_id = c.class_id
      WHERE se.student_id = $1 AND c.term_id = $2
    `,
      [parsedStudentId, classData.term_id],
    );

    if (existingEnrollmentResult.rows.length > 0) {
      const existingEnrollment = existingEnrollmentResult.rows[0];
      if (existingEnrollment.class_id !== parsedClassId) {
        throw new ApiError(
          409,
          `Student is already enrolled in class ${existingEnrollment.class_name} for this term`,
        );
      }
    }

    // Academic progression rule:
    // student can join Term II only after completing/publishing Term I in the same academic year.
    if (classData.semester === "II") {
      const termOneResult = await pool.query(
        `
        SELECT se.enrollment_id, c.class_name, c.results_published
        FROM student_enrollments se
        JOIN classes c ON se.class_id = c.class_id
        JOIN terms t ON c.term_id = t.term_id
        WHERE se.student_id = $1
          AND t.academic_year = $2
          AND t.semester = 'I'
        ORDER BY se.enrolled_at DESC
        LIMIT 1
      `,
        [parsedStudentId, classData.academic_year],
      );

      if (termOneResult.rows.length === 0) {
        throw new ApiError(
          409,
          `Student must complete Term I before enrolling in Term II for academic year ${classData.academic_year}`,
        );
      }

      if (!termOneResult.rows[0].results_published) {
        throw new ApiError(
          409,
          `Cannot enroll in Term II until Term I results are published for class ${termOneResult.rows[0].class_name}`,
        );
      }
    }

    // Prevent backward enrollment into Term I after a Term II enrollment exists in the same year.
    if (classData.semester === "I") {
      const termTwoResult = await pool.query(
        `
        SELECT se.enrollment_id
        FROM student_enrollments se
        JOIN classes c ON se.class_id = c.class_id
        JOIN terms t ON c.term_id = t.term_id
        WHERE se.student_id = $1
          AND t.academic_year = $2
          AND t.semester = 'II'
        LIMIT 1
      `,
        [parsedStudentId, classData.academic_year],
      );

      if (termTwoResult.rows.length > 0) {
        throw new ApiError(
          409,
          `Student is already enrolled in Term II for academic year ${classData.academic_year} and cannot be enrolled back into Term I`,
        );
      }
    }

    // Enroll student (upsert to handle re-enrollment in same class)
    const enrollmentResult = await pool.query(
      `
      INSERT INTO student_enrollments (student_id, class_id, enrolled_at)
      VALUES ($1, $2, CURRENT_TIMESTAMP)
      ON CONFLICT (student_id, class_id)
      DO UPDATE SET enrolled_at = CURRENT_TIMESTAMP
      RETURNING enrollment_id
    `,
      [parsedStudentId, parsedClassId],
    );

    const enrollmentId = enrollmentResult.rows[0].enrollment_id;

    // Fetch complete enrollment with relations
    const result = await pool.query(
      `
      SELECT 
        se.enrollment_id,
        se.student_id,
        se.class_id,
        se.enrolled_at,
        json_build_object(
          'studentId', s.student_id,
          'studentSchoolId', s.student_school_id,
          'fullName', s.full_name,
          'gender', s.gender,
          'createdAt', s.created_at,
          'updatedAt', s.updated_at
        ) as student,
        json_build_object(
          'classId', c.class_id,
          'className', c.class_name,
          'grade', c.grade,
          'termId', c.term_id,
          'homeroomTeacherId', c.homeroom_teacher_id,
          'resultsPublished', c.results_published,
          'createdAt', c.created_at,
          'updatedAt', c.updated_at,
          'term', json_build_object(
            'termId', t.term_id,
            'academicYear', t.academic_year,
            'semester', t.semester
          )
        ) as class
      FROM student_enrollments se
      JOIN students s ON se.student_id = s.student_id
      JOIN classes c ON se.class_id = c.class_id
      JOIN terms t ON c.term_id = t.term_id
      WHERE se.enrollment_id = $1
    `,
      [enrollmentId],
    );

    const row = result.rows[0];
    return {
      enrollmentId: row.enrollment_id,
      studentId: row.student_id,
      classId: row.class_id,
      enrolledAt: row.enrolled_at,
      student: row.student,
      class: row.class,
    };
  },

  /**
   * Get enrollment history for a student
   * Returns complete academic history across all terms (never deleted)
   */
  getEnrollmentHistory: async (studentId) => {
    const parsedStudentId = parseInt(studentId);

    // Verify student exists
    const studentResult = await pool.query(
      "SELECT student_id, student_school_id, full_name, gender, created_at, updated_at FROM students WHERE student_id = $1",
      [parsedStudentId],
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

    // Get enrollments with class, term, homeroom teacher, and marks
    const enrollmentsResult = await pool.query(
      `
      SELECT 
        se.enrollment_id,
        se.student_id,
        se.class_id,
        se.enrolled_at,
        json_build_object(
          'classId', c.class_id,
          'className', c.class_name,
          'grade', c.grade,
          'termId', c.term_id,
          'homeroomTeacherId', c.homeroom_teacher_id,
          'resultsPublished', c.results_published,
          'createdAt', c.created_at,
          'updatedAt', c.updated_at,
          'term', json_build_object(
            'termId', t.term_id,
            'academicYear', t.academic_year,
            'semester', t.semester
          ),
          'homeroomTeacher', CASE 
            WHEN ht.teacher_id IS NOT NULL THEN json_build_object(
              'teacherId', ht.teacher_id,
              'fullName', ht.full_name
            )
            ELSE NULL
          END
        ) as class,
        COALESCE(
          json_agg(
            json_build_object(
              'markId', m.mark_id,
              'enrollmentId', m.enrollment_id,
              'subjectId', m.subject_id,
              'teacherId', m.teacher_id,
              'markObtained', m.mark_obtained,
              'submittedAt', m.submitted_at,
              'subject', json_build_object(
                'subjectId', sub.subject_id,
                'name', sub.name,
                'code', sub.code
              )
            )
          ) FILTER (WHERE m.mark_id IS NOT NULL),
          '[]'
        ) as marks
      FROM student_enrollments se
      JOIN classes c ON se.class_id = c.class_id
      JOIN terms t ON c.term_id = t.term_id
      LEFT JOIN teachers ht ON c.homeroom_teacher_id = ht.teacher_id
      LEFT JOIN marks m ON se.enrollment_id = m.enrollment_id
      LEFT JOIN subjects sub ON m.subject_id = sub.subject_id
      WHERE se.student_id = $1
      GROUP BY se.enrollment_id, se.student_id, se.class_id, se.enrolled_at,
               c.class_id, c.class_name, c.grade, c.term_id, c.homeroom_teacher_id,
               c.results_published, c.created_at, c.updated_at,
               t.term_id, t.academic_year, t.semester,
               ht.teacher_id, ht.full_name
      ORDER BY t.academic_year DESC, t.semester DESC
    `,
      [parsedStudentId],
    );

    const enrollments = enrollmentsResult.rows.map((row) => ({
      enrollmentId: row.enrollment_id,
      studentId: row.student_id,
      classId: row.class_id,
      enrolledAt: row.enrolled_at,
      class: row.class,
      marks: row.marks,
    }));

    return {
      student,
      enrollments,
    };
  },

  /**
   * Promote students from current class to next class
   * Validates that students can be promoted and preserves academic history
   */
  promoteStudents: async ({ currentClassId, nextClassId, nextTermId }) => {
    const parsedCurrentClassId = parseInt(currentClassId);
    const parsedNextClassId = parseInt(nextClassId);
    const parsedNextTermId = parseInt(nextTermId);

    // Verify current class exists
    const currentClassResult = await pool.query(
      `
      SELECT c.class_id, c.class_name, c.grade, c.term_id, c.results_published,
             t.term_id, t.academic_year, t.semester
      FROM classes c
      JOIN terms t ON c.term_id = t.term_id
      WHERE c.class_id = $1
    `,
      [parsedCurrentClassId],
    );

    if (currentClassResult.rows.length === 0) {
      throw new ApiError(404, "Current class not found");
    }

    const currentClass = {
      classId: currentClassResult.rows[0].class_id,
      className: currentClassResult.rows[0].class_name,
      grade: currentClassResult.rows[0].grade,
      termId: currentClassResult.rows[0].term_id,
      resultsPublished: currentClassResult.rows[0].results_published,
      term: {
        termId: currentClassResult.rows[0].term_id,
        academicYear: currentClassResult.rows[0].academic_year,
        semester: currentClassResult.rows[0].semester,
      },
    };

    // Verify next class exists
    const nextClassResult = await pool.query(
      `
      SELECT c.class_id, c.class_name, c.grade, c.term_id,
             t.term_id, t.academic_year, t.semester
      FROM classes c
      JOIN terms t ON c.term_id = t.term_id
      WHERE c.class_id = $1
    `,
      [parsedNextClassId],
    );

    if (nextClassResult.rows.length === 0) {
      throw new ApiError(404, "Next class not found");
    }

    const nextClass = {
      classId: nextClassResult.rows[0].class_id,
      className: nextClassResult.rows[0].class_name,
      grade: nextClassResult.rows[0].grade,
      termId: nextClassResult.rows[0].term_id,
      term: {
        termId: nextClassResult.rows[0].term_id,
        academicYear: nextClassResult.rows[0].academic_year,
        semester: nextClassResult.rows[0].semester,
      },
    };

    // Verify next term exists
    const nextTermResult = await pool.query(
      "SELECT term_id, academic_year, semester FROM terms WHERE term_id = $1",
      [parsedNextTermId],
    );

    if (nextTermResult.rows.length === 0) {
      throw new ApiError(404, "Next term not found");
    }

    const nextTerm = {
      termId: nextTermResult.rows[0].term_id,
      academicYear: nextTermResult.rows[0].academic_year,
      semester: nextTermResult.rows[0].semester,
    };

    // Verify next class belongs to next term
    if (nextClass.termId !== parsedNextTermId) {
      throw new ApiError(
        400,
        "Next class does not belong to the specified term",
      );
    }

    if (!currentClass.resultsPublished) {
      throw new ApiError(
        400,
        `Cannot promote from ${currentClass.className} until results are published for Term ${currentClass.term.semester}`,
      );
    }

    const currentSemester = String(currentClass.term.semester).toUpperCase();
    const nextSemester = String(nextTerm.semester).toUpperCase();
    const currentGrade = parseInt(currentClass.grade, 10);
    const nextGrade = parseInt(nextClass.grade, 10);
    const currentSection = extractSection(
      currentClass.grade,
      currentClass.className,
    );
    const nextSection = extractSection(nextClass.grade, nextClass.className);

    if (currentSemester === "I") {
      if (
        nextSemester !== "II" ||
        nextTerm.academicYear !== currentClass.term.academicYear
      ) {
        throw new ApiError(
          400,
          `Invalid promotion path. ${currentClass.className} Term I can only move to Term II of academic year ${currentClass.term.academicYear}.`,
        );
      }

      if (nextGrade !== currentGrade) {
        throw new ApiError(
          400,
          `Invalid grade jump. Term I promotion must stay in Grade ${currentClass.grade}.`,
        );
      }

      if (currentSection && nextSection && currentSection !== nextSection) {
        throw new ApiError(
          400,
          `Invalid section jump. Term I promotion must keep the same section (${currentSection}).`,
        );
      }
    } else if (currentSemester === "II") {
      if (currentGrade >= 12) {
        throw new ApiError(
          400,
          "Grade 12 Term II students cannot be promoted to another class. They complete the program.",
        );
      }

      const currentYearStart = parseAcademicYearStart(
        currentClass.term.academicYear,
      );
      const nextYearStart = parseAcademicYearStart(nextTerm.academicYear);

      if (nextSemester !== "I") {
        throw new ApiError(
          400,
          `Invalid term jump. ${currentClass.className} Term II can only move to Term I of the next academic year.`,
        );
      }

      if (
        Number.isFinite(currentYearStart) &&
        Number.isFinite(nextYearStart) &&
        nextYearStart !== currentYearStart + 1
      ) {
        throw new ApiError(
          400,
          `Invalid academic year jump. Term II promotion must move to the next academic year after ${currentClass.term.academicYear}.`,
        );
      }

      if (nextGrade !== currentGrade + 1) {
        throw new ApiError(
          400,
          `Invalid grade jump. ${currentClass.className} Term II must move to Grade ${currentGrade + 1}.`,
        );
      }

      if (currentSection && nextSection && currentSection !== nextSection) {
        throw new ApiError(
          400,
          `Invalid section jump. Term II promotion must keep the same section (${currentSection}).`,
        );
      }
    } else {
      throw new ApiError(
        400,
        `Invalid current term ${currentClass.term.semester}. Promotion supports only Term I or Term II classes.`,
      );
    }

    // Get all students in current class
    const currentEnrollmentsResult = await pool.query(
      `
      SELECT se.student_id, s.student_school_id, s.full_name
      FROM student_enrollments se
      JOIN students s ON se.student_id = s.student_id
      WHERE se.class_id = $1
    `,
      [parsedCurrentClassId],
    );

    if (currentEnrollmentsResult.rows.length === 0) {
      throw new ApiError(400, "No students found in current class");
    }

    const studentIds = currentEnrollmentsResult.rows.map(
      (row) => row.student_id,
    );

    // Check if any students are already enrolled in the next term
    const conflictingEnrollmentsResult = await pool.query(
      `
      SELECT se.student_id, s.full_name, c.class_name
      FROM student_enrollments se
      JOIN students s ON se.student_id = s.student_id
      JOIN classes c ON se.class_id = c.class_id
      WHERE se.student_id = ANY($1::int[]) AND c.term_id = $2
    `,
      [studentIds, parsedNextTermId],
    );

    if (conflictingEnrollmentsResult.rows.length > 0) {
      const conflictNames = conflictingEnrollmentsResult.rows
        .map((row) => `${row.full_name} (already in ${row.class_name})`)
        .join(", ");
      throw new ApiError(
        409,
        `Promotion blocked: ${conflictingEnrollmentsResult.rows.length} student(s) already enrolled in target term ${nextTerm.academicYear} Term ${nextTerm.semester}: ${conflictNames}`,
      );
    }

    // Use transaction to promote all students
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Promote all students (create new enrollments, preserve old ones)
      const promotedEnrollments = [];
      for (const row of currentEnrollmentsResult.rows) {
        const result = await client.query(
          `
          INSERT INTO student_enrollments (student_id, class_id, enrolled_at)
          VALUES ($1, $2, CURRENT_TIMESTAMP)
          RETURNING enrollment_id
        `,
          [row.student_id, parsedNextClassId],
        );

        promotedEnrollments.push({
          studentId: row.student_id,
          studentSchoolId: row.student_school_id,
          fullName: row.full_name,
        });
      }

      await client.query("COMMIT");

      return {
        currentClass: {
          classId: currentClass.classId,
          className: currentClass.className,
          term: currentClass.term,
        },
        nextClass: {
          classId: nextClass.classId,
          className: nextClass.className,
          term: nextClass.term,
        },
        promotedCount: promotedEnrollments.length,
        promotedStudents: promotedEnrollments,
      };
    } catch (error) {
      await client.query("ROLLBACK");
      handleDatabaseError(error);
    } finally {
      client.release();
    }
  },
};
