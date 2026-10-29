import { test as base, expect } from '@playwright/test';
import { AutomationExerciseApi } from '../api/automation-exercise-api';
import { blockAds } from '../support/ad-blocking';
import { buildUser, type User } from '../support/user-factory';

interface Fixtures {
  /** Client for the site's public API, used for setup, teardown and state checks. */
  api: AutomationExerciseApi;
  /** Unique user data, not yet registered. Deleted in teardown if a test created it. */
  newUser: User;
  /** The same user as newUser, already registered through the API. */
  registeredUser: User;
}

export const test = base.extend<Fixtures>({
  // Every test gets ads and the consent dialog blocked before its first navigation.
  context: async ({ context }, use) => {
    await blockAds(context);
    await use(context);
  },

  api: async ({ request }, use) => {
    await use(new AutomationExerciseApi(request));
  },

  newUser: async ({ api }, use, testInfo) => {
    const user = buildUser(testInfo.workerIndex);
    await use(user);
    // Teardown runs whether the test passed or failed.
    await ensureAccountDeleted(api, user);
  },

  registeredUser: async ({ api, newUser }, use) => {
    await api.createAccount(newUser);
    await use(newUser);
  },
});

export { expect };

/**
 * Deletes the account if it exists and proves it is gone. deleteAccount answers 404 both
 * when the account is already gone (for example, a test deleted it through the UI) and
 * when the password is wrong, so a 404 is only accepted once a lookup confirms it.
 */
async function ensureAccountDeleted(api: AutomationExerciseApi, user: User): Promise<void> {
  const result = await api.deleteAccount(user.email, user.password);
  if (result === 'deleted') return;

  if ((await api.getUserDetailByEmail(user.email)) !== null) {
    throw new Error(
      `Teardown failed: account ${user.email} still exists. deleteAccount returned 404, ` +
        'which also happens when the stored password does not match.',
    );
  }
}
