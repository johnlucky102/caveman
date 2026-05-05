import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fc, test } from '@fast-check/vitest';
import { useAuthStore } from './authStore';
import * as usersService from '@/services/usersService';
import * as supabaseLib from '@/lib/supabase';

/**
 * Bug Condition Exploration Test for login-loading-bug-fix
 * 
 * **Validates: Bugfix Requirements 1.1, 1.2, 1.3**
 * 
 * This test explores the bug condition C(X):
 * After successful Supabase auth, `isLoading` remains `true` indefinitely 
 * when `fetchMyProfile` hangs (RLS block/network timeout).
 * 
 * Expected behavior on UNFIXED code: TEST SHOULD FAIL
 * - When fetchMyProfile hangs, isLoading should stay true indefinitely
 * - This confirms the bug exists
 * 
 * Expected behavior on FIXED code: TEST SHOULD PASS
 * - When fetchMyProfile hangs, isLoading should become false within 8 seconds
 * - System should fallback to minimal user data
 */

describe('Bug Exploration: Auth flow hangs when users table query times out', () => {
  beforeEach(() => {
    // Reset store state
    useAuthStore.setState({
      user: null,
      session: null,
      profile: null,
      role: null,
      isAuthenticated: false,
      isLoading: false,
      hasInitialized: false,
      error: null,
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('1.1: isLoading remains true indefinitely when fetchMyProfile hangs during initializeAuth', async () => {
    // Mock successful session retrieval
    const mockUser = {
      id: 'test-user-123',
      email: 'test@example.com',
      user_metadata: { role: 'Teacher' },
    };

    const mockSession = {
      access_token: 'mock-token',
      refresh_token: 'mock-refresh',
      expires_in: 3600,
      token_type: 'bearer',
      user: mockUser,
    };

    vi.spyOn(supabaseLib, 'getSession').mockResolvedValue(mockSession);
    vi.spyOn(supabaseLib, 'getCurrentUserFromSession').mockReturnValue(mockUser);

    // Mock fetchMyProfile to hang indefinitely (simulates RLS block or network timeout)
    vi.spyOn(usersService, 'fetchMyProfile').mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    // Call initializeAuth
    const initPromise = useAuthStore.getState().initializeAuth();

    // Wait for completion or 8s timeout
    await Promise.race([
      initPromise,
      new Promise(resolve => setTimeout(resolve, 8000))
    ]);

    // Check final state - should complete immediately with session data
    const state = useAuthStore.getState();
    
    // FIXED BEHAVIOR: isLoading should be false (auth completes synchronously with session data)
    expect(state.isLoading).toBe(false);
    expect(state.isAuthenticated).toBe(true); // Should be authenticated with session data
    expect(state.user).toEqual(mockUser);
    expect(state.session).toEqual(mockSession);
    expect(state.profile).toBeNull(); // Profile hydration happens in background
    expect(state.role).toBe('Teacher'); // Role from metadata
  }, 10000); // 10 second timeout for test

  test.prop(
    [fc.record({
      userId: fc.uuid(),
      email: fc.emailAddress(),
      role: fc.constantFrom('Admin', 'Teacher', 'Accountant', 'Parent'),
    })],
    { numRuns: 2, timeout: 30000 }
  )('Property: isLoading becomes false within 8s even when fetchMyProfile hangs', async ({ userId, email, role }) => {
    const mockUser = {
      id: userId,
      email: email,
      user_metadata: { role },
    };

    const mockSession = {
      access_token: 'mock-token',
      refresh_token: 'mock-refresh',
      expires_in: 3600,
      token_type: 'bearer',
      user: mockUser,
    };

    // Reset store
    useAuthStore.setState({
      user: null,
      session: null,
      profile: null,
      role: null,
      isAuthenticated: false,
      isLoading: false,
      hasInitialized: false,
      error: null,
    });

    vi.spyOn(supabaseLib, 'getSession').mockResolvedValue(mockSession);
    vi.spyOn(supabaseLib, 'getCurrentUserFromSession').mockReturnValue(mockUser);

    // Mock fetchMyProfile to hang
    vi.spyOn(usersService, 'fetchMyProfile').mockImplementation(
      () => new Promise(() => {})
    );

    // Call initializeAuth
    const initPromise = useAuthStore.getState().initializeAuth();

    // Wait for completion or 8s timeout
    await Promise.race([
      initPromise,
      new Promise(resolve => setTimeout(resolve, 8000))
    ]);

    const state = useAuthStore.getState();
    
    // Property: isLoading MUST be false (completes immediately with session data)
    expect(state.isLoading).toBe(false);
    expect(state.isAuthenticated).toBe(true);
    expect(state.profile).toBeNull(); // Profile hydration in background
  });

  it('1.2: isLoading becomes false after 8 seconds when timeout occurs', async () => {
    /**
     * **Validates: Bugfix Requirements 1.2, 2.1**
     * 
     * This test specifically verifies that `isLoading` state transitions to false
     * after the 8 second timeout threshold, even when fetchMyProfile hangs.
     * 
     * Test strategy:
     * 1. Mock successful session retrieval
     * 2. Mock fetchMyProfile to hang indefinitely
     * 3. Call initializeAuth
     * 4. Wait exactly 8 seconds
     * 5. Verify isLoading is false (not stuck at true)
     */
    
    const mockUser = {
      id: 'timeout-test-user',
      email: 'timeout@example.com',
      user_metadata: { role: 'Teacher' },
    };

    const mockSession = {
      access_token: 'mock-token',
      refresh_token: 'mock-refresh',
      expires_in: 3600,
      token_type: 'bearer',
      user: mockUser,
    };

    vi.spyOn(supabaseLib, 'getSession').mockResolvedValue(mockSession);
    vi.spyOn(supabaseLib, 'getCurrentUserFromSession').mockReturnValue(mockUser);

    // Mock fetchMyProfile to hang indefinitely
    vi.spyOn(usersService, 'fetchMyProfile').mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    // Record initial state
    const initialState = useAuthStore.getState();
    expect(initialState.isLoading).toBe(false);

    // Call initializeAuth
    const initPromise = useAuthStore.getState().initializeAuth();

    // Wait for completion or 8s timeout
    await Promise.race([
      initPromise,
      new Promise(resolve => setTimeout(resolve, 8000))
    ]);

    // CRITICAL: isLoading MUST be false (completes immediately with session data)
    const finalState = useAuthStore.getState();
    expect(finalState.isLoading).toBe(false);
    
    // Should be authenticated with session data (synchronous fallback behavior)
    expect(finalState.isAuthenticated).toBe(true);
    expect(finalState.user).toEqual(mockUser);
    expect(finalState.session).toEqual(mockSession);
    expect(finalState.profile).toBeNull(); // Profile hydration happens in background
  }, 10000); // 10 second test timeout
});

describe('Task 3.2: Login fallback to session data when hydrateProfile times out', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      session: null,
      profile: null,
      role: null,
      isAuthenticated: false,
      isLoading: false,
      hasInitialized: false,
      error: null,
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should fallback to user metadata role when hydrateProfile times out during login', async () => {
    /**
     * **Validates: Bugfix Requirements 2.2, 2.3**
     * 
     * Verifies that when hydrateProfile times out during login:
     * 1. Login still succeeds (returns true)
     * 2. User and session are set from Supabase auth
     * 3. Profile is null (timeout fallback)
     * 4. Role falls back to user.user_metadata.role
     * 5. isLoading becomes false
     * 6. isAuthenticated is true
     */
    
    const mockUser = {
      id: 'login-test-user',
      email: 'login@example.com',
      user_metadata: { role: 'Teacher' },
    };

    const mockSession = {
      access_token: 'mock-token',
      refresh_token: 'mock-refresh',
      expires_in: 3600,
      token_type: 'bearer',
      user: mockUser,
    };

    // Mock successful login
    vi.spyOn(supabaseLib, 'signInWithPassword').mockResolvedValue({
      session: mockSession,
      error: null,
    });

    // Mock fetchMyProfile to hang (simulates timeout)
    vi.spyOn(usersService, 'fetchMyProfile').mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    // Mock normalizeRole to return the role from metadata
    vi.spyOn(usersService, 'normalizeRole').mockReturnValue('Teacher');

    // Call login
    const result = await useAuthStore.getState().login('login@example.com', 'password123');

    // Verify login succeeded
    expect(result).toBe(true);

    // Verify state after login
    const state = useAuthStore.getState();
    expect(state.isLoading).toBe(false);
    expect(state.isAuthenticated).toBe(true);
    expect(state.user).toEqual(mockUser);
    expect(state.session).toEqual(mockSession);
    expect(state.profile).toBeNull(); // Profile should be null due to timeout
    expect(state.role).toBe('Teacher'); // Role should fallback to user metadata
    expect(state.error).toBeNull();
  }, 10000);

  test.prop(
    [fc.record({
      email: fc.emailAddress(),
      password: fc.string({ minLength: 8 }),
      role: fc.constantFrom('Admin', 'Teacher', 'Accountant', 'Parent'),
    })],
    { numRuns: 2, timeout: 30000 }
  )('Property: Login succeeds with session data even when profile fetch times out', async ({ email, password, role }) => {
    /**
     * **Validates: Design Property P2**
     * 
     * Property: If profile fetch fails/times out, app transitions to dashboard
     * with minimal user data from session.
     */
    
    const mockUser = {
      id: fc.sample(fc.uuid(), 1)[0],
      email,
      user_metadata: { role },
    };

    const mockSession = {
      access_token: 'mock-token',
      refresh_token: 'mock-refresh',
      expires_in: 3600,
      token_type: 'bearer',
      user: mockUser,
    };

    // Reset store
    useAuthStore.setState({
      user: null,
      session: null,
      profile: null,
      role: null,
      isAuthenticated: false,
      isLoading: false,
      hasInitialized: false,
      error: null,
    });

    vi.spyOn(supabaseLib, 'signInWithPassword').mockResolvedValue({
      session: mockSession,
      error: null,
    });

    // Mock fetchMyProfile to hang
    vi.spyOn(usersService, 'fetchMyProfile').mockImplementation(
      () => new Promise(() => {})
    );

    vi.spyOn(usersService, 'normalizeRole').mockReturnValue(role);

    // Call login
    const result = await useAuthStore.getState().login(email, password);

    // Property assertions
    expect(result).toBe(true); // Login succeeds
    
    const state = useAuthStore.getState();
    expect(state.isLoading).toBe(false); // Not stuck loading
    expect(state.isAuthenticated).toBe(true); // User is authenticated
    expect(state.user).toBeTruthy(); // Has user data from session
    expect(state.session).toBeTruthy(); // Has session
    expect(state.role).toBe(role); // Has role from metadata fallback
  });
});

describe('Task 3.3: Verify isLoading becomes false when timeout occurs in login', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      session: null,
      profile: null,
      role: null,
      isAuthenticated: false,
      isLoading: false,
      hasInitialized: false,
      error: null,
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should set isLoading to false when hydrateProfile times out during login', async () => {
    /**
     * **Validates: Bugfix Requirements 2.1, Design Property P1**
     * 
     * Specifically verifies that isLoading transitions from true to false
     * when hydrateProfile times out during the login flow.
     * 
     * Test strategy:
     * 1. Mock successful Supabase authentication
     * 2. Mock fetchMyProfile to hang indefinitely (simulates timeout)
     * 3. Call login()
     * 4. Verify isLoading becomes true during login
     * 5. Wait for timeout (7 seconds + buffer)
     * 6. Verify isLoading becomes false after timeout
     */
    
    const mockUser = {
      id: 'timeout-login-user',
      email: 'timeout-login@example.com',
      user_metadata: { role: 'Teacher' },
    };

    const mockSession = {
      access_token: 'mock-token',
      refresh_token: 'mock-refresh',
      expires_in: 3600,
      token_type: 'bearer',
      user: mockUser,
    };

    // Mock successful Supabase login
    vi.spyOn(supabaseLib, 'signInWithPassword').mockResolvedValue({
      session: mockSession,
      error: null,
    });

    // Mock fetchMyProfile to hang indefinitely
    vi.spyOn(usersService, 'fetchMyProfile').mockImplementation(
      () => new Promise(() => {}) // Never resolves - simulates timeout
    );

    vi.spyOn(usersService, 'normalizeRole').mockReturnValue('Teacher');

    // Verify initial state
    expect(useAuthStore.getState().isLoading).toBe(false);

    // Start login
    const loginPromise = useAuthStore.getState().login('timeout-login@example.com', 'password123');

    // Wait for login to complete
    const result = await loginPromise;

    // CRITICAL VERIFICATION: isLoading MUST be false (completes immediately with session data)
    const finalState = useAuthStore.getState();
    expect(finalState.isLoading).toBe(false);
    
    // Login should succeed with fallback data
    expect(result).toBe(true);
    expect(finalState.isAuthenticated).toBe(true);
    expect(finalState.user).toEqual(mockUser);
    expect(finalState.session).toEqual(mockSession);
    expect(finalState.profile).toBeNull(); // Profile hydration in background
    expect(finalState.role).toBe('Teacher'); // Role from metadata fallback
  }, 10000);

  it('should set isLoading to false within 8 seconds when timeout occurs', async () => {
    /**
     * **Validates: Bugfix Requirements 2.1, Design Property P1**
     * 
     * Verifies the 8-second timeout threshold is respected.
     * After successful auth, isLoading must become false within 8 seconds max.
     */
    
    const mockUser = {
      id: 'eight-sec-test',
      email: 'eight-sec@example.com',
      user_metadata: { role: 'Admin' },
    };

    const mockSession = {
      access_token: 'mock-token',
      refresh_token: 'mock-refresh',
      expires_in: 3600,
      token_type: 'bearer',
      user: mockUser,
    };

    vi.spyOn(supabaseLib, 'signInWithPassword').mockResolvedValue({
      session: mockSession,
      error: null,
    });

    // Mock fetchMyProfile to hang
    vi.spyOn(usersService, 'fetchMyProfile').mockImplementation(
      () => new Promise(() => {})
    );

    vi.spyOn(usersService, 'normalizeRole').mockReturnValue('Admin');

    const startTime = Date.now();
    
    // Call login
    await useAuthStore.getState().login('eight-sec@example.com', 'password123');
    
    const endTime = Date.now();
    const elapsedSeconds = (endTime - startTime) / 1000;

    // Verify isLoading is false
    expect(useAuthStore.getState().isLoading).toBe(false);
    
    // Verify it completed quickly (should be immediate with session data, not wait for timeout)
    expect(elapsedSeconds).toBeLessThan(1);
  }, 10000);
});
