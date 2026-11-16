import type { UserSession } from "@/backend/auth/context";
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AuthState {
  user: UserSession | null;
  isAuthenticated: boolean;
  setUser: (user: UserSession | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      logout: () => set({ user: null, isAuthenticated: false }),
    }),
    {
      name: "auth-storage",
      version: 1,
      migrate: () => ({ user: null, isAuthenticated: false }),
    },
  ),
);
