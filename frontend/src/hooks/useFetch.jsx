import { useCallback, useEffect, useRef, useState } from "react";
import {
  extractArray,
  extractErrorMessage,
  extractPayload,
} from "../api/responseAdapter";

const normalizeData = (response, mode) => {
  if (mode === "payload") return extractPayload(response);
  if (Array.isArray(response)) return response;
  return extractArray(response);
};

export const useFetch = (
  fetcher,
  dependencies = [],
  immediate = true,
  options = {},
) => {
  const { mode = "array", initialData = [] } = options;
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState(null);
  const fetcherRef = useRef(fetcher);

  useEffect(() => {
    fetcherRef.current = fetcher;
  }, [fetcher]);

  const execute = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetcherRef.current();
      setData(normalizeData(response, mode));
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [mode, ...dependencies]);

  useEffect(() => {
    if (immediate) execute();
  }, [execute, immediate]);

  const isEmpty = Array.isArray(data) ? data.length === 0 : !data;

  return { data, setData, loading, error, isEmpty, refetch: execute };
};
