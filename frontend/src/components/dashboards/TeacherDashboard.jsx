import { useMemo, useState, useCallback, useEffect } from "react";
import marksApi from "../../api/marksApi";
import reportApi from "../../api/reportApi";
import classApi from "../../api/classApi";
import teacherApi from "../../api/teacherApi";
import studentApi from "../../api/studentApi";
import Table from "../common/Table";
import TableSection from "../common/TableSection";
import StateView from "../common/StateView";
import Select from "../common/Select";
import Button from "../common/Button";
import Modal from "../common/Modal";
import { useAuth } from "../../hooks/useAuth";
import { useFetch } from "../../hooks/useFetch";
import { extractErrorMessage, extractPayload } from "../../api/responseAdapter";
import { formatDate } from "../../utils/formatDate";
import { notify } from "../../utils/notifications";

const toNumber = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
};

const resolveTeacherId = (teacher) =>
  teacher?.teacherId ?? teacher?.teacher_id ?? null;

const resolveUserId = (user) => user?.userId ?? user?.user_id ?? null;

const normalizeRoleName = (value) => {
  if (!value) return null;

  if (typeof value === "string") {
    return value.toUpperCase();
  }

  if (typeof value === "object") {
    const candidate = value.name ?? value.role?.name ?? value.roleName;
    return candidate ? String(candidate).toUpperCase() : null;
  }

  return null;
};

const resolveRoles = (user) => {
  const directRoles = Array.isArray(user?.roles) ? user.roles : [];

  if (directRoles.length) {
    const normalized = directRoles.map(normalizeRoleName).filter(Boolean);
    if (normalized.length) return normalized;
  }

  const nestedRoles = Array.isArray(user?.userRoles)
    ? user.userRoles
        .map((entry) =>
          normalizeRoleName(entry?.role?.name ?? entry?.name ?? entry),
        )
        .filter(Boolean)
    : [];

  if (nestedRoles.length) return nestedRoles;

  if (user?.teacher || user?.teacherId || user?.teacher_id) {
    return ["TEACHER"];
  }

  return [];
};

const toPayloadArray = (response, candidateKeys = []) => {
  const payload = extractPayload(response);
  if (Array.isArray(payload)) return payload;

  for (const key of candidateKeys) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }

  return [];
};

const TeacherDashboard = () => {
  const { user } = useAuth();
  const teacherId =
    resolveTeacherId(user?.teacher) ??
    user?.teacherId ??
    user?.teacher_id ??
    null;
  const userId = resolveUserId(user);
  const userRoles = resolveRoles(user);
  const isTeacherRole = userRoles.includes("TEACHER");

  const teacherDirectoryQuery = useFetch(
    async () => {
      if (!userId && !user?.email) return [];
      const response = await teacherApi.getAll();
      return toPayloadArray(response, ["teachers"]);
    },
    [userId, user?.email],
    Boolean((userId || user?.email) && !teacherId),
  );

  const resolvedTeacherId = useMemo(() => {
    if (teacherId) return teacherId;

    const linkedTeacher = (teacherDirectoryQuery.data || []).find((row) => {
      const rowUserId = row.userId ?? row.user_id ?? row.user?.userId;

      if (rowUserId && userId && Number(rowUserId) === Number(userId)) {
        return true;
      }

      const rowEmail = String(row.user?.email || "").toLowerCase();
      const currentEmail = String(user?.email || "").toLowerCase();
      return Boolean(rowEmail && currentEmail && rowEmail === currentEmail);
    });

    return linkedTeacher?.teacherId ?? linkedTeacher?.teacher_id ?? null;
  }, [teacherId, teacherDirectoryQuery.data, userId, user?.email]);

  const [markFormData, setMarkFormData] = useState({
    academicYear: "",
    termKey: "",
    classId: "",
    subjectId: "",
  });

  const [classReport, setClassReport] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState("");
  const [showStudentCards, setShowStudentCards] = useState(false);
  const [savingEnrollmentId, setSavingEnrollmentId] = useState(null);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [draftMarks, setDraftMarks] = useState({});
  const [classRoster, setClassRoster] = useState([]);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [publishingClassId, setPublishingClassId] = useState(null);
  const [studentDetailOpen, setStudentDetailOpen] = useState(false);
  const [studentDetailLoading, setStudentDetailLoading] = useState(false);
  const [studentDetailError, setStudentDetailError] = useState("");
  const [studentDetail, setStudentDetail] = useState(null);
  const [studentHistory, setStudentHistory] = useState(null);

  const homeroomClassQuery = useFetch(
    async () => {
      if (isTeacherRole) {
        try {
          return await teacherApi.getMyHomeroomClass();
        } catch (_error) {
          if (resolvedTeacherId) {
            return teacherApi.getHomeroomClass(resolvedTeacherId);
          }
          throw _error;
        }
      }

      return resolvedTeacherId
        ? teacherApi.getHomeroomClass(resolvedTeacherId)
        : Promise.resolve(null);
    },
    [isTeacherRole, resolvedTeacherId],
    true,
    { mode: "payload", initialData: null },
  );

  const homeroomClass =
    homeroomClassQuery.data && typeof homeroomClassQuery.data === "object"
      ? homeroomClassQuery.data
      : null;
  const homeroomClassId = homeroomClass?.classId ?? homeroomClass?.class_id;
  const homeroomClassLabel = homeroomClass
    ? `${homeroomClass.grade || "Class"} - ${homeroomClass.className || "Section"}`
    : "Not assigned";

  // Fetch teacher assignments when teacher is identified
  const assignmentsQuery = useFetch(async () => {
    if (isTeacherRole) {
      try {
        const response = await teacherApi.getMyAssignments();
        return toPayloadArray(response, ["assignments"]);
      } catch (_error) {
        if (resolvedTeacherId) {
          const fallbackResponse =
            await teacherApi.getAssignments(resolvedTeacherId);
          return toPayloadArray(fallbackResponse, ["assignments"]);
        }
        throw _error;
      }
    }

    if (!resolvedTeacherId) return [];

    const response = await teacherApi.getAssignments(resolvedTeacherId);
    return toPayloadArray(response, ["assignments"]);
  }, [isTeacherRole, resolvedTeacherId]);

  // Fetch marks for this teacher
  const teacherMarksQuery = useFetch(async () => {
    if (isTeacherRole) {
      try {
        const response = await marksApi.getMine();
        return toPayloadArray(response, ["marks"]);
      } catch (_error) {
        if (resolvedTeacherId) {
          const fallbackResponse =
            await marksApi.getByTeacher(resolvedTeacherId);
          return toPayloadArray(fallbackResponse, ["marks"]);
        }
        throw _error;
      }
    }

    if (!resolvedTeacherId) return [];

    const response = await marksApi.getByTeacher(resolvedTeacherId);
    return toPayloadArray(response, ["marks"]);
  }, [isTeacherRole, resolvedTeacherId]);

  // Fetch all marks for selected class to reflect real gradebook state
  const classMarksQuery = useFetch(async () => {
    if (!markFormData.classId) return [];
    const response = await marksApi.getByClass(markFormData.classId);
    return toPayloadArray(response, ["marks"]);
  }, [markFormData.classId]);

  const academicReportQuery = useFetch(async () => {
    if (!(isTeacherRole || resolvedTeacherId)) return [];

    const response = await reportApi.getAcademicReport();
    return toPayloadArray(response, ["rows", "report", "academic"]);
  }, [isTeacherRole, resolvedTeacherId]);

  const scopedMarks = teacherMarksQuery.data || [];

  const assignmentRows = useMemo(() => {
    const mappedAssignments = (assignmentsQuery.data || []).map(
      (assignment) => {
        const classData = assignment.classSubject?.class || {};
        const subjectData = assignment.classSubject?.subject || {};
        const termData = classData.term || {};

        const academicYear =
          termData.academicYear || termData.academic_year || "Unknown";
        const semester = termData.semester || "Unknown";

        return {
          teacherClassSubjectId: assignment.teacherClassSubjectId,
          classId: classData.classId,
          className: classData.className,
          grade: classData.grade,
          resultsPublished: Boolean(classData.resultsPublished),
          isHomeroomClass:
            homeroomClassId !== undefined && homeroomClassId !== null
              ? Number(classData.classId) === Number(homeroomClassId)
              : false,
          subjectId: subjectData.subjectId,
          subjectName: subjectData.name,
          subjectCode: subjectData.code,
          academicYear,
          semester,
          termKey: `${academicYear}::${semester}`,
        };
      },
    );

    const keySet = new Set(
      mappedAssignments.map(
        (row) => `${String(row.classId)}::${String(row.subjectId)}`,
      ),
    );

    const homeroomFallback = (homeroomClass?.classSubjects || [])
      .map((item) => {
        const subject = item.subject || {};
        const subjectId = subject.subjectId ?? subject.subject_id;
        const classId = homeroomClass?.classId ?? homeroomClass?.class_id;
        if (!subjectId || !classId) return null;

        const key = `${String(classId)}::${String(subjectId)}`;
        if (keySet.has(key)) return null;

        const term = homeroomClass?.term || {};
        const academicYear =
          term.academicYear || term.academic_year || "Unknown";
        const semester = term.semester || "Unknown";

        return {
          teacherClassSubjectId: `HR-${classId}-${subjectId}`,
          classId,
          className: homeroomClass?.className,
          grade: homeroomClass?.grade,
          resultsPublished: Boolean(homeroomClass?.resultsPublished),
          isHomeroomClass: true,
          subjectId,
          subjectName: subject.name,
          subjectCode: subject.code,
          academicYear,
          semester,
          termKey: `${academicYear}::${semester}`,
        };
      })
      .filter(Boolean);

    return [...mappedAssignments, ...homeroomFallback];
  }, [assignmentsQuery.data, homeroomClassId, homeroomClass]);

  const marksOverviewRows = useMemo(() => {
    const dedupe = new Map();

    (academicReportQuery.data || []).forEach((row) => {
      const studentId = row.studentId ?? row.student_id;
      const classId = row.classId ?? row.class_id;
      const academicYear = row.academicYear ?? row.academic_year;
      const semester = row.semester;

      const key = `${studentId}-${classId}-${academicYear}-${semester}`;
      if (dedupe.has(key)) return;

      dedupe.set(key, {
        studentSchoolId: row.studentSchoolId ?? row.student_school_id ?? "-",
        studentName: row.fullName ?? row.full_name ?? "-",
        classSection: row.className ?? row.class_name ?? "-",
        classLevel: row.grade ?? "-",
        academicYear: academicYear ?? "-",
        term: semester ?? "-",
        total: row.totalMarks ?? row.total_marks ?? 0,
        average: row.averageScore ?? row.average_score ?? 0,
        rank: row.rank ?? "-",
        status: row.status ?? "INCOMPLETE",
      });
    });

    return Array.from(dedupe.values()).sort((a, b) => {
      if (String(a.academicYear) !== String(b.academicYear)) {
        return String(b.academicYear).localeCompare(String(a.academicYear));
      }
      return String(a.studentName).localeCompare(String(b.studentName));
    });
  }, [academicReportQuery.data]);

  const academicYearOptions = useMemo(
    () =>
      Array.from(new Set(assignmentRows.map((row) => row.academicYear)))
        .filter(Boolean)
        .sort((a, b) => String(b).localeCompare(String(a)))
        .map((academicYear) => ({ value: academicYear, label: academicYear })),
    [assignmentRows],
  );

  const termOptions = useMemo(() => {
    if (!markFormData.academicYear) return [];

    return Array.from(
      new Set(
        assignmentRows
          .filter((row) => row.academicYear === markFormData.academicYear)
          .map((row) => row.termKey),
      ),
    )
      .map((termKey) => {
        const [, semester] = termKey.split("::");
        return { value: termKey, label: `Term ${semester}` };
      })
      .sort((a, b) => String(a.value).localeCompare(String(b.value)));
  }, [assignmentRows, markFormData.academicYear]);

  const classChoices = useMemo(() => {
    if (!markFormData.academicYear || !markFormData.termKey) return [];

    const dedupe = new Map();
    assignmentRows
      .filter(
        (row) =>
          row.academicYear === markFormData.academicYear &&
          row.termKey === markFormData.termKey,
      )
      .forEach((row) => {
        if (!dedupe.has(String(row.classId))) {
          dedupe.set(String(row.classId), {
            value: String(row.classId),
            label: `${row.grade || "Class"} - ${row.className || "Section"}`,
            resultsPublished: row.resultsPublished,
            className: row.className,
            grade: row.grade,
          });
        }
      });

    return Array.from(dedupe.values());
  }, [assignmentRows, markFormData.academicYear, markFormData.termKey]);

  const subjectChoices = useMemo(() => {
    if (
      !markFormData.academicYear ||
      !markFormData.termKey ||
      !markFormData.classId
    ) {
      return [];
    }

    return assignmentRows
      .filter(
        (row) =>
          row.academicYear === markFormData.academicYear &&
          row.termKey === markFormData.termKey &&
          String(row.classId) === String(markFormData.classId),
      )
      .map((row) => ({
        value: String(row.subjectId),
        label: `${row.subjectName} (${row.subjectCode || "-"})`,
      }));
  }, [
    assignmentRows,
    markFormData.academicYear,
    markFormData.termKey,
    markFormData.classId,
  ]);

  const selectedClassMeta = useMemo(
    () =>
      classChoices.find(
        (classOption) =>
          String(classOption.value) === String(markFormData.classId),
      ) || null,
    [classChoices, markFormData.classId],
  );

  const selectedSubjectMeta = useMemo(
    () =>
      subjectChoices.find(
        (subjectOption) =>
          String(subjectOption.value) === String(markFormData.subjectId),
      ) || null,
    [subjectChoices, markFormData.subjectId],
  );

  const selectedSubjectId = Number(markFormData.subjectId || 0);

  const marksByEnrollmentForSelectedSubject = useMemo(() => {
    if (!selectedSubjectId) return new Map();

    const next = new Map();
    (classMarksQuery.data || []).forEach((mark) => {
      const markSubjectId = Number(mark.subjectId || mark.subject_id);
      if (markSubjectId !== selectedSubjectId) return;

      const enrollmentId = Number(mark.enrollmentId || mark.enrollment_id);
      if (!enrollmentId) return;
      next.set(enrollmentId, mark);
    });

    return next;
  }, [classMarksQuery.data, selectedSubjectId]);

  const gradebookRows = useMemo(
    () =>
      (classRoster || []).map((enrollment) => {
        const enrollmentId = Number(
          enrollment.enrollmentId || enrollment.enrollment_id,
        );
        const studentId =
          enrollment.student?.studentId ||
          enrollment.student?.student_id ||
          enrollment.studentId ||
          enrollment.student_id;

        const currentMark =
          marksByEnrollmentForSelectedSubject.get(enrollmentId);
        const currentMarkValue =
          currentMark?.markObtained ?? currentMark?.mark_obtained ?? null;

        return {
          enrollmentId,
          studentId,
          studentSchoolId:
            enrollment.student?.studentSchoolId ||
            enrollment.student?.student_school_id ||
            "-",
          studentName:
            enrollment.student?.fullName ||
            enrollment.student?.full_name ||
            "-",
          existingMarkId: currentMark?.markId || currentMark?.mark_id || null,
          existingMarkValue: currentMarkValue,
          status: currentMark ? "Entered" : "Pending",
        };
      }),
    [classRoster, marksByEnrollmentForSelectedSubject],
  );

  // Calculate assignment statistics
  const assignmentStats = useMemo(() => {
    const marks = scopedMarks;

    return assignmentRows.map((assignment) => {
      const submittedMarks = marks.filter(
        (mark) =>
          Number(mark.enrollment?.classId) === Number(assignment.classId) &&
          Number(mark.subjectId || mark.subject_id) ===
            Number(assignment.subjectId),
      );

      return {
        ...assignment,
        marksSubmitted: submittedMarks.length,
      };
    });
  }, [assignmentRows, scopedMarks]);

  const marksAverage = scopedMarks.length
    ? (
        scopedMarks.reduce(
          (sum, mark) =>
            sum + toNumber(mark.mark_obtained || mark.markObtained),
          0,
        ) / scopedMarks.length
      ).toFixed(1)
    : "0.0";

  const recentMarks = useMemo(
    () =>
      [...scopedMarks]
        .sort(
          (a, b) =>
            new Date(b.submitted_at || b.submittedAt || 0).getTime() -
            new Date(a.submitted_at || a.submittedAt || 0).getTime(),
        )
        .slice(0, 12)
        .map((mark) => ({
          ...mark,
          student_name:
            mark.enrollment?.student?.fullName ||
            mark.enrollment?.student?.full_name ||
            "Unknown",
          subject_name: mark.subject?.name || "Unknown",
          class_name:
            mark.enrollment?.class?.className ||
            mark.enrollment?.class?.class_name ||
            "Unknown",
          submitted_on: formatDate(mark.submitted_at || mark.submittedAt),
        })),
    [scopedMarks],
  );

  const loadClassRoster = useCallback(async (classId) => {
    setLoadingRoster(true);
    try {
      const response = await studentApi.getEnrollments({
        classId,
        page: 1,
        limit: 500,
      });
      const payload = extractPayload(response) || {};
      setClassRoster(
        Array.isArray(payload.enrollments) ? payload.enrollments : [],
      );
    } catch (error) {
      notify({
        type: "error",
        message: extractErrorMessage(error, "Failed to load class roster"),
      });
      setClassRoster([]);
    } finally {
      setLoadingRoster(false);
    }
  }, []);

  useEffect(() => {
    if (!markFormData.academicYear && academicYearOptions.length > 0) {
      setMarkFormData((prev) => ({
        ...prev,
        academicYear: academicYearOptions[0].value,
      }));
    }
  }, [academicYearOptions, markFormData.academicYear]);

  useEffect(() => {
    if (
      markFormData.termKey &&
      termOptions.some((term) => term.value === markFormData.termKey)
    ) {
      return;
    }

    const nextTerm = termOptions[0]?.value || "";
    if (markFormData.termKey !== nextTerm) {
      setMarkFormData((prev) => ({
        ...prev,
        termKey: nextTerm,
        classId: "",
        subjectId: "",
      }));
    }
  }, [termOptions, markFormData.termKey]);

  useEffect(() => {
    if (
      markFormData.classId &&
      classChoices.some(
        (classChoice) => classChoice.value === String(markFormData.classId),
      )
    ) {
      return;
    }

    const nextClass = classChoices[0]?.value || "";
    if (markFormData.classId !== nextClass) {
      setMarkFormData((prev) => ({
        ...prev,
        classId: nextClass,
        subjectId: "",
      }));
    }
  }, [classChoices, markFormData.classId]);

  useEffect(() => {
    if (
      markFormData.subjectId &&
      subjectChoices.some(
        (subjectChoice) =>
          subjectChoice.value === String(markFormData.subjectId),
      )
    ) {
      return;
    }

    const nextSubject = subjectChoices[0]?.value || "";
    if (markFormData.subjectId !== nextSubject) {
      setMarkFormData((prev) => ({
        ...prev,
        subjectId: nextSubject,
      }));
    }
  }, [subjectChoices, markFormData.subjectId]);

  useEffect(() => {
    if (!markFormData.classId) {
      setClassRoster([]);
      return;
    }
    loadClassRoster(markFormData.classId);
  }, [markFormData.classId, loadClassRoster]);

  useEffect(() => {
    if (!selectedSubjectId || !classRoster.length) {
      setDraftMarks({});
      return;
    }

    const nextDrafts = {};
    classRoster.forEach((enrollment) => {
      const enrollmentId = Number(
        enrollment.enrollmentId || enrollment.enrollment_id,
      );
      const currentMark = marksByEnrollmentForSelectedSubject.get(enrollmentId);
      nextDrafts[enrollmentId] =
        currentMark &&
        (currentMark.markObtained !== undefined ||
          currentMark.mark_obtained !== undefined)
          ? String(currentMark.markObtained ?? currentMark.mark_obtained)
          : "";
    });

    setDraftMarks(nextDrafts);
  }, [classRoster, selectedSubjectId, marksByEnrollmentForSelectedSubject]);

  const handleHierarchyChange = (field, value) => {
    setMarkFormData((prev) => ({ ...prev, [field]: value }));
  };

  const generateClassReport = useCallback(
    async (classIdOverride = null) => {
      const classId = classIdOverride || markFormData.classId;
      if (!classId) {
        notify({
          type: "warning",
          message: "Select class hierarchy first to generate report.",
        });
        return;
      }

      setReportLoading(true);
      setReportError("");
      setShowStudentCards(false);
      try {
        const response = await reportApi.getClassReport(classId);
        const payload = extractPayload(response);
        setClassReport(payload || null);
      } catch (error) {
        const message = extractErrorMessage(
          error,
          "Failed to generate class report",
        );
        setReportError(message);
        notify({ type: "error", message });
      } finally {
        setReportLoading(false);
      }
    },
    [markFormData.classId],
  );

  const generateHomeroomRoster = useCallback(async () => {
    if (!homeroomClassId) {
      notify({
        type: "warning",
        message: "No homeroom class is assigned to your teacher account.",
      });
      return;
    }

    await generateClassReport(homeroomClassId);
  }, [generateClassReport, homeroomClassId]);

  useEffect(() => {
    if (classReport || reportLoading || !homeroomClassId) return;

    generateClassReport(homeroomClassId);
  }, [classReport, reportLoading, homeroomClassId, generateClassReport]);

  const applyAssignmentToHierarchy = (assignment) => {
    setMarkFormData((prev) => ({
      ...prev,
      academicYear: assignment.academicYear,
      termKey: assignment.termKey,
      classId: String(assignment.classId),
      subjectId: assignment.subjectId ? String(assignment.subjectId) : "",
    }));
  };

  const handleOpenStudentDetail = useCallback(async (studentMeta) => {
    const parsedStudentId = Number(studentMeta?.studentId);
    if (!Number.isInteger(parsedStudentId) || parsedStudentId < 1) {
      notify({
        type: "warning",
        message: "Valid student details are not available for this row.",
      });
      return;
    }

    setStudentDetailOpen(true);
    setStudentDetailLoading(true);
    setStudentDetailError("");
    setStudentDetail(null);
    setStudentHistory(null);

    try {
      const [studentResponse, historyResponse] = await Promise.all([
        studentApi.getById(parsedStudentId),
        studentApi.getHistory(parsedStudentId),
      ]);

      const studentPayload = extractPayload(studentResponse);
      const historyPayload = extractPayload(historyResponse);

      setStudentDetail(
        studentPayload && typeof studentPayload === "object"
          ? studentPayload
          : null,
      );
      setStudentHistory(
        historyPayload && typeof historyPayload === "object"
          ? historyPayload
          : null,
      );
    } catch (error) {
      setStudentDetailError(
        extractErrorMessage(error, "Failed to load student details"),
      );
    } finally {
      setStudentDetailLoading(false);
    }
  }, []);

  const closeStudentDetailModal = () => {
    setStudentDetailOpen(false);
    setStudentDetailError("");
  };

  const handlePublishClassResults = useCallback(async () => {
    const classId = Number(classReport?.classId || 0);
    const isHomeroomReport =
      classReport &&
      homeroomClassId !== undefined &&
      homeroomClassId !== null &&
      Number(classReport.classId) === Number(homeroomClassId);

    if (!classId) {
      notify({
        type: "warning",
        message: "Generate class report first before publishing results.",
      });
      return;
    }

    if (!isHomeroomReport) {
      notify({
        type: "warning",
        message: "Only the homeroom teacher can publish this class result.",
      });
      return;
    }

    if (classReport?.resultsPublished) {
      notify({
        type: "info",
        message: "Results are already published for this class.",
      });
      return;
    }

    if (!classReport?.allMarksComplete) {
      notify({
        type: "warning",
        message: "Cannot publish until all marks are submitted.",
      });
      return;
    }

    const confirmed = window.confirm(
      `Publish results for ${classReport?.className || "this class"} (${classReport?.term?.academicYear || ""} Term ${classReport?.term?.semester || ""})? This locks mark edits.`,
    );

    if (!confirmed) return;

    setPublishingClassId(classId);
    try {
      await classApi.publishResults(classId);
      notify({ type: "success", message: "Class results published." });

      await Promise.allSettled([
        assignmentsQuery.refetch(),
        teacherMarksQuery.refetch(),
        academicReportQuery.refetch(),
        homeroomClassQuery.refetch(),
      ]);

      await generateClassReport(classId);
    } catch (error) {
      notify({
        type: "error",
        message: extractErrorMessage(error, "Failed to publish class results"),
      });
    } finally {
      setPublishingClassId(null);
    }
  }, [
    classReport,
    homeroomClassId,
    assignmentsQuery,
    teacherMarksQuery,
    academicReportQuery,
    homeroomClassQuery,
    generateClassReport,
  ]);

  const saveEnrollmentMark = useCallback(
    async (row, options = {}) => {
      const { silent = false } = options;

      if (!resolvedTeacherId && !isTeacherRole) {
        throw new Error("Teacher profile missing from login session");
      }

      if (!selectedSubjectId) {
        throw new Error("Select a subject before entering marks");
      }

      if (selectedClassMeta?.resultsPublished) {
        throw new Error(
          "Results already published for this class. Marks are locked.",
        );
      }

      const rawValue = String(draftMarks[row.enrollmentId] ?? "").trim();
      if (!rawValue) {
        throw new Error(`Mark is required for ${row.studentName}`);
      }

      const parsedMark = Number(rawValue);
      if (!Number.isInteger(parsedMark) || parsedMark < 1 || parsedMark > 100) {
        throw new Error(
          `Mark for ${row.studentName} must be an integer between 1 and 100`,
        );
      }

      if (!row.studentId) {
        throw new Error(`Student record is invalid for ${row.studentName}`);
      }

      if (!silent) {
        setSavingEnrollmentId(row.enrollmentId);
      }

      if (row.existingMarkId) {
        await marksApi.updateMarkByTeacher(row.existingMarkId, {
          markObtained: parsedMark,
        });
      } else {
        await marksApi.submitMark({
          studentId: Number(row.studentId),
          enrollmentId: Number(row.enrollmentId),
          subjectId: Number(selectedSubjectId),
          markObtained: parsedMark,
        });
      }

      if (!silent) {
        notify({
          type: "success",
          message: `Mark saved for ${row.studentName}`,
        });
      }
    },
    [
      resolvedTeacherId,
      isTeacherRole,
      selectedSubjectId,
      selectedClassMeta?.resultsPublished,
      draftMarks,
    ],
  );

  const handleSaveSingleMark = async (row) => {
    try {
      await saveEnrollmentMark(row);
      await Promise.allSettled([
        teacherMarksQuery.refetch(),
        classMarksQuery.refetch(),
        assignmentsQuery.refetch(),
      ]);
    } catch (error) {
      notify({
        type: "error",
        message: extractErrorMessage(error, "Failed to save mark"),
      });
    } finally {
      setSavingEnrollmentId(null);
    }
  };

  const handleSaveAllMarks = async () => {
    if (!gradebookRows.length) {
      notify({
        type: "warning",
        message: "No students found for selected class.",
      });
      return;
    }

    setBulkSaving(true);
    try {
      const rowsWithValues = gradebookRows.filter((row) => {
        const value = String(draftMarks[row.enrollmentId] ?? "").trim();
        return value.length > 0;
      });

      if (!rowsWithValues.length) {
        throw new Error("Enter at least one mark before using Save All");
      }

      for (const row of rowsWithValues) {
        await saveEnrollmentMark(row, { silent: true });
      }

      await Promise.allSettled([
        teacherMarksQuery.refetch(),
        classMarksQuery.refetch(),
        assignmentsQuery.refetch(),
      ]);

      notify({
        type: "success",
        message: `Saved ${rowsWithValues.length} marks successfully.`,
      });
    } catch (error) {
      notify({
        type: "error",
        message: extractErrorMessage(error, "Failed to save all marks"),
      });
    } finally {
      setBulkSaving(false);
      setSavingEnrollmentId(null);
    }
  };

  const errors = [
    assignmentsQuery.error,
    teacherMarksQuery.error,
    classMarksQuery.error,
    academicReportQuery.error,
    homeroomClassQuery.error,
    teacherDirectoryQuery.error,
  ].filter(Boolean);

  const loading =
    teacherDirectoryQuery.loading ||
    assignmentsQuery.loading ||
    teacherMarksQuery.loading ||
    classMarksQuery.loading ||
    academicReportQuery.loading ||
    homeroomClassQuery.loading;

  const refreshAll = async () => {
    await Promise.allSettled([
      assignmentsQuery.refetch(),
      teacherMarksQuery.refetch(),
      classMarksQuery.refetch(),
      academicReportQuery.refetch(),
      homeroomClassQuery.refetch(),
      teacherDirectoryQuery.refetch(),
    ]);
  };

  const reportRows = useMemo(
    () =>
      (classReport?.students || []).map((studentRow) => ({
        studentId: studentRow.student?.studentId || "-",
        rank: studentRow.rank ?? "-",
        studentName: studentRow.student?.fullName || "-",
        studentSchoolId: studentRow.student?.studentSchoolId || "-",
        gender: studentRow.student?.gender || "-",
        total: (studentRow.marks || []).reduce(
          (sum, markRow) => sum + Number(markRow.markObtained || 0),
          0,
        ),
        average:
          studentRow.average === null || studentRow.average === undefined
            ? "-"
            : Number(studentRow.average).toFixed(1),
        status: studentRow.status || "INCOMPLETE",
      })),
    [classReport],
  );

  const canShowHomeroomData =
    Boolean(classReport) &&
    homeroomClassId !== undefined &&
    homeroomClassId !== null &&
    Number(classReport.classId) === Number(homeroomClassId);

  const sectionAverageRange = useMemo(() => {
    if (!canShowHomeroomData) return "-";

    const averages = (classReport?.students || [])
      .map((studentRow) => studentRow.average)
      .filter((average) => average !== null && average !== undefined)
      .map(Number)
      .filter((average) => Number.isFinite(average));

    if (!averages.length) return "-";

    return `${Math.min(...averages).toFixed(1)} - ${Math.max(...averages).toFixed(1)}`;
  }, [canShowHomeroomData, classReport]);

  const studentCards = useMemo(() => {
    if (!canShowHomeroomData) return [];

    return (classReport?.students || []).map((studentRow) => {
      const totalMarks = (studentRow.marks || []).reduce(
        (sum, markRow) => sum + Number(markRow.markObtained || 0),
        0,
      );

      return {
        studentId: studentRow.student?.studentId || "-",
        studentSchoolId: studentRow.student?.studentSchoolId || "-",
        studentName: studentRow.student?.fullName || "-",
        gender: studentRow.student?.gender || "-",
        rank: studentRow.rank ?? "-",
        status: studentRow.status ?? "INCOMPLETE",
        average:
          studentRow.average === null || studentRow.average === undefined
            ? "-"
            : Number(studentRow.average).toFixed(1),
        total: totalMarks,
        academicYear: classReport?.term?.academicYear || "-",
        term: classReport?.term?.semester || "-",
        classLevel: classReport?.grade || "-",
        section: classReport?.className || "-",
        sectionRange: sectionAverageRange,
        marks: (studentRow.marks || []).map(
          (markRow) => `${markRow.subjectName}: ${markRow.markObtained}`,
        ),
      };
    });
  }, [canShowHomeroomData, classReport, sectionAverageRange]);

  const studentHistoryRows = useMemo(() => {
    if (!Array.isArray(studentHistory?.enrollments)) return [];

    return studentHistory.enrollments.map((enrollment) => {
      const marks = Array.isArray(enrollment.marks) ? enrollment.marks : [];
      const total = marks.reduce(
        (sum, mark) => sum + Number(mark.markObtained || 0),
        0,
      );

      return {
        enrollmentId: enrollment.enrollmentId,
        className: enrollment.class?.className || "-",
        grade: enrollment.class?.grade || "-",
        academicYear: enrollment.class?.term?.academicYear || "-",
        term: enrollment.class?.term?.semester || "-",
        subjects: marks.length,
        average: marks.length ? (total / marks.length).toFixed(1) : "-",
        published: enrollment.class?.resultsPublished ? "Yes" : "No",
      };
    });
  }, [studentHistory]);

  const classCount = useMemo(() => {
    const classIds = new Set(assignmentRows.map((row) => String(row.classId)));

    if (homeroomClassId !== undefined && homeroomClassId !== null) {
      classIds.add(String(homeroomClassId));
    }

    return classIds.size;
  }, [assignmentRows, homeroomClassId]);

  const assignmentDisplayRows = useMemo(() => {
    const rows = [...assignmentStats];

    const hasHomeroomRow = rows.some(
      (row) => Number(row.classId) === Number(homeroomClassId),
    );

    if (!hasHomeroomRow && homeroomClassId) {
      const homeroomMarks = scopedMarks.filter(
        (mark) => Number(mark.enrollment?.classId) === Number(homeroomClassId),
      );

      rows.unshift({
        teacherClassSubjectId: `HR-${homeroomClassId}`,
        classId: homeroomClassId,
        className: homeroomClass?.className || "Homeroom",
        grade: homeroomClass?.grade || "-",
        resultsPublished: Boolean(homeroomClass?.resultsPublished),
        isHomeroomClass: true,
        subjectId: null,
        subjectName: "Homeroom Access",
        subjectCode: "HR",
        academicYear:
          homeroomClass?.term?.academicYear ||
          homeroomClass?.term?.academic_year ||
          "-",
        semester: homeroomClass?.term?.semester || "-",
        termKey: `${homeroomClass?.term?.academicYear || "-"}::${homeroomClass?.term?.semester || "-"}`,
        marksSubmitted: homeroomMarks.length,
      });
    }

    return rows;
  }, [assignmentStats, homeroomClassId, homeroomClass, scopedMarks]);

  const teacherDisplayName =
    user?.teacher?.fullName || user?.teacher?.full_name || "Teacher";

  const hasTeacherIdentity = Boolean(
    resolvedTeacherId || userId || isTeacherRole,
  );

  return (
    <div className="space-y-4">
      {errors.length ? (
        <StateView
          type="error"
          title="Some teaching data failed to load"
          description={errors[0]}
          action={
            <button
              type="button"
              onClick={refreshAll}
              className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              Retry Dashboard Load
            </button>
          }
        />
      ) : null}

      {!loading && !hasTeacherIdentity ? (
        <StateView
          type="empty"
          title="Teacher profile not linked"
          description="Your login context has no teacher profile. Ask admin to map your user account to a teacher record."
        />
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <div className="metric-item">
          <p className="metric-label">Teacher Profile</p>
          <p className="metric-value">{teacherDisplayName}</p>
          <p className="mt-1 text-xs text-slate-600">
            {teacherId ? `ID ${teacherId}` : "Needs mapping"}
          </p>
        </div>
        <div className="metric-item">
          <p className="metric-label">Assigned Classes</p>
          <p className="metric-value">{classCount}</p>
          <p className="mt-1 text-xs text-slate-600">
            Across sections and terms
          </p>
        </div>
        <div className="metric-item">
          <p className="metric-label">Homeroom Class</p>
          <p className="metric-value text-base">{homeroomClassLabel}</p>
          <p className="mt-1 text-xs text-slate-600">
            {homeroomClassId
              ? `Class ID ${homeroomClassId}`
              : "Roster/cards locked"}
          </p>
        </div>
        <div className="metric-item">
          <p className="metric-label">Submitted Marks</p>
          <p className="metric-value">{scopedMarks.length}</p>
          <p className="mt-1 text-xs text-slate-600">Your current workload</p>
        </div>
        <div className="metric-item">
          <p className="metric-label">Average Mark</p>
          <p className="metric-value">{marksAverage}</p>
          <p className="mt-1 text-xs text-slate-600">From your submissions</p>
        </div>
      </div>

      <div className="card space-y-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">Submit Marks</p>
          <p className="text-xs text-slate-500">
            Real-world flow: select academic year, term, class and subject, then
            enter marks across the class roster.
          </p>
        </div>

        <div className="space-y-3">
          <div className="grid gap-3 md:grid-cols-4">
            <Select
              label="Academic Year"
              name="academicYear"
              value={markFormData.academicYear}
              onChange={(event) =>
                handleHierarchyChange("academicYear", event.target.value)
              }
              options={academicYearOptions}
            />
            <Select
              label="Term"
              name="termKey"
              value={markFormData.termKey}
              onChange={(event) =>
                handleHierarchyChange("termKey", event.target.value)
              }
              options={termOptions}
              disabled={!markFormData.academicYear}
            />
            <Select
              label="Class / Section"
              name="classId"
              value={markFormData.classId}
              onChange={(event) =>
                handleHierarchyChange("classId", event.target.value)
              }
              options={classChoices.map((classChoice) => ({
                value: classChoice.value,
                label: classChoice.label,
              }))}
              disabled={!markFormData.termKey}
            />
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <Select
              label="Subject"
              name="subjectId"
              value={markFormData.subjectId}
              onChange={(event) =>
                handleHierarchyChange("subjectId", event.target.value)
              }
              options={subjectChoices}
              disabled={!markFormData.classId}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs text-slate-600">
              {selectedClassMeta?.resultsPublished ? (
                <span className="font-semibold text-rose-600">
                  This class is published. Mark entry is locked.
                </span>
              ) : !selectedSubjectMeta ? (
                <span className="font-semibold text-amber-700">
                  Select a subject to open the class gradebook.
                </span>
              ) : (
                <span>
                  Subject: <strong>{selectedSubjectMeta.label}</strong>. Enter
                  marks per row and save.
                </span>
              )}
            </div>
            <Button
              type="button"
              loading={bulkSaving}
              disabled={
                !hasTeacherIdentity ||
                !selectedSubjectMeta ||
                selectedClassMeta?.resultsPublished ||
                loadingRoster
              }
              onClick={handleSaveAllMarks}
            >
              Save All Filled Marks
            </Button>
          </div>

          {selectedSubjectMeta ? (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">
                      Student ID
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">
                      Student Name
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">
                      Current Mark
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">
                      Enter Mark (1-100)
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {loadingRoster ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-3 py-4 text-sm text-slate-500"
                      >
                        Loading class roster...
                      </td>
                    </tr>
                  ) : gradebookRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-3 py-4 text-sm text-slate-500"
                      >
                        No students found for selected class.
                      </td>
                    </tr>
                  ) : (
                    gradebookRows.map((row) => {
                      const draftValue = draftMarks[row.enrollmentId] ?? "";
                      const currentMarkDisplay =
                        row.existingMarkValue === null ||
                        row.existingMarkValue === undefined
                          ? "Not entered"
                          : row.existingMarkValue;

                      return (
                        <tr key={row.enrollmentId}>
                          <td className="px-3 py-2 text-sm text-slate-700">
                            <button
                              type="button"
                              onClick={() => handleOpenStudentDetail(row)}
                              className="font-medium text-indigo-700 hover:text-indigo-900 hover:underline"
                            >
                              {row.studentSchoolId}
                            </button>
                          </td>
                          <td className="px-3 py-2 text-sm text-slate-800">
                            {row.studentName}
                          </td>
                          <td className="px-3 py-2 text-sm text-slate-700">
                            {currentMarkDisplay}
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              min="1"
                              max="100"
                              step="1"
                              value={draftValue}
                              onChange={(event) => {
                                const value = event.target.value;
                                setDraftMarks((prev) => ({
                                  ...prev,
                                  [row.enrollmentId]: value,
                                }));
                              }}
                              className="w-28 rounded-lg border border-slate-300 px-2 py-1 text-sm outline-none focus:border-emerald-500"
                              disabled={
                                selectedClassMeta?.resultsPublished ||
                                bulkSaving
                              }
                            />
                          </td>
                          <td className="px-3 py-2">
                            <Button
                              type="button"
                              loading={savingEnrollmentId === row.enrollmentId}
                              disabled={
                                selectedClassMeta?.resultsPublished ||
                                bulkSaving ||
                                savingEnrollmentId === row.enrollmentId
                              }
                              onClick={() => handleSaveSingleMark(row)}
                            >
                              {row.existingMarkId ? "Update" : "Save"}
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      </div>

      <div className="card space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-slate-900">
              Generate Class Report
            </p>
            <p className="text-xs text-slate-500">
              Reports are available for assigned classes. Full roster and
              student cards are available only for your homeroom class.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              onClick={() => generateClassReport()}
              loading={reportLoading}
              disabled={!markFormData.classId}
            >
              Generate Report
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={generateHomeroomRoster}
              disabled={!homeroomClassId}
            >
              Load Homeroom Roster
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={handlePublishClassResults}
              loading={publishingClassId === Number(classReport?.classId || 0)}
              disabled={
                !classReport ||
                !canShowHomeroomData ||
                classReport?.resultsPublished ||
                !classReport?.allMarksComplete
              }
            >
              {classReport?.resultsPublished
                ? "Already Published"
                : "Publish Results"}
            </Button>
          </div>
        </div>

        {reportError ? (
          <StateView
            type="error"
            title="Report generation failed"
            description={reportError}
          />
        ) : null}

        {classReport ? (
          <div className="space-y-2 rounded-xl border border-emerald-100 bg-emerald-50/40 p-3">
            <p className="text-sm font-semibold text-slate-800">
              {classReport.className} ({classReport.grade}) -{" "}
              {classReport.term?.academicYear} Term {classReport.term?.semester}
            </p>
            <p className="text-xs text-slate-600">
              Students: {(classReport.students || []).length} | Subjects:{" "}
              {(classReport.subjectCompletionStatus || []).length} | Marks
              Complete: {classReport.allMarksComplete ? "Yes" : "No"}
            </p>
            {canShowHomeroomData && !classReport.resultsPublished ? (
              <p className="text-xs font-semibold text-emerald-700">
                Homeroom permission active: you can publish once all marks are
                complete.
              </p>
            ) : null}
            {!canShowHomeroomData ? (
              <p className="text-xs font-semibold text-amber-700">
                This class is not your homeroom class. Roster and student cards
                are hidden.
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      {classReport ? (
        <TableSection title="Class Report - Student Performance">
          <Table
            rows={reportRows}
            loading={reportLoading}
            error={reportError}
            columns={[
              { key: "rank", title: "Rank" },
              { key: "studentId", title: "Student ID" },
              {
                key: "studentName",
                title: "Student",
                render: (row) => (
                  <div>
                    <p className="font-medium">{row.studentName}</p>
                    <button
                      type="button"
                      onClick={() => handleOpenStudentDetail(row)}
                      className="text-xs font-medium text-indigo-700 hover:text-indigo-900 hover:underline"
                    >
                      {row.studentSchoolId}
                    </button>
                  </div>
                ),
              },
              { key: "gender", title: "Gender" },
              { key: "total", title: "Total" },
              { key: "average", title: "Average" },
              { key: "status", title: "Status" },
            ]}
            searchPlaceholder="Search students in report..."
            pageSize={15}
            pageSizeOptions={[15, 30, 60]}
          />
        </TableSection>
      ) : null}

      <TableSection title="Your Class Assignments">
        <Table
          rows={assignmentDisplayRows}
          loading={assignmentsQuery.loading && !assignmentDisplayRows.length}
          error={assignmentsQuery.error}
          columns={[
            { key: "className", title: "Class" },
            { key: "academicYear", title: "Academic Year" },
            { key: "semester", title: "Term" },
            { key: "subjectName", title: "Subject" },
            {
              key: "isHomeroomClass",
              title: "Homeroom",
              render: (row) => (row.isHomeroomClass ? "Yes" : "No"),
            },
            { key: "marksSubmitted", title: "Marks Submitted" },
            {
              key: "resultsPublished",
              title: "Status",
              render: (row) => (
                <span
                  className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                    row.resultsPublished
                      ? "bg-green-100 text-green-800"
                      : "bg-yellow-100 text-yellow-800"
                  }`}
                >
                  {row.resultsPublished ? "Published" : "In Progress"}
                </span>
              ),
            },
            {
              key: "actions",
              title: "Actions",
              render: (row) => (
                <div className="flex gap-2">
                  <button
                    onClick={() => applyAssignmentToHierarchy(row)}
                    className="text-sm text-emerald-600 hover:text-emerald-800"
                    disabled={!row.subjectId}
                  >
                    Use In Form
                  </button>
                  <button
                    onClick={() => generateClassReport(row.classId)}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    Generate Report
                  </button>
                  {row.isHomeroomClass ? (
                    <button
                      onClick={generateHomeroomRoster}
                      className="text-sm text-indigo-600 hover:text-indigo-800"
                    >
                      Roster & Cards
                    </button>
                  ) : null}
                </div>
              ),
            },
          ]}
          searchPlaceholder="Search assignments..."
          pageSize={10}
          pageSizeOptions={[10, 20, 50]}
        />
      </TableSection>

      <TableSection title="Student Marks Overview (Unique Year, Class, Term)">
        <Table
          rows={marksOverviewRows}
          loading={academicReportQuery.loading && !marksOverviewRows.length}
          error={academicReportQuery.error}
          columns={[
            { key: "studentSchoolId", title: "Student ID" },
            { key: "studentName", title: "Student" },
            { key: "classLevel", title: "Class" },
            { key: "classSection", title: "Section" },
            { key: "academicYear", title: "Academic Year" },
            { key: "term", title: "Term" },
            { key: "total", title: "Total" },
            {
              key: "average",
              title: "Average",
              render: (row) => Number(row.average || 0).toFixed(1),
            },
            { key: "rank", title: "Rank" },
            { key: "status", title: "Status" },
          ]}
          searchPlaceholder="Search student marks overview..."
          pageSize={12}
          pageSizeOptions={[12, 24, 48]}
        />
      </TableSection>

      <TableSection title="Recent Marks Submitted">
        <Table
          rows={recentMarks}
          loading={teacherMarksQuery.loading && !recentMarks.length}
          error={teacherMarksQuery.error}
          columns={[
            { key: "student_name", title: "Student" },
            { key: "class_name", title: "Class" },
            { key: "subject_name", title: "Subject" },
            {
              key: "mark_obtained",
              title: "Mark",
              render: (row) => row.mark_obtained || row.markObtained || 0,
            },
            { key: "submitted_on", title: "Submitted" },
          ]}
          searchPlaceholder="Search submitted marks..."
          pageSize={12}
          pageSizeOptions={[12, 24, 36]}
        />
      </TableSection>

      <TableSection title="Homeroom Roster (Full Info)">
        {!canShowHomeroomData ? (
          <StateView
            type="empty"
            title="Homeroom roster not generated"
            description="Use Load Homeroom Roster to generate full student roster and cards for your homeroom class."
          />
        ) : (
          <Table
            rows={reportRows}
            loading={reportLoading || loadingRoster}
            error={null}
            columns={[
              { key: "studentId", title: "Student ID" },
              {
                key: "studentSchoolId",
                title: "School ID",
                render: (row) => (
                  <button
                    type="button"
                    onClick={() => handleOpenStudentDetail(row)}
                    className="font-medium text-indigo-700 hover:text-indigo-900 hover:underline"
                  >
                    {row.studentSchoolId}
                  </button>
                ),
              },
              { key: "studentName", title: "Name" },
              { key: "gender", title: "Gender" },
              { key: "total", title: "Total" },
              { key: "average", title: "Average" },
              { key: "rank", title: "Rank" },
              { key: "status", title: "Status" },
            ]}
            searchPlaceholder="Search homeroom roster..."
            pageSize={12}
            pageSizeOptions={[12, 24, 48]}
          />
        )}
      </TableSection>

      {canShowHomeroomData ? (
        <div className="card space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-slate-900">
                Student Cards ({classReport?.className} |{" "}
                {classReport?.term?.academicYear} Term{" "}
                {classReport?.term?.semester})
              </p>
              <p className="text-xs text-slate-500">
                Section average range: {sectionAverageRange}
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowStudentCards((prev) => !prev)}
            >
              {showStudentCards ? "Hide Cards" : "Generate Cards"}
            </Button>
          </div>

          {showStudentCards ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {studentCards.map((card) => (
                <div
                  key={`${card.studentId}-${card.studentSchoolId}`}
                  className="rounded-xl border border-emerald-100 bg-white p-3 shadow-sm"
                >
                  <p className="text-sm font-semibold text-slate-900">
                    {card.studentName}
                  </p>
                  <p className="text-xs text-slate-500">
                    {card.studentSchoolId} | Gender: {card.gender}
                  </p>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-700">
                    <p>Academic Year: {card.academicYear}</p>
                    <p>Term: {card.term}</p>
                    <p>Class: {card.classLevel}</p>
                    <p>Section: {card.section}</p>
                    <p>Total: {card.total}</p>
                    <p>Average: {card.average}</p>
                    <p>Rank: {card.rank}</p>
                    <p>Status: {card.status}</p>
                  </div>
                  <p className="mt-2 text-xs font-semibold text-emerald-700">
                    Section Range: {card.sectionRange}
                  </p>
                  <div className="mt-2 rounded-lg bg-emerald-50 p-2 text-xs text-slate-700">
                    {(card.marks || []).length > 0
                      ? card.marks.join(" | ")
                      : "No submitted marks yet"}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      <Modal
        isOpen={studentDetailOpen}
        onClose={closeStudentDetailModal}
        title="Student Detail"
        size="large"
      >
        {studentDetailLoading ? (
          <p className="text-sm text-slate-600">Loading student details...</p>
        ) : studentDetailError ? (
          <StateView
            type="error"
            title="Unable to load student details"
            description={studentDetailError}
          />
        ) : !studentDetail ? (
          <StateView
            type="empty"
            title="No student data"
            description="Select a student with a valid School ID to view details."
          />
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-sm font-semibold text-slate-900">
                {studentDetail.fullName || "-"}
              </p>
              <div className="mt-2 grid gap-2 text-xs text-slate-700 sm:grid-cols-2 lg:grid-cols-4">
                <p>
                  School ID:{" "}
                  <strong>{studentDetail.studentSchoolId || "-"}</strong>
                </p>
                <p>
                  Student ID: <strong>{studentDetail.studentId || "-"}</strong>
                </p>
                <p>
                  Gender: <strong>{studentDetail.gender || "-"}</strong>
                </p>
                <p>
                  Registered:{" "}
                  <strong>{formatDate(studentDetail.createdAt)}</strong>
                </p>
              </div>
            </div>

            <Table
              rows={studentHistoryRows}
              columns={[
                { key: "academicYear", title: "Academic Year" },
                { key: "term", title: "Term" },
                { key: "grade", title: "Grade" },
                { key: "className", title: "Class" },
                { key: "subjects", title: "Subjects" },
                { key: "average", title: "Average" },
                { key: "published", title: "Published" },
              ]}
              searchPlaceholder="Search student history..."
              pageSize={8}
              pageSizeOptions={[8, 16, 24]}
            />
          </div>
        )}
      </Modal>
    </div>
  );
};

export default TeacherDashboard;
