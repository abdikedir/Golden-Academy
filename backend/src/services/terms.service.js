import pool from "../config/db.js";
import { ApiError } from "../utils/ApiError.js";
import { handleDatabaseError } from "../utils/dbErrorHandler.js";
import { createCrudService } from "./crudFactory.js";

const baseTermsService = createCrudService({
  table: "terms",
  idColumn: "term_id",
  writableColumns: ["academic_year", "semester"],
  orderBy: "academic_year DESC, semester",
});

const normalizeAcademicYear = (value) => {
  if (value === undefined || value === null) return value;
  return String(value).trim();
};

const normalizeSemester = (value) => {
  if (value === undefined || value === null) return value;
  const normalized = String(value).trim().toUpperCase();
  if (normalized === "S1") return "I";
  if (normalized === "S2") return "II";
  return normalized;
};

const isValidAcademicYear = (value) => /^(\d{4}-\d{4}|\d{4})$/.test(value);

const assertTermValues = (academicYear, semester) => {
  if (!academicYear) {
    throw new ApiError(400, "Academic year is required");
  }

  if (!isValidAcademicYear(academicYear)) {
    throw new ApiError(
      400,
      "Academic year must be in format YYYY or YYYY-YYYY (e.g., 2024 or 2023-2024)",
    );
  }

  if (!["I", "II"].includes(semester)) {
    throw new ApiError(400, "Semester must be I or II");
  }
};

const assertTermRuleForYear = async (
  academicYear,
  semester,
  excludeTermId = null,
) => {
  const duplicateParams = [academicYear, semester];
  let duplicateQuery =
    "SELECT term_id FROM terms WHERE academic_year = $1 AND semester = $2";

  if (excludeTermId !== null) {
    duplicateQuery += " AND term_id <> $3";
    duplicateParams.push(parseInt(excludeTermId, 10));
  }

  const duplicateResult = await pool.query(duplicateQuery, duplicateParams);
  if (duplicateResult.rows.length > 0) {
    throw new ApiError(
      409,
      `Term ${semester} already exists for academic year ${academicYear}. Only one Term I and one Term II are allowed.`,
    );
  }

  const countParams = [academicYear];
  let countQuery =
    "SELECT COUNT(*)::int AS count FROM terms WHERE academic_year = $1";
  if (excludeTermId !== null) {
    countQuery += " AND term_id <> $2";
    countParams.push(parseInt(excludeTermId, 10));
  }

  const countResult = await pool.query(countQuery, countParams);
  const existingCount = countResult.rows[0]?.count ?? 0;
  if (existingCount >= 2) {
    throw new ApiError(
      400,
      `Academic year ${academicYear} already has two terms. Allowed terms are only I and II.`,
    );
  }
};

export const termsService = {
  list: baseTermsService.list,
  getById: baseTermsService.getById,
  remove: baseTermsService.remove,

  create: async (payload) => {
    const academicYear = normalizeAcademicYear(
      payload.academic_year ?? payload.academicYear,
    );
    const semester = normalizeSemester(payload.semester);

    assertTermValues(academicYear, semester);
    await assertTermRuleForYear(academicYear, semester);

    try {
      return await baseTermsService.create({
        ...payload,
        academic_year: academicYear,
        semester,
      });
    } catch (error) {
      handleDatabaseError(error);
    }
  },

  update: async (id, payload) => {
    const current = await baseTermsService.getById(id);

    const nextAcademicYear = normalizeAcademicYear(
      payload.academic_year ?? payload.academicYear ?? current.academic_year,
    );
    const nextSemester = normalizeSemester(
      payload.semester ?? current.semester,
    );

    assertTermValues(nextAcademicYear, nextSemester);
    await assertTermRuleForYear(nextAcademicYear, nextSemester, id);

    const normalizedPayload = { ...payload };

    if (
      payload.academic_year !== undefined ||
      payload.academicYear !== undefined
    ) {
      normalizedPayload.academic_year = nextAcademicYear;
    }

    if (payload.semester !== undefined) {
      normalizedPayload.semester = nextSemester;
    }

    delete normalizedPayload.academicYear;

    try {
      return await baseTermsService.update(id, normalizedPayload);
    } catch (error) {
      handleDatabaseError(error);
    }
  },
};
