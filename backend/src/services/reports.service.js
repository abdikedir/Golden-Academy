import pool from "../config/db.js";
import { ApiError } from "../utils/ApiError.js";

export const reportsService = {
  /**
   * Get academic report rows with optional filters.
   * Supports class, academic year, and semester filters.
   */
  getAcademicReport: async (filters = {}, requestingUser = null) => {
    const { classId, academicYear, semester } = filters;

    const conditions = [];
    const params = [];
    let paramCount = 1;

    if (classId) {
      const parsedClassId = parseInt(classId);
      if (Number.isNaN(parsedClassId) || parsedClassId < 1) {
        throw new ApiError(400, "Valid class ID is required");
      }
      conditions.push(`c.class_id = $${paramCount++}`);
      params.push(parsedClassId);
    }

    if (academicYear) {
      conditions.push(`t.academic_year = $${paramCount++}`);
      params.push(academicYear);
    }

    if (semester) {
      conditions.push(`t.semester = $${paramCount++}`);
      params.push(semester);
    }

    const isTeacherOnlyRequest =
      requestingUser?.roles?.includes("TEACHER") &&
      !requestingUser?.roles?.includes("SYSTEM_ADMIN") &&
      !requestingUser?.roles?.includes("DEPARTMENT_ADMIN") &&
      !requestingUser?.roles?.includes("REGISTRAR");

    if (isTeacherOnlyRequest) {
      const teacherId = requestingUser?.teacher?.teacherId;
      if (!teacherId) {
        throw new ApiError(403, "Teacher profile required for report access");
      }

      conditions.push(
        `(
          c.homeroom_teacher_id = $${paramCount}
          OR EXISTS (
            SELECT 1
            FROM class_subjects csf
            JOIN teacher_class_subject tcsf ON tcsf.class_subject_id = csf.class_subject_id
            WHERE csf.class_id = c.class_id
              AND tcsf.teacher_id = $${paramCount}
          )
        )`,
      );
      params.push(parseInt(teacherId, 10));
      paramCount += 1;
    }

    const whereClause = conditions.length
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

    const result = await pool.query(
      `
      WITH required_subjects AS (
        SELECT DISTINCT cs.class_id, cs.subject_id
        FROM class_subjects cs
        UNION
        SELECT DISTINCT se.class_id, m.subject_id
        FROM student_enrollments se
        JOIN marks m ON m.enrollment_id = se.enrollment_id
        WHERE NOT EXISTS (
          SELECT 1
          FROM class_subjects csx
          WHERE csx.class_id = se.class_id
        )
      ),
      summary AS (
        SELECT
          se.enrollment_id,
          st.student_id,
          st.student_school_id,
          st.full_name,
          c.class_id,
          c.class_name,
          c.grade,
          t.academic_year,
          t.semester,
          COUNT(DISTINCT rs.subject_id)::int AS total_subjects,
          COUNT(DISTINCT m.subject_id)::int AS marks_count,
          COALESCE(SUM(m.mark_obtained), 0)::int AS total_marks,
          AVG(m.mark_obtained)::numeric AS average_score
        FROM student_enrollments se
        JOIN students st ON se.student_id = st.student_id
        JOIN classes c ON se.class_id = c.class_id
        JOIN terms t ON c.term_id = t.term_id
        LEFT JOIN required_subjects rs ON rs.class_id = c.class_id
        LEFT JOIN marks m
          ON m.enrollment_id = se.enrollment_id
         AND m.subject_id = rs.subject_id
        ${whereClause}
        GROUP BY
          se.enrollment_id,
          st.student_id,
          st.student_school_id,
          st.full_name,
          c.class_id,
          c.class_name,
          c.grade,
          t.academic_year,
          t.semester
      )
      SELECT
        enrollment_id,
        student_id,
        student_school_id,
        full_name,
        class_id,
        class_name,
        grade,
        academic_year,
        semester,
        total_marks,
        CASE
          WHEN average_score IS NULL THEN 0
          ELSE ROUND(average_score::numeric, 2)
        END AS average_score,
        CASE
          WHEN total_subjects = 0 OR marks_count < total_subjects THEN 'INCOMPLETE'
          WHEN average_score >= 50 THEN 'PASS'
          ELSE 'FAIL'
        END AS status,
        CASE
          WHEN total_subjects > 0 AND marks_count = total_subjects
          THEN RANK() OVER (
            PARTITION BY class_id, academic_year, semester
            ORDER BY average_score DESC NULLS LAST
          )
          ELSE NULL
        END AS rank
      FROM summary
      ORDER BY academic_year DESC, semester DESC, class_name ASC, full_name ASC
    `,
      params,
    );

    return result.rows.map((row) => ({
      enrollmentId: row.enrollment_id,
      studentId: row.student_id,
      studentSchoolId: row.student_school_id,
      fullName: row.full_name,
      classId: row.class_id,
      className: row.class_name,
      grade: row.grade,
      academicYear: row.academic_year,
      semester: row.semester,
      totalMarks: row.total_marks,
      averageScore: Number(row.average_score),
      rank: row.rank,
      status: row.status,
    }));
  },

  /**
   * Get class report with student rankings, averages, and mark completion.
   * Only accessible by homeroom teacher of the class (enforced in route).
   * Requirements: 5.1, 5.2, 5.3, 5.4, 12.1, 12.3, 12.4, 12.5
   */
  getClassReport: async (classId, requestingUser) => {
    // Fetch class data with term and homeroom teacher
    const classResult = await pool.query(
      `
      SELECT 
        c.class_id, c.class_name, c.grade, c.results_published,
        json_build_object(
          'termId', t.term_id,
          'academicYear', t.academic_year,
          'semester', t.semester
        ) as term,
        json_build_object(
          'teacherId', ht.teacher_id,
          'fullName', ht.full_name
        ) as homeroom_teacher
      FROM classes c
      LEFT JOIN terms t ON c.term_id = t.term_id
      LEFT JOIN teachers ht ON c.homeroom_teacher_id = ht.teacher_id
      WHERE c.class_id = $1
    `,
      [parseInt(classId)],
    );

    if (classResult.rows.length === 0) {
      throw new ApiError(404, "Class not found");
    }

    const classData = classResult.rows[0];

    // Fetch class subjects with teachers (primary source)
    const mappedSubjectsResult = await pool.query(
      `
      SELECT 
        cs.class_subject_id,
        s.subject_id, s.name as subject_name, s.code as subject_code,
        COALESCE(
          json_agg(
            json_build_object(
              'teacherId', t.teacher_id,
              'fullName', t.full_name
            )
          ) FILTER (WHERE t.teacher_id IS NOT NULL),
          '[]'
        ) as teachers
      FROM class_subjects cs
      JOIN subjects s ON cs.subject_id = s.subject_id
      LEFT JOIN teacher_class_subject tcs ON cs.class_subject_id = tcs.class_subject_id
      LEFT JOIN teachers t ON tcs.teacher_id = t.teacher_id
      WHERE cs.class_id = $1
      GROUP BY cs.class_subject_id, s.subject_id, s.name, s.code
      ORDER BY s.name
    `,
      [parseInt(classId)],
    );

    let classSubjects = mappedSubjectsResult.rows;

    // Fallback for legacy data where class_subject mappings are missing
    if (classSubjects.length === 0) {
      const inferredSubjectsResult = await pool.query(
        `
        SELECT
          m.subject_id,
          s.name AS subject_name,
          s.code AS subject_code,
          COALESCE(
            json_agg(
              DISTINCT jsonb_build_object(
                'teacherId', t.teacher_id,
                'fullName', t.full_name
              )
            ) FILTER (WHERE t.teacher_id IS NOT NULL),
            '[]'
          ) AS teachers
        FROM student_enrollments se
        JOIN marks m ON m.enrollment_id = se.enrollment_id
        JOIN subjects s ON m.subject_id = s.subject_id
        LEFT JOIN teachers t ON m.teacher_id = t.teacher_id
        WHERE se.class_id = $1
        GROUP BY m.subject_id, s.name, s.code
        ORDER BY s.name
      `,
        [parseInt(classId)],
      );

      classSubjects = inferredSubjectsResult.rows.map((row) => ({
        class_subject_id: null,
        subject_id: row.subject_id,
        subject_name: row.subject_name,
        subject_code: row.subject_code,
        teachers: row.teachers,
      }));
    }

    const totalSubjects = classSubjects.length;
    const subjectIds = classSubjects.map((subject) =>
      parseInt(subject.subject_id, 10),
    );

    // Fetch student enrollments with marks using window function for ranking
    const studentsResult = await pool.query(
      `
      SELECT 
        se.enrollment_id,
        json_build_object(
          'studentId', st.student_id,
          'studentSchoolId', st.student_school_id,
          'fullName', st.full_name,
          'gender', st.gender
        ) as student,
        COALESCE(
          json_agg(
            json_build_object(
              'subjectId', m.subject_id,
              'subjectName', subj.name,
              'markObtained', m.mark_obtained
            ) ORDER BY subj.name
          ) FILTER (WHERE m.mark_id IS NOT NULL),
          '[]'
        ) as marks,
        COUNT(DISTINCT m.subject_id) as marks_count,
        AVG(m.mark_obtained) as average,
        SUM(m.mark_obtained) as total_marks
      FROM student_enrollments se
      JOIN students st ON se.student_id = st.student_id
      LEFT JOIN marks m
        ON se.enrollment_id = m.enrollment_id
       AND m.subject_id = ANY($2::int[])
      LEFT JOIN subjects subj ON m.subject_id = subj.subject_id
      WHERE se.class_id = $1
      GROUP BY se.enrollment_id, st.student_id, st.student_school_id, st.full_name, st.gender
      ORDER BY st.full_name
    `,
      [parseInt(classId), subjectIds],
    );

    // Calculate rankings using only required subjects for the class
    const rankingResult =
      totalSubjects > 0
        ? await pool.query(
            `
      SELECT 
        se.enrollment_id,
        RANK() OVER (ORDER BY SUM(m.mark_obtained) DESC) as rank
      FROM student_enrollments se
      LEFT JOIN marks m
        ON se.enrollment_id = m.enrollment_id
       AND m.subject_id = ANY($2::int[])
      WHERE se.class_id = $1
      GROUP BY se.enrollment_id
      HAVING COUNT(DISTINCT m.subject_id) = $3
    `,
            [parseInt(classId), subjectIds, totalSubjects],
          )
        : { rows: [] };

    const rankMap = {};
    rankingResult.rows.forEach((row) => {
      rankMap[row.enrollment_id] = row.rank;
    });

    // Build student results
    const studentResults = studentsResult.rows.map((row) => {
      const marksCount = parseInt(row.marks_count);
      const isComplete = marksCount === totalSubjects && totalSubjects > 0;

      let average = null;
      let status = "INCOMPLETE";

      if (isComplete) {
        average = parseFloat(parseFloat(row.average).toFixed(2));
        status = average >= 50 ? "PASS" : "FAIL";
      }

      return {
        enrollmentId: row.enrollment_id,
        student: row.student,
        marks: row.marks,
        average,
        status,
        isComplete,
        rank: rankMap[row.enrollment_id] ?? null,
      };
    });

    // Calculate subject completion status using the effective subject list.
    const completionMap = {};
    if (totalSubjects > 0) {
      const subjectCompletionResult = await pool.query(
        `
          WITH required_subjects AS (
            SELECT UNNEST($2::int[]) AS subject_id
          )
          SELECT
            rs.subject_id,
            COUNT(DISTINCT se.enrollment_id) AS total_students,
            COUNT(DISTINCT m.enrollment_id) AS submitted_count
          FROM required_subjects rs
          CROSS JOIN student_enrollments se
          LEFT JOIN marks m
            ON se.enrollment_id = m.enrollment_id
           AND rs.subject_id = m.subject_id
          WHERE se.class_id = $1
          GROUP BY rs.subject_id
        `,
        [parseInt(classId), subjectIds],
      );

      subjectCompletionResult.rows.forEach((row) => {
        completionMap[row.subject_id] = {
          totalStudents: parseInt(row.total_students, 10),
          submittedCount: parseInt(row.submitted_count, 10),
        };
      });
    }

    const subjectCompletionStatus = classSubjects.map((cs) => {
      const completion = completionMap[cs.subject_id] || {
        totalStudents: 0,
        submittedCount: 0,
      };
      return {
        subjectId: cs.subject_id,
        subjectName: cs.subject_name,
        subjectCode: cs.subject_code,
        teachers: cs.teachers,
        submittedCount: completion.submittedCount,
        totalStudents: completion.totalStudents,
        isComplete: completion.submittedCount === completion.totalStudents,
      };
    });

    const allMarksComplete =
      totalSubjects > 0 &&
      studentResults.length > 0 &&
      subjectCompletionStatus.every((s) => s.isComplete);

    return {
      classId: classData.class_id,
      className: classData.class_name,
      grade: classData.grade,
      term: classData.term,
      homeroomTeacher: classData.homeroom_teacher,
      resultsPublished: classData.results_published,
      allMarksComplete,
      subjectCompletionStatus,
      students: studentResults.sort(
        (a, b) => (a.rank ?? Infinity) - (b.rank ?? Infinity),
      ),
    };
  },

  /**
   * Get department-level aggregated report data.
   * Requirements: 6.4, 9.4
   */
  getDepartmentReport: async (departmentId) => {
    // Fetch department with subjects and teachers
    const departmentResult = await pool.query(
      `
      SELECT 
        d.department_id, d.name, d.code
      FROM departments d
      WHERE d.department_id = $1
    `,
      [parseInt(departmentId)],
    );

    if (departmentResult.rows.length === 0) {
      throw new ApiError(404, "Department not found");
    }

    const department = departmentResult.rows[0];

    // Fetch subjects for this department
    const subjectsResult = await pool.query(
      `
      SELECT subject_id, name, code
      FROM subjects
      WHERE department_id = $1
      ORDER BY name
    `,
      [parseInt(departmentId)],
    );

    const subjects = subjectsResult.rows;

    // Fetch teachers count for this department
    const teachersResult = await pool.query(
      `
      SELECT COUNT(*) as teacher_count
      FROM teachers
      WHERE department_id = $1
    `,
      [parseInt(departmentId)],
    );

    const teacherCount = parseInt(teachersResult.rows[0].teacher_count);

    // Fetch marks aggregated by subject
    const marksResult = await pool.query(
      `
      SELECT 
        s.subject_id,
        s.name as subject_name,
        COUNT(m.mark_id) as total_marks_submitted,
        AVG(m.mark_obtained) as average_mark,
        SUM(CASE WHEN m.mark_obtained >= 50 THEN 1 ELSE 0 END) as pass_count,
        SUM(CASE WHEN m.mark_obtained < 50 THEN 1 ELSE 0 END) as fail_count
      FROM subjects s
      LEFT JOIN marks m ON s.subject_id = m.subject_id
      WHERE s.department_id = $1
      GROUP BY s.subject_id, s.name
      ORDER BY s.name
    `,
      [parseInt(departmentId)],
    );

    const subjectSummaries = marksResult.rows.map((row) => ({
      subjectId: row.subject_id,
      subjectName: row.subject_name,
      totalMarksSubmitted: parseInt(row.total_marks_submitted),
      averageMark: row.average_mark
        ? parseFloat(parseFloat(row.average_mark).toFixed(2))
        : null,
      passCount: parseInt(row.pass_count),
      failCount: parseInt(row.fail_count),
    }));

    return {
      departmentId: department.department_id,
      departmentName: department.name,
      departmentCode: department.code,
      totalSubjects: subjects.length,
      totalTeachers: teacherCount,
      subjectSummaries,
    };
  },

  /**
   * Check mark completion status for a class.
   * Requirements: 5.2, 12.5
   */
  getMarkCompletionStatus: async (classId) => {
    // Fetch class data
    const classResult = await pool.query(
      `
      SELECT class_id, class_name
      FROM classes
      WHERE class_id = $1
    `,
      [parseInt(classId)],
    );

    if (classResult.rows.length === 0) {
      throw new ApiError(404, "Class not found");
    }

    const classData = classResult.rows[0];

    // Fetch total students count
    const studentsResult = await pool.query(
      `
      SELECT COUNT(*) as total_students
      FROM student_enrollments
      WHERE class_id = $1
    `,
      [parseInt(classId)],
    );

    const totalStudents = parseInt(studentsResult.rows[0].total_students);

    // Fetch class subjects with teachers and mark completion status (primary source)
    const mappedSubjectsResult = await pool.query(
      `
      SELECT 
        cs.subject_id,
        s.name as subject_name,
        s.code as subject_code,
        COALESCE(
          json_agg(
            json_build_object(
              'teacherId', t.teacher_id,
              'fullName', t.full_name
            )
          ) FILTER (WHERE t.teacher_id IS NOT NULL),
          '[]'
        ) as teachers,
        COUNT(DISTINCT m.enrollment_id) as submitted_count
      FROM class_subjects cs
      JOIN subjects s ON cs.subject_id = s.subject_id
      LEFT JOIN teacher_class_subject tcs ON cs.class_subject_id = tcs.class_subject_id
      LEFT JOIN teachers t ON tcs.teacher_id = t.teacher_id
      LEFT JOIN marks m ON cs.subject_id = m.subject_id 
        AND m.enrollment_id IN (
          SELECT enrollment_id FROM student_enrollments WHERE class_id = $1
        )
      WHERE cs.class_id = $1
      GROUP BY cs.subject_id, s.name, s.code
      ORDER BY s.name
    `,
      [parseInt(classId)],
    );

    let sourceRows = mappedSubjectsResult.rows;

    // Fallback for legacy data where class_subject mappings are missing
    if (sourceRows.length === 0) {
      const inferredSubjectsResult = await pool.query(
        `
          SELECT
            m.subject_id,
            s.name AS subject_name,
            s.code AS subject_code,
            COALESCE(
              json_agg(
                DISTINCT jsonb_build_object(
                  'teacherId', t.teacher_id,
                  'fullName', t.full_name
                )
              ) FILTER (WHERE t.teacher_id IS NOT NULL),
              '[]'
            ) AS teachers,
            COUNT(DISTINCT m.enrollment_id) AS submitted_count
          FROM student_enrollments se
          JOIN marks m ON se.enrollment_id = m.enrollment_id
          JOIN subjects s ON m.subject_id = s.subject_id
          LEFT JOIN teachers t ON m.teacher_id = t.teacher_id
          WHERE se.class_id = $1
          GROUP BY m.subject_id, s.name, s.code
          ORDER BY s.name
        `,
        [parseInt(classId)],
      );

      sourceRows = inferredSubjectsResult.rows;
    }

    const subjectStatus = sourceRows.map((row) => {
      const submittedCount = parseInt(row.submitted_count);
      const isComplete = submittedCount === totalStudents;
      const pendingCount = totalStudents - submittedCount;

      return {
        subjectId: row.subject_id,
        subjectName: row.subject_name,
        subjectCode: row.subject_code,
        teachers: row.teachers,
        submittedCount,
        totalStudents,
        isComplete,
        pendingCount,
      };
    });

    const allComplete =
      totalStudents > 0 &&
      subjectStatus.length > 0 &&
      subjectStatus.every((s) => s.isComplete);
    const pendingSubjects = subjectStatus.filter((s) => !s.isComplete);

    return {
      classId: classData.class_id,
      totalStudents,
      totalSubjects: subjectStatus.length,
      allMarksComplete: allComplete,
      pendingSubjects,
      subjectStatus,
    };
  },
};
