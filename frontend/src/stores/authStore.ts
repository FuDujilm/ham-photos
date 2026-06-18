import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  token: string | null;
  username: string | null;
  isAuthenticated: boolean;
  login: (token: string, username: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      username: null,
      isAuthenticated: false,
      login: (token, username) => {
        localStorage.setItem('auth_token', token);
        localStorage.setItem('auth_username', username);
        set({ token, username, isAuthenticated: true });
      },
      logout: () => {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_username');
        set({ token: null, username: null, isAuthenticated: false });
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);
