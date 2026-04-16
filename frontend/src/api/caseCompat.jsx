const isPlainObject = (value) => {
  if (!value || typeof value !== "object") return false;
  return Object.getPrototypeOf(value) === Object.prototype;
};

const toCamel = (key) =>
  key.replace(/_([a-z])/g, (_, char) => char.toUpperCase());

const toSnake = (key) =>
  key
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[-\s]+/g, "_")
    .toLowerCase();

const shouldAliasKey = (key) =>
  key.includes("_") ||
  /[A-Z]/.test(key) ||
  key === "isActive" ||
  key === "is_active";

export const expandCaseAliases = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => expandCaseAliases(item));
  }

  if (!isPlainObject(value)) {
    return value;
  }

  const expanded = {};

  Object.entries(value).forEach(([key, raw]) => {
    const nested = expandCaseAliases(raw);
    expanded[key] = nested;

    if (!shouldAliasKey(key)) return;

    const camelKey = toCamel(key);
    const snakeKey = toSnake(key);

    if (expanded[camelKey] === undefined) {
      expanded[camelKey] = nested;
    }
    if (expanded[snakeKey] === undefined) {
      expanded[snakeKey] = nested;
    }
  });

  return expanded;
};

export const pickValue = (source, ...keys) => {
  for (const key of keys) {
    if (source?.[key] !== undefined) return source[key];
  }
  return undefined;
};
