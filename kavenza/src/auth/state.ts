import { createContext } from "react";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
};

export type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);
