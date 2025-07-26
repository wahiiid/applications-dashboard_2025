import { create } from "zustand";

import Keycloak, { KeycloakProfile } from "keycloak-js";

const kc = new Keycloak({
  url: "https://keycloak.nablainfotech.com",
  clientId: "applications-dashboard",
  realm: "Applications",
});

export type AuthState = {
  authenticated: boolean | undefined;
  keyCloakInitialized: Keycloak;
  keyCloakLoginStatus: boolean | undefined;
  token: string | undefined;
  LoggedUserProfile: KeycloakProfile | undefined;
};

export type SetAuthState = {
  setAuthenticated: (authenticated: AuthState["authenticated"]) => void;
  setKeyCloakInitialized: (
    KeyCloakInitialized: AuthState["keyCloakInitialized"],
  ) => void;
  setKeyCloakLoginStatus: (
    keyCloakLoginStatus: AuthState["keyCloakLoginStatus"],
  ) => void;
  setLoggedUserProfile: (
    LoggedUserProfile: AuthState["LoggedUserProfile"],
  ) => void;
  setToken: (token: AuthState["token"]) => void;
};

export const useAuthenticationState = create<AuthState & SetAuthState>(
  (set) => ({
    authenticated: undefined,
    keyCloakInitialized: kc,
    keyCloakLoginStatus: undefined,
    token: undefined,
    LoggedUserProfile: undefined,
    setKeyCloakLoginStatus(keyCloakLoginStatus) {
      set(() => ({ keyCloakLoginStatus }));
    },
    setAuthenticated: (authenticated) => set(() => ({ authenticated })),
    setKeyCloakInitialized: (keycloak) =>
      set(() => ({ keyCloakInitialized: keycloak })),
    setToken: (token) => set({ token }),
    setLoggedUserProfile: (LoggedUserProfile) => set({ LoggedUserProfile }),
  }),
);
