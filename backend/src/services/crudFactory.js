import pool from "../config/db.js";
import { ApiError } from "../utils/ApiError.js";
import { handleDatabaseError } from "../utils/dbErrorHandler.js";

export const createCrudService = ({
  table,
  idColumn,
  writableColumns,
  orderBy = idColumn,
}) => {
  const list = async () => {
    const { rows } = await pool.query(
      `SELECT * FROM ${table} ORDER BY ${orderBy}`,
    );
    return rows;
  };

  const getById = async (id) => {
    const { rows } = await pool.query(
      `SELECT * FROM ${table} WHERE ${idColumn} = $1`,
      [id],
    );
    if (!rows[0]) throw new ApiError(404, `${table} record not found`);
    return rows[0];
  };

  const create = async (payload) => {
    const cols = writableColumns.filter((c) => payload[c] !== undefined);
    if (cols.length === 0)
      throw new ApiError(400, "No writable fields provided");

    const placeholders = cols.map((_, i) => `$${i + 1}`).join(", ");
    const values = cols.map((c) => payload[c]);

    try {
      const { rows } = await pool.query(
        `INSERT INTO ${table} (${cols.join(", ")}) VALUES (${placeholders}) RETURNING *`,
        values,
      );
      return rows[0];
    } catch (error) {
      handleDatabaseError(error);
    }
  };

  const update = async (id, payload) => {
    const cols = writableColumns.filter((c) => payload[c] !== undefined);
    if (cols.length === 0)
      throw new ApiError(400, "No writable fields provided");

    const setClause = cols.map((c, i) => `${c} = $${i + 1}`).join(", ");
    const values = cols.map((c) => payload[c]);

    try {
      const { rows } = await pool.query(
        `UPDATE ${table}
         SET ${setClause}
         WHERE ${idColumn} = $${cols.length + 1}
         RETURNING *`,
        [...values, id],
      );

      if (!rows[0]) throw new ApiError(404, `${table} record not found`);
      return rows[0];
    } catch (error) {
      handleDatabaseError(error);
    }
  };

  const remove = async (id) => {
    try {
      const { rowCount } = await pool.query(
        `DELETE FROM ${table} WHERE ${idColumn} = $1`,
        [id],
      );
      if (rowCount === 0) throw new ApiError(404, `${table} record not found`);
      return { [idColumn]: Number(id) };
    } catch (error) {
      handleDatabaseError(error);
    }
  };

  return { list, getById, create, update, remove };
};
