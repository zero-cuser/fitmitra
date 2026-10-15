/**
 * FitMitra Phase 34: Account Deletion Failure Handling Regression Tests
 *
 * Verifies that failed or rejected remote account deletion does NOT:
 *  1. Report false success to the UI or user.
 *  2. Wipe local user data, workouts, meals, or profile.
 *  3. Invalidate or reset user session state prematurely.
 *
 * Verifies that genuine successful deletions correctly:
 *  1. Follow the intended cleanup path.
 *  2. Differentiate between remote-only and full local wipe.
 *  3. Update UI feedback and close the deletion modal.
 */

import { describe, it, beforeEach, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { STORAGE_KEYS, wipeAllLocalData, safeSetItem, safeGetItem } from '../src/utils/storageSafety.ts';
import { WebRemoteAuthRepository } from '../src/platform/web/WebRemoteAuthRepository.ts';
import { RepositoryError } from '../src/domain/repositories/interfaces.ts';
import type { AccountDeletionResult, AuthSession } from '../src/domain/models/sync.ts';
import { MockLocalStorage } from './mocks/browserMocks.ts';
import { createServer, type ServerInstance } from '../src/server/server.ts';
import { Database } from '../src/server/db.ts';

describe('Phase 34: Account Deletion Failure Handling & Storage Protection', () => {
  let mockStorage: MockLocalStorage;

  beforeEach(() => {
    mockStorage = new MockLocalStorage();
    (global as any).window = {
      localStorage: mockStorage
    };
  });

  // --------------------------------------------------------------------------
  // 1. REPOSITORY LEVEL TESTS: WebRemoteAuthRepository Error Contracts
  // --------------------------------------------------------------------------
  describe('WebRemoteAuthRepository.deleteAccount', () => {
    let serverInstance: ServerInstance;
    let testDb: Database;

    before(async () => {
      testDb = new Database();
      serverInstance = await createServer(testDb);
    });

    after(async () => {
      await serverInstance.close();
    });

    beforeEach(() => {
      testDb.reset();
    });

    it('rejects with NotAuthenticated if no active session exists', async () => {
      const repo = new WebRemoteAuthRepository(serverInstance.url);
      await assert.rejects(
        async () => {
          await repo.deleteAccount('any_password');
        },
        (err: any) => {
          assert.ok(err instanceof RepositoryError);
          assert.equal(err.code, 'NotAuthenticated');
          return true;
        }
      );
    });

    it('rejects with PermissionDenied when password verification fails (403), without wiping local data', async () => {
      // 1. Seed user in test database
      const regRes = await fetch(`${serverInstance.url}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'student_del_fail@campus.edu',
          password: 'correct_password_123',
          displayName: 'Test Student',
          username: 'student_del_fail'
        })
      });
      const regData = await regRes.json();
      assert.equal(regRes.status, 201);

      // 2. Set up local storage with session and valuable local workout data
      mockStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, regData.token);
      mockStorage.setItem(
        STORAGE_KEYS.AUTH_SESSION,
        JSON.stringify({
          token: regData.token,
          accountId: regData.account.id,
          email: regData.account.email,
          displayName: 'Test Student',
          username: 'student_del_fail',
          expiresAt: new Date(Date.now() + 86400000).toISOString()
        })
      );
      mockStorage.setItem(STORAGE_KEYS.USER_V3, JSON.stringify({ id: regData.account.id, name: 'Test Student' }));
      mockStorage.setItem(STORAGE_KEYS.WORKOUT_V3, JSON.stringify({ streak: 12, totalReps: 450 }));
      mockStorage.setItem(STORAGE_KEYS.NUTRITION_V3, JSON.stringify([{ meal: 'Oatmeal', calories: 350 }]));

      const repo = new WebRemoteAuthRepository(serverInstance.url);

      // 3. Attempt account deletion with incorrect password
      await assert.rejects(
        async () => {
          await repo.deleteAccount('wrong_password_999', false);
        },
        (err: any) => {
          assert.ok(err instanceof RepositoryError);
          assert.equal(err.code, 'PermissionDenied');
          assert.ok(err.message.includes('Password verification failed'));
          return true;
        }
      );

      // 4. CRITICAL ASSERTION: Local data must NOT have been wiped
      assert.ok(mockStorage.getItem(STORAGE_KEYS.USER_V3), 'User profile must remain intact');
      assert.ok(mockStorage.getItem(STORAGE_KEYS.WORKOUT_V3), 'Workout progress must remain intact');
      assert.ok(mockStorage.getItem(STORAGE_KEYS.NUTRITION_V3), 'Nutrition history must remain intact');
      assert.ok(mockStorage.getItem(STORAGE_KEYS.AUTH_TOKEN), 'Auth token must remain intact');
    });

    it('rejects with ServerError if the backend is unreachable or returns 500, without wiping local data', async () => {
      // Point repository to an unroutable port
      const deadRepo = new WebRemoteAuthRepository('http://127.0.0.1:59999');

      mockStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, 'dummy_token');
      mockStorage.setItem(
        STORAGE_KEYS.AUTH_SESSION,
        JSON.stringify({
          token: 'dummy_token',
          accountId: 'acc_offline',
          email: 'offline@campus.edu',
          displayName: 'Offline Student',
          username: 'offline_student',
          expiresAt: new Date(Date.now() + 86400000).toISOString()
        })
      );
      mockStorage.setItem(STORAGE_KEYS.WORKOUT_V3, JSON.stringify({ streak: 5 }));

      await assert.rejects(
        async () => {
          await deadRepo.deleteAccount('password_123', false);
        },
        (err: any) => {
          assert.ok(err instanceof RepositoryError);
          assert.equal(err.code, 'ServerError');
          return true;
        }
      );

      // Verify local data is completely untouched
      assert.ok(mockStorage.getItem(STORAGE_KEYS.WORKOUT_V3), 'Workout data must not be destroyed on network error');
    });

    it('successfully purges local data and deletes remote account when password is valid and deleteRemoteDataOnly is false', async () => {
      // 1. Seed user in test database
      const regRes = await fetch(`${serverInstance.url}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'student_del_success@campus.edu',
          password: 'valid_password_456',
          displayName: 'Deleting Student',
          username: 'student_del_success'
        })
      });
      const regData = await regRes.json();

      mockStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, regData.token);
      mockStorage.setItem(
        STORAGE_KEYS.AUTH_SESSION,
        JSON.stringify({
          token: regData.token,
          accountId: regData.account.id,
          email: regData.account.email,
          displayName: 'Deleting Student',
          username: 'student_del_success',
          expiresAt: new Date(Date.now() + 86400000).toISOString()
        })
      );
      mockStorage.setItem(STORAGE_KEYS.WORKOUT_V3, JSON.stringify({ streak: 10 }));

      const repo = new WebRemoteAuthRepository(serverInstance.url);
      const res = await repo.deleteAccount('valid_password_456', false);

      assert.equal(res.success, true);
      assert.equal(res.remoteDataDeleted, true);
      assert.equal(res.localDataDeleted, true);

      // Verify local storage is purged
      assert.equal(mockStorage.getItem(STORAGE_KEYS.WORKOUT_V3), null);
      assert.equal(mockStorage.getItem(STORAGE_KEYS.AUTH_TOKEN), null);

      // Verify remote database purged
      assert.equal(testDb.getAccountById(regData.account.id), null);
    });

    it('successfully retains local data when deleteRemoteDataOnly is true and remote deletion succeeds', async () => {
      const regRes = await fetch(`${serverInstance.url}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'student_remote_only@campus.edu',
          password: 'remote_pass_789',
          displayName: 'Retaining Student',
          username: 'student_remote_only'
        })
      });
      const regData = await regRes.json();

      mockStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, regData.token);
      mockStorage.setItem(
        STORAGE_KEYS.AUTH_SESSION,
        JSON.stringify({
          token: regData.token,
          accountId: regData.account.id,
          email: regData.account.email,
          displayName: 'Retaining Student',
          username: 'student_remote_only',
          expiresAt: new Date(Date.now() + 86400000).toISOString()
        })
      );
      mockStorage.setItem(STORAGE_KEYS.WORKOUT_V3, JSON.stringify({ reps: 50 }));

      const repo = new WebRemoteAuthRepository(serverInstance.url);
      const res = await repo.deleteAccount('remote_pass_789', true);

      assert.equal(res.success, true);
      assert.equal(res.remoteDataDeleted, true);
      assert.equal(res.localDataDeleted, false);

      // Remote tokens removed
      assert.equal(mockStorage.getItem(STORAGE_KEYS.AUTH_TOKEN), null);
      assert.equal(mockStorage.getItem(STORAGE_KEYS.AUTH_SESSION), null);
      // Local workout data preserved
      assert.ok(mockStorage.getItem(STORAGE_KEYS.WORKOUT_V3), 'Local workout data preserved when deleteRemoteDataOnly=true');
    });

    const createMockHttpServer = (handler: (req: http.IncomingMessage, res: http.ServerResponse) => void): Promise<{ url: string; close: () => Promise<void> }> => {
      return new Promise((resolve) => {
        const server = http.createServer(handler);
        server.listen(0, '127.0.0.1', () => {
          const addr = server.address() as any;
          resolve({
            url: `http://127.0.0.1:${addr.port}`,
            close: () => new Promise<void>((res) => server.close(() => res()))
          });
        });
      });
    };

    it('rejects with ServerError when server returns 200 with malformed JSON, without wiping local data', async () => {
      const mockServer = await createMockHttpServer((_req, res) => {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('<html><head><title>502 Bad Gateway</title></head><body>Bad Gateway</body></html>');
      });

      try {
        mockStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, 'tok_test');
        mockStorage.setItem(
          STORAGE_KEYS.AUTH_SESSION,
          JSON.stringify({
            token: 'tok_test',
            accountId: 'acc_malformed',
            email: 'malformed@campus.edu',
            displayName: 'Malformed Test',
            username: 'malformed_test',
            expiresAt: new Date(Date.now() + 86400000).toISOString()
          })
        );
        mockStorage.setItem(STORAGE_KEYS.WORKOUT_V3, JSON.stringify({ streak: 9 }));

        const repo = new WebRemoteAuthRepository(mockServer.url);
        await assert.rejects(
          async () => {
            await repo.deleteAccount('any_pass', false);
          },
          (err: any) => {
            assert.ok(err instanceof RepositoryError);
            assert.equal(err.code, 'ServerError');
            assert.ok(err.message.includes('Malformed or non-JSON response'));
            return true;
          }
        );

        // Local data preserved!
        assert.ok(mockStorage.getItem(STORAGE_KEYS.WORKOUT_V3), 'Workout data must not be wiped on malformed response');
        assert.ok(mockStorage.getItem(STORAGE_KEYS.AUTH_TOKEN), 'Auth token must not be wiped on malformed response');
      } finally {
        await mockServer.close();
      }
    });

    it('rejects with Unknown when server returns 200 with success: false, without wiping local data', async () => {
      const mockServer = await createMockHttpServer((_req, res) => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Database transaction failed during cascade purge.' }));
      });

      try {
        mockStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, 'tok_test2');
        mockStorage.setItem(
          STORAGE_KEYS.AUTH_SESSION,
          JSON.stringify({
            token: 'tok_test2',
            accountId: 'acc_failed_200',
            email: 'failed200@campus.edu',
            displayName: 'Failed 200 Test',
            username: 'failed200_test',
            expiresAt: new Date(Date.now() + 86400000).toISOString()
          })
        );
        mockStorage.setItem(STORAGE_KEYS.WORKOUT_V3, JSON.stringify({ streak: 15 }));

        const repo = new WebRemoteAuthRepository(mockServer.url);
        await assert.rejects(
          async () => {
            await repo.deleteAccount('any_pass', false);
          },
          (err: any) => {
            assert.ok(err instanceof RepositoryError);
            assert.equal(err.code, 'Unknown');
            assert.ok(err.message.includes('Database transaction failed during cascade purge.'));
            return true;
          }
        );

        // Local data preserved!
        assert.ok(mockStorage.getItem(STORAGE_KEYS.WORKOUT_V3), 'Workout data must not be wiped when success: false on 200');
        assert.ok(mockStorage.getItem(STORAGE_KEYS.AUTH_TOKEN), 'Auth token must not be wiped when success: false on 200');
      } finally {
        await mockServer.close();
      }
    });

    it('rejects with NotFound and recovery guidance on ambiguous 404 retry, without wiping local data', async () => {
      // 1. Seed user in test database
      const regRes = await fetch(`${serverInstance.url}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'student_retry_404@campus.edu',
          password: 'pass_404_retry',
          displayName: 'Retry Student',
          username: 'student_retry_404'
        })
      });
      const regData = await regRes.json();

      // 2. Perform deletion on database directly (simulating successful previous deletion whose response was lost)
      await testDb.deleteAccountCascade(regData.account.id);

      // 3. User attempts deletion again with existing session
      mockStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, regData.token);
      mockStorage.setItem(
        STORAGE_KEYS.AUTH_SESSION,
        JSON.stringify({
          token: regData.token,
          accountId: regData.account.id,
          email: regData.account.email,
          displayName: 'Retry Student',
          username: 'student_retry_404',
          expiresAt: new Date(Date.now() + 86400000).toISOString()
        })
      );
      mockStorage.setItem(STORAGE_KEYS.WORKOUT_V3, JSON.stringify({ streak: 20 }));

      const repo = new WebRemoteAuthRepository(serverInstance.url);
      await assert.rejects(
        async () => {
          await repo.deleteAccount('pass_404_retry', false);
        },
        (err: any) => {
          assert.ok(err instanceof RepositoryError);
          assert.equal(err.code, 'NotFound');
          assert.ok(err.message.includes('Account not found or may have already been deleted'));
          assert.ok(err.message.includes('Wipe All Local Data'));
          return true;
        }
      );

      // Verify local data is NOT wiped prematurely
      assert.ok(mockStorage.getItem(STORAGE_KEYS.WORKOUT_V3), 'Workout data must not be wiped on 404 retry');
      assert.ok(mockStorage.getItem(STORAGE_KEYS.AUTH_TOKEN), 'Auth token must not be wiped on 404 retry');
    });
  });

  // --------------------------------------------------------------------------
  // 2. CONTEXT LEVEL TESTS: AuthContext deleteAccount Error Handling
  // --------------------------------------------------------------------------
  describe('AuthContext deleteAccount Contract', () => {
    // Harness replicating AuthContext.deleteAccount logic
    const createAuthContextHarness = (
      fakeAuthRepo: {
        deleteAccount: (pwd: string, remoteOnly?: boolean) => Promise<AccountDeletionResult>;
      },
      fakeDisableSync?: () => Promise<void>
    ) => {
      let currentUser: any = { id: 'usr_active', name: 'Active Student' };
      let isSyncDisabled = false;

      const disableSync = fakeDisableSync || (async () => {
        isSyncDisabled = true;
      });

      const deleteAccount = async (
        password: string,
        deleteRemoteDataOnly = false
      ): Promise<AccountDeletionResult> => {
        let result: AccountDeletionResult;
        try {
          result = await fakeAuthRepo.deleteAccount(password, deleteRemoteDataOnly);
        } catch (err: any) {
          const errorMessage =
            err instanceof Error ? err.message : 'Failed to delete account. Please verify password.';
          return {
            success: false,
            remoteDataDeleted: false,
            localDataDeleted: false,
            accountId: currentUser?.id || '',
            error: errorMessage
          };
        }

        if (result.success) {
          currentUser = null;
          try {
            await disableSync();
          } catch (syncErr: any) {
            console.error('[AuthContext] Error disabling sync after confirmed deletion:', syncErr);
            return {
              ...result,
              error: 'Remote account deleted, but an error occurred while resetting local sync settings.'
            };
          }
        }

        return result;
      };

      return {
        deleteAccount,
        getUser: () => currentUser,
        isSyncDisabled: () => isSyncDisabled
      };
    };

    it('returns success: false and preserves local data when repository throws an error', async () => {
      // Seed user and workout data in local storage
      mockStorage.setItem(STORAGE_KEYS.USER_V3, JSON.stringify({ id: 'usr_active' }));
      mockStorage.setItem(STORAGE_KEYS.WORKOUT_V3, JSON.stringify({ streak: 7 }));

      const mockRepo = {
        deleteAccount: async (_pwd: string, _remoteOnly?: boolean): Promise<AccountDeletionResult> => {
          throw new RepositoryError('PermissionDenied', 'Password verification failed. Account deletion aborted.');
        }
      };

      const harness = createAuthContextHarness(mockRepo);
      const res = await harness.deleteAccount('wrong_pass', false);

      // 1. Must report failure
      assert.equal(res.success, false, 'Result must be false on repository rejection');
      assert.equal(res.remoteDataDeleted, false);
      assert.equal(res.localDataDeleted, false);
      assert.equal(res.error, 'Password verification failed. Account deletion aborted.');

      // 2. Must NOT set user to null
      assert.ok(harness.getUser(), 'User state must NOT be cleared on failed deletion');
      assert.equal(harness.isSyncDisabled(), false, 'Sync must NOT be disabled on failed deletion');

      // 3. Must NOT wipe local storage
      assert.ok(mockStorage.getItem(STORAGE_KEYS.USER_V3), 'Local user profile must remain intact');
      assert.ok(mockStorage.getItem(STORAGE_KEYS.WORKOUT_V3), 'Local workout progress must remain intact');
    });

    it('returns success: false when repository returns success: false without throwing', async () => {
      mockStorage.setItem(STORAGE_KEYS.WORKOUT_V3, JSON.stringify({ streak: 3 }));

      const mockRepo = {
        deleteAccount: async (_pwd: string, _remoteOnly?: boolean): Promise<AccountDeletionResult> => {
          return {
            success: false,
            remoteDataDeleted: false,
            localDataDeleted: false,
            accountId: 'usr_active',
            error: 'Account deletion rejected by server.'
          };
        }
      };

      const harness = createAuthContextHarness(mockRepo);
      const res = await harness.deleteAccount('invalid_pass');

      assert.equal(res.success, false);
      assert.ok(harness.getUser(), 'User state must remain intact');
      assert.ok(mockStorage.getItem(STORAGE_KEYS.WORKOUT_V3), 'Local data preserved');
    });

    it('returns success: true and resets session when repository resolves successfully', async () => {
      mockStorage.setItem(STORAGE_KEYS.WORKOUT_V3, JSON.stringify({ streak: 3 }));

      const mockRepo = {
        deleteAccount: async (_pwd: string, remoteOnly = false): Promise<AccountDeletionResult> => {
          if (!remoteOnly) {
            wipeAllLocalData();
          }
          return {
            success: true,
            remoteDataDeleted: true,
            localDataDeleted: !remoteOnly,
            accountId: 'usr_active'
          };
        }
      };

      const harness = createAuthContextHarness(mockRepo);
      const res = await harness.deleteAccount('correct_pass', false);

      assert.equal(res.success, true);
      assert.equal(res.remoteDataDeleted, true);
      assert.equal(res.localDataDeleted, true);
      assert.equal(harness.getUser(), null, 'User state must be cleared on success');
      assert.equal(harness.isSyncDisabled(), true, 'Sync must be disabled on success');
      assert.equal(mockStorage.getItem(STORAGE_KEYS.WORKOUT_V3), null, 'Local data wiped on full delete');
    });

    it('retains remoteDataDeleted: true and resets user state when disableSync throws after confirmed remote deletion', async () => {
      mockStorage.setItem(STORAGE_KEYS.WORKOUT_V3, JSON.stringify({ streak: 10 }));

      const mockRepo = {
        deleteAccount: async (_pwd: string, remoteOnly = false): Promise<AccountDeletionResult> => {
          if (!remoteOnly) {
            wipeAllLocalData();
          }
          return {
            success: true,
            remoteDataDeleted: true,
            localDataDeleted: !remoteOnly,
            accountId: 'usr_active'
          };
        }
      };

      const failingDisableSync = async () => {
        throw new Error('Sync storage lock failed');
      };

      const harness = createAuthContextHarness(mockRepo, failingDisableSync);
      const res = await harness.deleteAccount('valid_pass', false);

      assert.equal(res.success, true, 'Overall deletion remains successful');
      assert.equal(res.remoteDataDeleted, true, 'Remote deletion MUST remain true');
      assert.equal(res.localDataDeleted, true, 'Local data deletion MUST remain true');
      assert.equal(harness.getUser(), null, 'User state must be cleared');
      assert.ok(res.error?.includes('Remote account deleted, but an error occurred while resetting local sync settings.'));
    });
  });

  // --------------------------------------------------------------------------
  // 3. UI LEVEL TESTS: ProfileView Deletion Handler Behavior
  // --------------------------------------------------------------------------
  describe('ProfileView Account Deletion Handler Logic', () => {
    it('does NOT close modal or show success feedback when deletion fails', async () => {
      let showDeleteModal = true;
      let deletePassword = 'wrong_password';
      let deleteError: string | null = null;
      let privacyFeedback: { text: string; type: 'success' | 'danger' } | null = null;

      // Simulated handleConfirmAccountDeletion from ProfileView.tsx
      const handleConfirmAccountDeletion = async (
        deleteAccountFn: (pwd: string, remoteOnly: boolean) => Promise<AccountDeletionResult>,
        remoteOnly: boolean
      ) => {
        try {
          const res = await deleteAccountFn(deletePassword, remoteOnly);
          if (res.success) {
            showDeleteModal = false;
            deletePassword = '';
            deleteError = null;
            privacyFeedback = {
              text: res.error
                ? res.error
                : remoteOnly
                ? 'Remote cloud data deleted successfully. Local device data retained.'
                : 'Account and all data wiped permanently.',
              type: 'success'
            };
          } else {
            const errorText = res.error || 'Failed to delete account. Please verify password.';
            deleteError = errorText;
            privacyFeedback = {
              text: errorText,
              type: 'danger'
            };
          }
        } catch (err: any) {
          const errorText = err?.message || 'Failed to delete account. Please verify password.';
          deleteError = errorText;
          privacyFeedback = { text: errorText, type: 'danger' };
        }
      };

      // 1. Test failed deletion (wrong password / failure result)
      await handleConfirmAccountDeletion(async () => ({
        success: false,
        remoteDataDeleted: false,
        localDataDeleted: false,
        accountId: '',
        error: 'Password verification failed. Account deletion aborted.'
      }), false);

      assert.equal(showDeleteModal, true, 'Modal must remain open on deletion failure');
      assert.equal(deleteError, 'Password verification failed. Account deletion aborted.');
      assert.equal(privacyFeedback?.type, 'danger');
      assert.equal(privacyFeedback?.text, 'Password verification failed. Account deletion aborted.');

      // 2. Test successful deletion (valid password)
      deletePassword = 'valid_password';
      await handleConfirmAccountDeletion(async () => ({
        success: true,
        remoteDataDeleted: true,
        localDataDeleted: true,
        accountId: 'usr_123'
      }), false);

      assert.equal(showDeleteModal, false, 'Modal must close on deletion success');
      assert.equal(deletePassword, '', 'Password input must be cleared on success');
      assert.equal(deleteError, null, 'Error must be cleared on success');
      assert.equal(privacyFeedback?.type, 'success');
      assert.equal(privacyFeedback?.text, 'Account and all data wiped permanently.');
    });

    it('displays cleanup warning notice while closing modal when res.error is present on successful deletion', async () => {
      let showDeleteModal = true;
      let deletePassword = 'valid_password';
      let deleteError: string | null = null;
      let privacyFeedback: { text: string; type: 'success' | 'danger' } | null = null;

      const handleConfirmAccountDeletion = async (
        deleteAccountFn: (pwd: string, remoteOnly: boolean) => Promise<AccountDeletionResult>,
        remoteOnly: boolean
      ) => {
        try {
          const res = await deleteAccountFn(deletePassword, remoteOnly);
          if (res.success) {
            showDeleteModal = false;
            deletePassword = '';
            deleteError = null;
            privacyFeedback = {
              text: res.error
                ? res.error
                : remoteOnly
                ? 'Remote cloud data deleted successfully. Local device data retained.'
                : 'Account and all data wiped permanently.',
              type: 'success'
            };
          } else {
            const errorText = res.error || 'Failed to delete account. Please verify password.';
            deleteError = errorText;
            privacyFeedback = { text: errorText, type: 'danger' };
          }
        } catch (err: any) {
          const errorText = err?.message || 'Failed to delete account. Please verify password.';
          deleteError = errorText;
          privacyFeedback = { text: errorText, type: 'danger' };
        }
      };

      await handleConfirmAccountDeletion(async () => ({
        success: true,
        remoteDataDeleted: true,
        localDataDeleted: true,
        accountId: 'usr_123',
        error: 'Remote account deleted, but an error occurred while resetting local sync settings.'
      }), false);

      assert.equal(showDeleteModal, false, 'Modal must close on deletion success');
      assert.equal(deletePassword, '', 'Password must be cleared');
      assert.equal(deleteError, null, 'deleteError must be null');
      assert.equal(privacyFeedback?.type, 'success');
      assert.equal(privacyFeedback?.text, 'Remote account deleted, but an error occurred while resetting local sync settings.');
    });
  });
});
