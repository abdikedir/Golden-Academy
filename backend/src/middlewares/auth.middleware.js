import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { ApiError } from "../utils/ApiError.js";
import { catchAsync } from "../utils/catchAsync.js";
import pool from "../config/db.js";

export const authenticate = catchAsync(async (req, _res, next) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    throw new ApiError(401, "Authentication required");
  }

  let decoded;
  try {
    decoded = jwt.verify(token, env.jwtSecret);
  } catch (_error) {
    throw new ApiError(401, "Invalid or expired token");
  }

  // Query user with roles and teacher information using direct SQL
  const result = await pool.query(
    `
    SELECT 
      u.user_id, u.email, u.is_active,
      COALESCE(
        json_agg(
          DISTINCT jsonb_build_object(
            'role', jsonb_build_object(
              'name', r.name
            )
          )
        ) FILTER (WHERE r.role_id IS NOT NULL),
        '[]'
      ) as user_roles,
      CASE 
        WHEN t.teacher_id IS NOT NULL THEN
          json_build_object(
            'teacherId', t.teacher_id,
            'departmentId', t.department_id,
            'fullName', t.full_name,
            'department', CASE 
              WHEN d.department_id IS NOT NULL THEN
                json_build_object(
                  'departmentId', d.department_id,
                  'name', d.name,
                  'code', d.code
                )
              ELSE NULL
            END
          )
        ELSE NULL
      END as teacher
    FROM users u
    LEFT JOIN user_roles ur ON u.user_id = ur.user_id
    LEFT JOIN roles r ON ur.role_id = r.role_id
    LEFT JOIN teachers t ON u.user_id = t.user_id
    LEFT JOIN departments d ON t.department_id = d.department_id
    WHERE u.user_id = $1
    GROUP BY u.user_id, u.email, u.is_active, t.teacher_id, t.department_id, t.full_name, d.department_id, d.name, d.code
  `,
    [decoded.user_id],
  );

  if (result.rows.length === 0) {
    throw new ApiError(401, "Invalid or inactive user");
  }

  const row = result.rows[0];

  if (!row.is_active) {
    throw new ApiError(401, "Invalid or inactive user");
  }

  // Transform to match expected format
  const user = {
    userId: row.user_id,
    email: row.email,
    isActive: row.is_active,
    userRoles: row.user_roles.map((ur) => ({ role: { name: ur.role.name } })),
    teacher: row.teacher,
  };

  const roles = user.userRoles.map((ur) => ur.role.name).filter(Boolean);

  // Backward-compatible fallback for legacy teacher accounts without explicit role rows.
  if (roles.length === 0 && user.teacher?.teacherId) {
    roles.push("TEACHER");
  }

  req.user = {
    userId: user.userId,
    email: user.email,
    roles,
    teacher: user.teacher,
    departmentId: user.teacher?.departmentId,
  };

  next();
});
