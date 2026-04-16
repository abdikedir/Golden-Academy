import pool from "../config/db.js";
import { ApiError } from "../utils/ApiError.js";

const MIN_COMPLETION_PERCENT_FOR_PUBLISH = 100;
const MAX_MISSING_STUDENTS_FOR_PUBLISH = 0;

const normalizeSection = (section) => {
  if (section === undefined || section === null) return null;
  return String(section).trim().toUpperCase();
};

const buildClassName = (grade, section) => {
  if (!grade || !section) return null;
  return `${String(grade).trim()}${normalizeSection(section)}`;
};

const getRequiredSubjectsForClass = async (parsedClassId) => {
  const mappedSubjectsResult = await pool.query(
    `
      SELECT DISTINCT cs.subject_id
      FROM class_subjects cs
      WHERE cs.class_id = $1
      ORDER BY cs.subject_id ASC
    `,
    [parsedClassId],
  );

  if (mappedSubjectsResult.rows.length > 0) {
    return {
      subjectIds: mappedSubjectsResult.rows.map((row) =>
        parseInt(row.subject_id, 10),
      ),
      source: "CLASS_SUBJECTS",
    };
  }

  const fallbackSubjectsResult = await pool.query(
    `
      SELECT DISTINCT m.subject_id
      FROM marks m
      JOIN student_enrollments se ON m.enrollment_id = se.enrollment_id
      WHERE se.class_id = $1
      ORDER BY m.subject_id ASC
    `,
    [parsedClassId],
  );

  return {
    subjectIds: fallbackSubjectsResult.rows.map((row) =>
      parseInt(row.subject_id, 10),
    ),
    source:
      fallbackSubjectsResult.rows.length > 0
        ? "CLASS_MARKS"
        : "NONE",
  };
};

const getClassMarkSummary = async (parsedClassId) => {
  const classResult = await pool.query(
    `
      SELECT
        c.class_id,
        c.results_published,
        COUNT(DISTINCT cs.subject_id) AS total_subjects,
        COUNT(DISTINCT se.enrollment_id) AS total_students
      FROM classes c
      LEFT JOIN class_subjects cs ON c.class_id = cs.class_id
      LEFT JOIN student_enrollments se ON c.class_id = se.class_id
      WHERE c.class_id = $1
      GROUP BY c.class_id, c.results_published
    `,
    [parsedClassId],
  );

  if (classResult.rows.length === 0) {
    throw new ApiError(404, "Class not found");
  }

  const classData = classResult.rows[0];
  const totalStudents = parseInt(classData.total_students, 10);
  const requiredSubjects = await getRequiredSubjectsForClass(parsedClassId);
  const subjectIds = requiredSubjects.subjectIds;
  const totalSubjects = subjectIds.length;

  if (totalSubjects === 0) {
    return {
      resultsPublished: classData.results_published,
      totalSubjects,
      totalStudents,
      expectedMarks: 0,
      actualMarks: 0,
      missingMarks: 0,
      completeStudents: 0,
      pendingStudents: totalStudents,
      completionPercent: 0,
      subjectSource: requiredSubjects.source,
    };
  }

  const matrixResult = await pool.query(
    `
      WITH required_subjects AS (
        SELECT UNNEST($2::int[]) AS subject_id
      )
      SELECT
        COUNT(*)::int AS expected_marks,
        COUNT(m.mark_id)::int AS actual_marks,
        COUNT(*) FILTER (WHERE m.mark_id IS NULL)::int AS missing_marks,
        COUNT(DISTINCT se.enrollment_id) FILTER (WHERE m.mark_id IS NULL)::int AS pending_students
      FROM student_enrollments se
      CROSS JOIN required_subjects rs
      LEFT JOIN marks m
        ON m.enrollment_id = se.enrollment_id
       AND m.subject_id = rs.subject_id
      WHERE se.class_id = $1
    `,
    [parsedClassId, subjectIds],
  );

  const matrix = matrixResult.rows[0] || {
    expected_marks: 0,
    actual_marks: 0,
    missing_marks: 0,
    pending_students: 0,
  };

  const expectedMarks = parseInt(matrix.expected_marks, 10) || 0;
  const actualMarks = parseInt(matrix.actual_marks, 10) || 0;
  const missingMarks = parseInt(matrix.missing_marks, 10) || 0;
  const pendingStudents = parseInt(matrix.pending_students, 10) || 0;
  const completeStudents = Math.max(totalStudents - pendingStudents, 0);
  const completionPercent =
    totalStudents > 0 ? Math.round((completeStudents / totalStudents) * 100) : 0;

  return {
    resultsPublished: classData.results_published,
    totalSubjects,
    totalStudents,
    expectedMarks,
    actualMarks,
    missingMarks,
    completeStudents,
    pendingStudents,
    completionPercent,
    subjectSource: requiredSubjects.source,
  };
};

export const classesService = {
  // Get all classes
  getAll: async () => {
    const result = await pool.query(`
      SELECT 
        c.class_id, c.class_name, c.grade, c.term_id, c.homeroom_teacher_id, 
        c.results_published, c.created_at, c.updated_at,
        json_build_object(
          'termId', t.term_id,
          'academicYear', t.academic_year,
          'semester', t.semester
        ) as term,
        CASE 
          WHEN c.homeroom_teacher_id IS NOT NULL THEN
            json_build_object(
              'teacherId', ht.teacher_id,
              'fullName', ht.full_name
            )
          ELSE NULL
        END as "homeroomTeacher"
      FROM classes c
      JOIN terms t ON c.term_id = t.term_id
      LEFT JOIN teachers ht ON c.homeroom_teacher_id = ht.teacher_id
      ORDER BY c.class_name ASC
    `);

    return result.rows.map((row) => ({
      classId: row.class_id,
      className: row.class_name,
      grade: row.grade,
      termId: row.term_id,
      homeroomTeacherId: row.homeroom_teacher_id,
      resultsPublished: row.results_published,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      term: row.term,
      homeroomTeacher: row.homeroomTeacher,
    }));
  },

  // Get class by ID
  getById: async (classId) => {
    const result = await pool.query(
      `
      SELECT 
        c.class_id, c.class_name, c.grade, c.term_id, c.homeroom_teacher_id, 
        c.results_published, c.created_at, c.updated_at,
        json_build_object(
          'termId', t.term_id,
          'academicYear', t.academic_year,
          'semester', t.semester
        ) as term,
        CASE 
          WHEN c.homeroom_teacher_id IS NOT NULL THEN
            json_build_object(
              'teacherId', ht.teacher_id,
              'fullName', ht.full_name
            )
          ELSE NULL
        END as "homeroomTeacher",
        COALESCE(
          json_agg(
            json_build_object(
              'classSubjectId', cs.class_subject_id,
              'subject', json_build_object(
                'subjectId', s.subject_id,
                'name', s.name,
                'code', s.code,
                'totalMark', s.total_mark
              )
            )
          ) FILTER (WHERE cs.class_subject_id IS NOT NULL),
          '[]'
        ) as "classSubjects"
      FROM classes c
      JOIN terms t ON c.term_id = t.term_id
      LEFT JOIN teachers ht ON c.homeroom_teacher_id = ht.teacher_id
      LEFT JOIN class_subjects cs ON c.class_id = cs.class_id
      LEFT JOIN subjects s ON cs.subject_id = s.subject_id
      WHERE c.class_id = $1
      GROUP BY c.class_id, c.class_name, c.grade, c.term_id, c.homeroom_teacher_id,
               c.results_published, c.created_at, c.updated_at,
               t.term_id, t.academic_year, t.semester,
               ht.teacher_id, ht.full_name
    `,
      [parseInt(classId)],
    );

    if (result.rows.length === 0) {
      throw new ApiError(404, "Class not found");
    }

    const row = result.rows[0];
    return {
      classId: row.class_id,
      className: row.class_name,
      grade: row.grade,
      termId: row.term_id,
      homeroomTeacherId: row.homeroom_teacher_id,
      resultsPublished: row.results_published,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      term: row.term,
      homeroomTeacher: row.homeroomTeacher,
      classSubjects: row.classSubjects,
    };
  },

  // Get subject mappings for a class
  getSubjects: async (classId) => {
    const parsedClassId = parseInt(classId, 10);

    const classResult = await pool.query(
      "SELECT class_id FROM classes WHERE class_id = $1",
      [parsedClassId],
    );

    if (classResult.rows.length === 0) {
      throw new ApiError(404, "Class not found");
    }

    const result = await pool.query(
      `
      SELECT
        cs.class_subject_id,
        cs.class_id,
        cs.subject_id,
        s.name AS subject_name,
        s.code AS subject_code,
        s.total_mark,
        s.department_id
      FROM class_subjects cs
      JOIN subjects s ON cs.subject_id = s.subject_id
      WHERE cs.class_id = $1
      ORDER BY s.name ASC
    `,
      [parsedClassId],
    );

    return result.rows.map((row) => ({
      classSubjectId: row.class_subject_id,
      classId: row.class_id,
      subjectId: row.subject_id,
      subject: {
        subjectId: row.subject_id,
        name: row.subject_name,
        code: row.subject_code,
        totalMark: row.total_mark,
        departmentId: row.department_id,
      },
    }));
  },

  // Map a subject to a class
  addSubject: async (classId, subjectId, requestingUser) => {
    const parsedClassId = parseInt(classId, 10);
    const parsedSubjectId = parseInt(subjectId, 10);

    const classResult = await pool.query(
      "SELECT class_id FROM classes WHERE class_id = $1",
      [parsedClassId],
    );
    if (classResult.rows.length === 0) {
      throw new ApiError(404, "Class not found");
    }

    const subjectResult = await pool.query(
      `
      SELECT subject_id, name, code, total_mark, department_id
      FROM subjects
      WHERE subject_id = $1
    `,
      [parsedSubjectId],
    );
    if (subjectResult.rows.length === 0) {
      throw new ApiError(404, "Subject not found");
    }

    const subject = subjectResult.rows[0];

    if (requestingUser?.roles?.includes("DEPARTMENT_ADMIN")) {
      if (!requestingUser.departmentId) {
        throw new ApiError(
          403,
          "Department admin must be associated with a department",
        );
      }

      if (
        parseInt(subject.department_id, 10) !==
        parseInt(requestingUser.departmentId, 10)
      ) {
        throw new ApiError(
          403,
          "Cannot assign subject from another department",
        );
      }
    }

    const insertResult = await pool.query(
      `
      INSERT INTO class_subjects (class_id, subject_id)
      VALUES ($1, $2)
      ON CONFLICT (class_id, subject_id)
      DO UPDATE SET class_id = EXCLUDED.class_id
      RETURNING class_subject_id
    `,
      [parsedClassId, parsedSubjectId],
    );

    return {
      classSubjectId: insertResult.rows[0].class_subject_id,
      classId: parsedClassId,
      subjectId: parsedSubjectId,
      subject: {
        subjectId: subject.subject_id,
        name: subject.name,
        code: subject.code,
        totalMark: subject.total_mark,
        departmentId: subject.department_id,
      },
    };
  },

  // Remove a subject mapping from a class
  removeSubject: async (classId, subjectId) => {
    const result = await pool.query(
      `
      DELETE FROM class_subjects
      WHERE class_id = $1 AND subject_id = $2
      RETURNING class_subject_id
    `,
      [parseInt(classId, 10), parseInt(subjectId, 10)],
    );

    if (result.rows.length === 0) {
      throw new ApiError(404, "Class-subject mapping not found");
    }

    return { success: true };
  },

  // Create new class
  create: async (data) => {
    const grade = String(data.grade).trim();
    const section = normalizeSection(data.section);
    const className = buildClassName(grade, section);

    if (!className) {
      throw new ApiError(400, "Grade and section are required");
    }

    const result = await pool.query(
      `
      INSERT INTO classes (class_name, grade, term_id, homeroom_teacher_id, results_published)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING class_id
    `,
      [
        className,
        grade,
        parseInt(data.term_id),
        data.homeroom_teacher_id ? parseInt(data.homeroom_teacher_id) : null,
        data.results_published || false,
      ],
    );

    return await classesService.getById(result.rows[0].class_id);
  },

  // Update class
  update: async (classId, data) => {
    const currentClass = await classesService.getById(classId);
    const currentGrade = String(currentClass.grade || "").trim();
    const currentClassName = String(currentClass.className || "").trim();
    const currentSection = normalizeSection(
      currentClassName.startsWith(currentGrade)
        ? currentClassName.slice(currentGrade.length)
        : "",
    );

    const effectiveGrade =
      data.grade !== undefined ? String(data.grade).trim() : currentGrade;
    const effectiveSection =
      data.section !== undefined
        ? normalizeSection(data.section)
        : currentSection;
    const effectiveClassName =
      data.grade !== undefined || data.section !== undefined
        ? buildClassName(effectiveGrade, effectiveSection)
        : undefined;

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (effectiveClassName !== undefined && effectiveClassName !== null) {
      updates.push(`class_name = $${paramCount++}`);
      values.push(effectiveClassName);
    } else if (data.class_name !== undefined) {
      updates.push(`class_name = $${paramCount++}`);
      values.push(data.class_name);
    }
    if (data.grade !== undefined) {
      updates.push(`grade = $${paramCount++}`);
      values.push(effectiveGrade);
    }
    if (data.term_id !== undefined) {
      updates.push(`term_id = $${paramCount++}`);
      values.push(parseInt(data.term_id));
    }
    if (data.homeroom_teacher_id !== undefined) {
      updates.push(`homeroom_teacher_id = $${paramCount++}`);
      values.push(
        data.homeroom_teacher_id ? parseInt(data.homeroom_teacher_id) : null,
      );
    }
    if (data.results_published !== undefined) {
      updates.push(`results_published = $${paramCount++}`);
      values.push(data.results_published);
    }

    if (updates.length === 0) {
      throw new ApiError(400, "No fields to update");
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(parseInt(classId));

    const result = await pool.query(
      `UPDATE classes SET ${updates.join(", ")} WHERE class_id = $${paramCount} RETURNING class_id`,
      values,
    );

    if (result.rows.length === 0) {
      throw new ApiError(404, "Class not found");
    }

    return await classesService.getById(classId);
  },

  // Delete class
  delete: async (classId) => {
    const result = await pool.query(
      "DELETE FROM classes WHERE class_id = $1 RETURNING class_id",
      [parseInt(classId)],
    );

    if (result.rows.length === 0) {
      throw new ApiError(404, "Class not found");
    }

    return { success: true };
  },

  // Publish results with mark completion check
  publishResults: async (classId) => {
    const parsedClassId = parseInt(classId, 10);
    const classData = await getClassMarkSummary(parsedClassId);

    // Check if results are already published
    if (classData.resultsPublished) {
      throw new ApiError(400, "Results are already published for this class");
    }

    if (classData.totalSubjects === 0) {
      throw new ApiError(
        400,
        "Cannot publish results: No subjects are configured for this class and no marks exist to infer subjects.",
      );
    }

    if (classData.totalStudents === 0) {
      throw new ApiError(
        400,
        "Cannot publish results: No students are enrolled in this class",
      );
    }

    if (classData.missingMarks > 0) {
      throw new ApiError(
        400,
        `Cannot publish results: ${classData.missingMarks} mark slot(s) are missing across ${classData.pendingStudents} student(s). All students must have marks for all class subjects.`,
      );
    }

    // Publish results
    await pool.query(
      "UPDATE classes SET results_published = TRUE, updated_at = CURRENT_TIMESTAMP WHERE class_id = $1",
      [parsedClassId],
    );

    return {
      ...(await classesService.getById(classId)),
      publishSummary: {
        totalStudents: classData.totalStudents,
        completeStudents: classData.completeStudents,
        pendingStudents: classData.pendingStudents,
        completionPercent: classData.completionPercent,
        expectedMarks: classData.expectedMarks,
        actualMarks: classData.actualMarks,
        missingMarks: classData.missingMarks,
      },
    };
  },

  // Check if all marks are complete for a class
  checkMarksComplete: async (classId) => {
    const parsedClassId = parseInt(classId, 10);
    const classData = await getClassMarkSummary(parsedClassId);

    const complete =
      classData.totalSubjects > 0 &&
      classData.totalStudents > 0 &&
      classData.missingMarks === 0;

    return {
      complete,
      publishable: complete,
      expectedMarks: classData.expectedMarks,
      actualMarks: classData.actualMarks,
      missingMarks: classData.missingMarks,
      totalSubjects: classData.totalSubjects,
      totalStudents: classData.totalStudents,
      completeStudents: classData.completeStudents,
      pendingStudents: classData.pendingStudents,
      completionPercent: classData.completionPercent,
      minCompletionPercentForPublish: MIN_COMPLETION_PERCENT_FOR_PUBLISH,
      maxMissingStudentsForPublish: MAX_MISSING_STUDENTS_FOR_PUBLISH,
    };
  },
};
