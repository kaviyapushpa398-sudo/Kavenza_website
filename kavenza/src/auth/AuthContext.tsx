import { useCallback, useEffect, useState, type ReactNode } from "react";
import { authApiUrl, readApiError } from "./api";
import { AuthContext, type AuthUser } from "./state";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(authApiUrl("/api/auth/session"), {
        credentials: "include",
      });
      if (!response.ok) throw new Error(`Account session request failed (${response.status}).`);
      const result: unknown = await response.json();
      if (
        typeof result !== "object" ||
        result === null ||
        !("user" in result)
      ) {
        throw new Error("The account service returned an invalid session response.");
      }
      const sessionUser = result.user;
      if (sessionUser === null) {
        setUser(null);
      } else if (
        typeof sessionUser === "object" &&
        "id" in sessionUser &&
        typeof sessionUser.id === "string" &&
        "name" in sessionUser &&
        typeof sessionUser.name === "string" &&
        "email" in sessionUser &&
        typeof sessionUser.email === "string"
      ) {
        setUser({ id: sessionUser.id, name: sessionUser.name, email: sessionUser.email });
      } else {
        throw new Error("The account service returned an invalid session response.");
      }
    } catch (error) {
      console.error("Could not load the KAVENZA account session.", error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Session state is synchronized with the backend when the provider mounts.
  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect
    void refresh();
  }, [refresh]);

  const logout = useCallback(async () => {
    const response = await fetch(authApiUrl("/api/auth/logout"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({}),
    });
    if (!response.ok) throw new Error(await readApiError(response, "Could not log out."));
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, refresh, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
