import { createContext, useEffect, useMemo, useState } from "react";
import authApi from "../api/authApi";
import { extractErrorMessage, extractPayload } from "../api/responseAdapter";
import { notify } from "../utils/notifications";

export const AuthContext = createContext(null);

const getStoredUser = () => {
  const userRaw = localStorage.getItem("authUser");
  return userRaw ? JSON.parse(userRaw) : null;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(getStoredUser());
  const [accessToken, setAccessToken] = useState(
    localStorage.getItem("accessToken"),
  );
  const [refreshToken, setRefreshToken] = useState(
    localStorage.getItem("refreshToken"),
  );
  const [authLoading, setAuthLoading] = useState(false);

  const persistAuth = ({ nextUser, nextAccessToken, nextRefreshToken }) => {
    setUser(nextUser || null);
    setAccessToken(nextAccessToken || null);
    setRefreshToken(nextRefreshToken || null);

    if (nextUser) localStorage.setItem("authUser", JSON.stringify(nextUser));
    else localStorage.removeItem("authUser");

    if (nextAccessToken) localStorage.setItem("accessToken", nextAccessToken);
    else localStorage.removeItem("accessToken");

    if (nextRefreshToken)
      localStorage.setItem("refreshToken", nextRefreshToken);
    else localStorage.removeItem("refreshToken");
  };

  const login = async (payload) => {
    setAuthLoading(true);
    try {
      const response = await authApi.login(payload);
      const data = extractPayload(response) || {};
      persistAuth({
        nextUser: data.user,
        nextAccessToken: data.token || data.accessToken,
        nextRefreshToken: data.refreshToken || null,
      });
      notify({ type: "success", message: "Sign-in completed successfully." });
      return data.user;
    } catch (error) {
      notify({
        type: "error",
        message: extractErrorMessage(error, "Unable to complete sign-in."),
      });
      throw error;
    } finally {
      setAuthLoading(false);
    }
  };

  const register = async (payload) => {
    setAuthLoading(true);
    try {
      const response = await authApi.register(payload);
      const data = extractPayload(response) || {};
      persistAuth({
        nextUser: data.user,
        nextAccessToken: data.token || data.accessToken,
        nextRefreshToken: data.refreshToken || null,
      });
      notify({
        type: "success",
        message: "Account registration completed successfully.",
      });
      return data.user;
    } catch (error) {
      notify({
        type: "error",
        message: extractErrorMessage(
          error,
          "Unable to complete account registration.",
        ),
      });
      throw error;
    } finally {
      setAuthLoading(false);
    }
  };

  const logout = () => {
    persistAuth({
      nextUser: null,
      nextAccessToken: null,
      nextRefreshToken: null,
    });
    notify({ type: "info", message: "Logged out" });
  };

  const refreshAuth = async () => {
    if (!refreshToken) return null;
    try {
      const response = await authApi.refresh({ refreshToken });
      const payload = extractPayload(response) || {};
      const nextAccessToken = payload.accessToken;
      const nextRefreshToken = payload.refreshToken || refreshToken;

      if (nextAccessToken) {
        persistAuth({ nextUser: user, nextAccessToken, nextRefreshToken });
        return nextAccessToken;
      }
      return null;
    } catch {
      logout();
      return null;
    }
  };

  useEffect(() => {
    if (!accessToken) return;
    localStorage.setItem("accessToken", accessToken);
  }, [accessToken]);

  const value = useMemo(
    () => ({
      user,
      accessToken,
      refreshToken,
      authLoading,
      isAuthenticated: Boolean(accessToken && user),
      login,
      register,
      logout,
      refreshAuth,
    }),
    [user, accessToken, refreshToken, authLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
