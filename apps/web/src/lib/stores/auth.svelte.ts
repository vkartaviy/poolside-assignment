/**
 * Authentication store - manages user identity and session state.
 *
 * Simple state model:
 * - loading: app starting, checking for existing session
 * - ready: user loaded, app is usable
 * - error: bootstrap failed (network error, etc.)
 * - session-expired: got 401, user needs to refresh
 *
 * User being non-null means authenticated.
 */
import { writable, derived } from 'svelte/store';
import type { User } from '@poolside/core';

export type AuthStatus = 'loading' | 'ready' | 'error' | 'session-expired';

export interface AuthState {
  user: User | null;
  status: AuthStatus;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  status: 'loading',
  error: null,
};

export const authStore = writable<AuthState>({ ...initialState });

// Derived stores for convenient access
export const currentUser = derived(authStore, ($auth) => $auth.user);
export const isAuthenticated = derived(authStore, ($auth) => $auth.user !== null);

/** Set user after successful bootstrap */
export function setUser(user: User): void {
  authStore.update((state) => ({
    ...state,
    user,
    status: 'ready',
    error: null,
  }));
}

/** Mark as ready */
export function setReady(): void {
  authStore.update((state) => ({ ...state, status: 'ready' }));
}

/** Mark as error */
export function setError(error: string): void {
  authStore.update((state) => ({
    ...state,
    status: 'error',
    error,
  }));
}

/** Mark session as expired (e.g., after 401 response) */
export function setSessionExpired(): void {
  authStore.update((state) => ({
    ...state,
    user: null,
    status: 'session-expired',
  }));
}
