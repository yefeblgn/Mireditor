import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface AuthState {
  token: string | null;
  isAuthenticated: boolean;
  user: any | null;
  rememberMe: boolean;
  setToken: (token: string | null) => void;
  setUser: (user: any | null) => void;
  setRememberMe: (value: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      isAuthenticated: false,
      user: null,
      rememberMe: false,
      setToken: (token) => set({ token, isAuthenticated: !!token }),
      setUser: (user) => set({ user }),
      setRememberMe: (value) => set({ rememberMe: value }),
      logout: () => set({ token: null, isAuthenticated: false, user: null }),
    }),
    {
      name: 'mireditor-auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        token: state.rememberMe ? state.token : null,
        isAuthenticated: state.rememberMe ? state.isAuthenticated : false,
        user: state.rememberMe ? state.user : null,
        rememberMe: state.rememberMe,
      }),
      onRehydrateStorage: () => (state) => {
        // Rehydrate sonrası token varsa isAuthenticated'ı düzelt
        if (state && state.token) {
          state.isAuthenticated = true;
        }
      },
    }
  )
);
