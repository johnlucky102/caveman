# Bugfix Requirements Document

## Introduction

The kindergarten management system experiences a critical authentication deadlock that leaves users stuck in loading state after successful email login. The root cause is in `src/stores/authStore.ts` where `supabase.auth.onAuthStateChange` performs async profile hydration (`fetchMyProfile`) inside the auth callback, causing the app to hang or deadlock. Additionally, MainLayout implements an 8-second fail-safe timeout that forces logout, and RoleGuard can create redirect loops when role validation fails on the root path.

This bugfix ensures login always progresses to the dashboard with minimal session data first, while profile data loads in the background. It also fixes loading state management across auth initialization, MainLayout, and RoleGuard to prevent infinite loading and redirect loops.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN user successfully logs in with email/password THEN the system hangs in loading state indefinitely due to async `fetchMyProfile` blocking the auth callback

1.2 WHEN `onAuthStateChange` callback executes with 'SIGNED_IN' event THEN the system performs async Supabase queries inside the callback causing deadlock or race conditions

1.3 WHEN auth initialization takes longer than 8 seconds THEN MainLayout's fail-safe timer forces logout even if authentication is valid

1.4 WHEN MainLayout mounts multiple times THEN `initializeAuth()` runs repeatedly creating initialization loops

1.5 WHEN authenticated user has missing or invalid role on root path `/` THEN RoleGuard redirects to `/` creating an infinite redirect loop

1.6 WHEN `onAuthStateChange` callback encounters errors THEN `isLoading` may remain `true` leaving app stuck in loading screen

1.7 WHEN profile fetch fails or times out THEN auth state never transitions to usable state with minimal session data

1.8 WHEN basic pages (dashboard, students, classes, attendance, fees) load data THEN infinite loading occurs without timeout or error handling

### Expected Behavior (Correct)

2.1 WHEN user successfully logs in with email/password THEN the system SHALL immediately set usable auth state (user, session, role from metadata) synchronously and transition to dashboard

2.2 WHEN `onAuthStateChange` callback executes with 'SIGNED_IN' event THEN the system SHALL apply session data synchronously using a helper function `applySession(session)` that sets user, session, and role from user_metadata without async operations

2.3 WHEN auth initialization completes (success or failure) THEN the system SHALL always set `isLoading: false` to prevent stuck loading states

2.4 WHEN MainLayout mounts THEN the system SHALL call `initializeAuth()` only once if auth store is not already initialized, tracked by `hasInitialized` flag or `authStatus: 'idle' | 'loading' | 'ready'`

2.5 WHEN authenticated user has missing or invalid role on root path `/` THEN RoleGuard SHALL show forbidden/unauthorized state instead of redirecting to `/`

2.6 WHEN `onAuthStateChange` callback encounters any error THEN the system SHALL set `isLoading: false` and handle error gracefully

2.7 WHEN profile fetch is initiated THEN the system SHALL run `fetchMyProfile` as background hydration after auth state is usable, not blocking auth callback

2.8 WHEN basic pages (dashboard, students, classes, attendance, fees) load data THEN the system SHALL implement timeout and error handling to show empty state or error toast instead of infinite loading

2.9 WHEN login flow completes THEN MainLayout SHALL remove the 8-second fail-safe timer that forces logout

### Unchanged Behavior (Regression Prevention)

3.1 WHEN user logs out THEN the system SHALL CONTINUE TO clear all auth state (user, session, profile, role) and redirect to login

3.2 WHEN unauthenticated user accesses protected routes THEN the system SHALL CONTINUE TO redirect to `/login`

3.3 WHEN authenticated user with valid role accesses allowed routes THEN RoleGuard SHALL CONTINUE TO render the protected content

3.4 WHEN auth state changes due to token refresh or external session changes THEN the system SHALL CONTINUE TO update auth state via `onAuthStateChange` listener

3.5 WHEN user has valid session with profile data THEN the system SHALL CONTINUE TO display user profile information in UI components

3.6 WHEN basic pages successfully load data THEN the system SHALL CONTINUE TO display data in tables and cards as before

3.7 WHEN CRUD operations (create, update, delete) are performed on classes, students, attendance, fees THEN the system SHALL CONTINUE TO function as implemented
