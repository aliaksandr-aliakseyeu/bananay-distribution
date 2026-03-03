import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { dcAuthApi } from '../api/dc-auth';

const STORAGE_KEY = 'dc-auth-storage';

interface DcAuthState {
  token: string | null;
  refreshToken: string | null;
  phone: string | null;
  isNewUser: boolean | null;
  isAuthenticated: boolean;
  _hasHydrated: boolean;
  requestOtp: (phone_e164: string) => Promise<void>;
  verifyOtp: (phone_e164: string, code: string) => Promise<void>;
  logout: () => void;
}

export const useDcAuthStore = create<DcAuthState>()(
  persist(
    (set) => ({
      token: null,
      refreshToken: null,
      phone: null,
      isNewUser: null,
      isAuthenticated: false,
      _hasHydrated: false,

      requestOtp: async (phone_e164: string) => {
        await dcAuthApi.requestOtp(phone_e164);
      },

      verifyOtp: async (phone_e164: string, code: string) => {
        const data = await dcAuthApi.verifyOtp(phone_e164, code);
        set({
          token: data.access_token,
          refreshToken: data.refresh_token,
          phone: phone_e164,
          isNewUser: data.is_new_user,
          isAuthenticated: true,
        });
      },

      logout: () =>
        set({
          token: null,
          refreshToken: null,
          phone: null,
          isNewUser: null,
          isAuthenticated: false,
        }),
    }),
    {
      name: STORAGE_KEY,
      partialize: (s) => ({
        token: s.token,
        refreshToken: s.refreshToken,
        phone: s.phone,
        isNewUser: s.isNewUser,
        isAuthenticated: s.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) state._hasHydrated = true;
      },
    }
  )
);
