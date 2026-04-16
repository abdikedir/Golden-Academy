-- ============================
-- ACADEMIC MANAGEMENT SYSTEM SCHEMA
-- PostgreSQL 14+ Compatible
-- ============================

-- ============================
-- TABLES
-- ============================

CREATE TABLE roles (
  role_id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL
);

INSERT INTO roles(name) VALUES
('SYSTEM_ADMIN'),
('DEPARTMENT_ADMIN'),
('REGISTRAR'),
('TEACHER');

CREATE TABLE users (
  user_id SERIAL PRIMARY KEY,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_roles (
  user_id INT REFERENCES users(user_id) ON DELETE CASCADE,
  role_id INT REFERENCES roles(role_id) ON DELETE CASCADE,
  PRIMARY KEY(user_id, role_id)
);

CREATE TABLE departments (
  department_id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  code VARCHAR(20) UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE teachers (
  teacher_id SERIAL PRIMARY KEY,
  user_id INT UNIQUE REFERENCES users(user_id),
  department_id INT REFERENCES departments(department_id),
  full_name VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE subjects (
  subject_id SERIAL PRIMARY KEY,
  department_id INT REFERENCES departments(department_id),
  name VARCHAR(100) NOT NULL,
  code VARCHAR(20) UNIQUE NOT NULL,
  total_mark INT DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE terms (
  term_id SERIAL PRIMARY KEY,
  academic_year VARCHAR(10) NOT NULL,
  semester VARCHAR(2) CHECK (semester IN ('I','II')),
  UNIQUE(academic_year, semester)
);

CREATE TABLE classes (
  class_id SERIAL PRIMARY KEY,
  class_name VARCHAR(20) NOT NULL,
  grade VARCHAR(2) NOT NULL,
  term_id INT REFERENCES terms(term_id),
  homeroom_teacher_id INT REFERENCES teachers(teacher_id),
  results_published BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(class_name, term_id)
);

CREATE TABLE class_subjects (
  class_subject_id SERIAL PRIMARY KEY,
  class_id INT REFERENCES classes(class_id) ON DELETE CASCADE,
  subject_id INT REFERENCES subjects(subject_id) ON DELETE RESTRICT,
  UNIQUE(class_id, subject_id)
);

CREATE TABLE teacher_class_subject (
  teacher_class_subject_id SERIAL PRIMARY KEY,
  teacher_id INT REFERENCES teachers(teacher_id),
  class_subject_id INT REFERENCES class_subjects(class_subject_id),
  UNIQUE(teacher_id, class_subject_id)
);

CREATE TABLE students (
  student_id SERIAL PRIMARY KEY,
  student_school_id VARCHAR(20) UNIQUE NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  gender CHAR(1) CHECK (gender IN ('M','F')),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE student_enrollments (
  enrollment_id SERIAL PRIMARY KEY,
  student_id INT REFERENCES students(student_id) ON DELETE CASCADE,
  class_id INT REFERENCES classes(class_id),
  enrolled_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(student_id, class_id)
);

CREATE TABLE marks (
  mark_id SERIAL PRIMARY KEY,
  enrollment_id INT REFERENCES student_enrollments(enrollment_id) ON DELETE CASCADE,
  subject_id INT REFERENCES subjects(subject_id),
  teacher_id INT REFERENCES teachers(teacher_id),
  mark_obtained INT NOT NULL CHECK (mark_obtained BETWEEN 0 AND 100),
  submitted_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(enrollment_id, subject_id)
);

-- ============================
-- INDEXES
-- ============================

CREATE INDEX idx_marks_enrollment
ON marks(enrollment_id);

CREATE INDEX idx_marks_subject
ON marks(subject_id);

CREATE INDEX idx_enrollment_class
ON student_enrollments(class_id);

CREATE INDEX idx_enrollment_student
ON student_enrollments(student_id);

CREATE INDEX idx_marks_enrollment_subject
ON marks(enrollment_id, subject_id);

-- ============================
-- FUNCTIONS & PROCEDURES
-- ============================

-- 1.1 Submit Student Mark
CREATE OR REPLACE FUNCTION submit_student_mark(
    input_teacher_id INT,
    input_enrollment_id INT,
    input_subject_id INT,
    input_mark INT
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    class_identifier INT;
    subject_total INT;
    published BOOLEAN;
BEGIN
    -- 1. Validate Enrollment
    SELECT class_id INTO class_identifier
    FROM student_enrollments
    WHERE enrollment_id = input_enrollment_id;

    SELECT results_published
    INTO published
    FROM classes
    WHERE class_id = class_identifier;

    IF published THEN
        RAISE EXCEPTION 'Results already published. Marks cannot be modified.';
    END IF;

    IF class_identifier IS NULL THEN
        RAISE EXCEPTION 'Invalid enrollment';
    END IF;

    -- 2. Validate Mark Range
    SELECT total_mark INTO subject_total
    FROM subjects
    WHERE subject_id = input_subject_id;

    IF input_mark < 0 OR input_mark > subject_total THEN
        RAISE EXCEPTION 'Invalid mark value';
    END IF;

    -- 3. Verify Teacher Authorization
    IF NOT EXISTS (
        SELECT 1
        FROM teacher_class_subject tcs
        JOIN class_subjects cs ON tcs.class_subject_id = cs.class_subject_id
        WHERE tcs.teacher_id = input_teacher_id
          AND cs.class_id = class_identifier
          AND cs.subject_id = input_subject_id
    ) THEN
        RAISE EXCEPTION 'Teacher not authorized for this subject';
    END IF;

    -- 4. Insert or Update
    INSERT INTO marks(enrollment_id, subject_id, teacher_id, mark_obtained)
    VALUES (input_enrollment_id, input_subject_id, input_teacher_id, input_mark)
    ON CONFLICT (enrollment_id, subject_id)
    DO UPDATE SET mark_obtained = EXCLUDED.mark_obtained;
END;
$$;

-- 1.2 Check Class Marks Completion
-- Note: Added DISTINCT to prevent Cartesian product multiplication bug in original join
CREATE OR REPLACE FUNCTION check_class_marks_complete(
    input_class_id INT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    expected_marks INT;
    submitted_marks INT;
BEGIN
    SELECT COUNT(DISTINCT se.enrollment_id) * COUNT(DISTINCT cs.subject_id)
    INTO expected_marks
    FROM student_enrollments se
    JOIN class_subjects cs ON cs.class_id = se.class_id
    WHERE se.class_id = input_class_id;

    SELECT COUNT(*)
    INTO submitted_marks
    FROM marks m
    JOIN student_enrollments se ON se.enrollment_id = m.enrollment_id
    WHERE se.class_id = input_class_id;

    RETURN submitted_marks >= expected_marks;
END;
$$;

-- 1.3 Promote Students
CREATE OR REPLACE FUNCTION promote_students(
    input_current_class INT,
    input_next_class INT,
    input_next_term INT
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO student_enrollments(student_id, class_id)
    SELECT student_id, input_next_class
    FROM student_enrollments
    WHERE class_id = input_current_class
    ON CONFLICT (student_id, class_id) DO NOTHING;
END;
$$;

-- 1.4 Publish Class Results
CREATE OR REPLACE FUNCTION publish_class_results(
    input_class_id INT
    -- input_term_id INT
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    IF NOT check_class_marks_complete(input_class_id) THEN
        RAISE EXCEPTION 'Marks incomplete';
    END IF;

    UPDATE classes
    SET
        results_published = TRUE,
        updated_at = CURRENT_TIMESTAMP
    WHERE class_id = input_class_id;
END;
$$;

-- ============================
-- VIEWS
-- ============================

-- 2.1 Student Subject Marks
CREATE VIEW student_subject_marks AS
SELECT
    s.student_id,
    s.student_school_id,
    s.full_name,
    sub.subject_id,
    sub.name AS subject_name,
    m.mark_obtained,
    c.class_id,
    t.academic_year,
    t.semester
FROM marks m
JOIN student_enrollments se ON se.enrollment_id = m.enrollment_id
JOIN students s ON s.student_id = se.student_id
JOIN subjects sub ON sub.subject_id = m.subject_id
JOIN classes c ON c.class_id = se.class_id
JOIN terms t ON t.term_id = c.term_id;

-- 2.2 Student Totals and Average
CREATE VIEW student_average AS
SELECT
    se.enrollment_id,
    se.class_id,
    c.term_id,
    SUM(m.mark_obtained) AS total_marks,
    AVG(m.mark_obtained) AS average_score,
    COUNT(m.subject_id) AS subject_count
FROM marks m
JOIN student_enrollments se ON se.enrollment_id = m.enrollment_id
JOIN classes c ON c.class_id = se.class_id
GROUP BY se.enrollment_id, se.class_id, c.term_id;

-- 2.3 Class Subject Count
CREATE VIEW class_subject_count AS
SELECT
    class_id,
    COUNT(subject_id) AS total_subjects
FROM class_subjects
GROUP BY class_id;

-- 2.4 Final Academic Report (Ranking)
CREATE VIEW student_academic_report AS
SELECT
    ranked.*,
    CASE
        WHEN ranked.subject_count < ranked.total_subjects THEN 'INCOMPLETE'
        WHEN ranked.average_score >= 50 THEN 'PASS'
        ELSE 'FAIL'
    END AS status
FROM (
    SELECT
        s.student_id,
        s.student_school_id,
        s.full_name,
        c.class_name,
        c.grade,
        t.academic_year,
        t.semester,
        sa.total_marks,
        sa.average_score,
        sa.subject_count,
        csc.total_subjects,
        CASE
            WHEN sa.subject_count = csc.total_subjects
            THEN RANK() OVER (
                PARTITION BY c.class_id, t.term_id
                ORDER BY sa.total_marks DESC NULLS LAST
            )
        ELSE NULL
END AS rank
    FROM student_average sa
    JOIN student_enrollments se ON se.enrollment_id = sa.enrollment_id
    JOIN students s ON s.student_id = se.student_id
    JOIN classes c ON c.class_id = se.class_id
    JOIN terms t ON t.term_id = sa.term_id
    JOIN class_subject_count csc ON csc.class_id = c.class_id
) ranked;