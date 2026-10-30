import type { Locator } from '@playwright/test';
import { testData } from '../src/config/test-data';
import { expect, test } from '../src/fixtures';
import { AccountCreatedPage } from '../src/pages/account-created-page';
import { AccountDeletedPage } from '../src/pages/account-deleted-page';
import { AccountInformationPage } from '../src/pages/account-information-page';
import { Header } from '../src/pages/header';
import { SignupLoginPage } from '../src/pages/signup-login-page';
import { buildUser, type User } from '../src/support/user-factory';

interface BlockedSignupCase {
  id: string;
  title: string;
  /** Overrides the valid name and email of the generated user. */
  input: Partial<Pick<User, 'name' | 'email'>>;
  field: 'name' | 'email';
  flag: 'valueMissing' | 'typeMismatch';
}

const blockedSignupCases: BlockedSignupCase[] = [
  {
    id: 'REG-03',
    title: 'name is empty',
    input: { name: '' },
    field: 'name',
    flag: 'valueMissing',
  },
  {
    id: 'REG-04',
    title: 'email is empty',
    input: { email: '' },
    field: 'email',
    flag: 'valueMissing',
  },
  // abc@ fails the same way, so one malformed value is enough.
  {
    id: 'REG-05',
    title: 'email is malformed',
    input: { email: testData.registration.malformedEmail },
    field: 'email',
    flag: 'typeMismatch',
  },
];

test.describe('Registration', () => {
  test('REG-01 successful registration with full account details', async ({
    page,
    api,
    newUser,
  }) => {
    const signupLogin = new SignupLoginPage(page);
    const accountInformation = new AccountInformationPage(page);
    const accountCreated = new AccountCreatedPage(page);
    const header = new Header(page);

    await signupLogin.goto();
    await signupLogin.signup(newUser.name, newUser.email);

    await expect(accountInformation.heading).toBeVisible();
    await expect(accountInformation.name).toHaveValue(newUser.name);
    await expect(accountInformation.email).toHaveValue(newUser.email);
    await expect(accountInformation.email).toBeDisabled();

    await accountInformation.fillDetails(newUser);
    await accountInformation.createAccount();
    await expect(accountCreated.heading).toBeVisible();

    await accountCreated.clickContinue();
    await expect(header.loggedInAs).toHaveText(loggedInAsPattern(newUser.name));
    await expect(header.logoutLink).toBeVisible();
    await expect(header.deleteAccountLink).toBeVisible();
    await expect(header.signupLoginLink).toBeHidden();

    // Proves the data was stored, not only that a confirmation page was rendered.
    expect(await api.getUserDetailByEmail(newUser.email)).toMatchObject(
      expectedUserDetails(newUser),
    );
  });

  test('REG-02 duplicate email is rejected at signup step 1', async ({
    page,
    registeredUser,
  }, testInfo) => {
    const signupLogin = new SignupLoginPage(page);
    const accountInformation = new AccountInformationPage(page);
    const header = new Header(page);
    // Only the name is used: the test case asks for a different name with the existing email.
    const differentName = buildUser(testInfo.workerIndex).name;

    await signupLogin.goto();
    await signupLogin.signup(differentName, registeredUser.email);

    // The error is the sync point: the hidden checks below only mean something after it.
    // The URL is not asserted: the site changes it to /signup while showing the same page.
    await expect(signupLogin.duplicateEmailError).toBeVisible();
    await expect(accountInformation.heading).toBeHidden();
    await expect(header.signupLoginLink).toBeVisible();
    await expect(header.loggedInAs).toBeHidden();
  });

  for (const { id, title, input, field, flag } of blockedSignupCases) {
    test(`${id} signup step 1 is blocked when ${title}`, async ({ page }, testInfo) => {
      const signupLogin = new SignupLoginPage(page);
      const accountInformation = new AccountInformationPage(page);
      const fields = { name: signupLogin.signupName, email: signupLogin.signupEmail };
      // Step 1 never creates an account, so there is nothing for newUser's teardown to clean.
      const user = buildUser(testInfo.workerIndex);
      const { name, email } = { name: user.name, email: user.email, ...input };

      await signupLogin.goto();
      await recordFirstInvalidField(signupLogin.signupForm);
      await signupLogin.signup(name, email);

      await expect(signupLogin.signupForm).toHaveAttribute('data-first-invalid', field);
      expect(await validityFlag(fields[field], flag)).toBe(true);
      await expect(page).toHaveURL(/\/login$/);
      await expect(accountInformation.heading).toBeHidden();
    });
  }

  // newUser, not buildUser: if the site ever creates the account anyway, teardown deletes it.
  test('REG-06 account is not created when password is empty', async ({ page, api, newUser }) => {
    const signupLogin = new SignupLoginPage(page);
    const accountInformation = new AccountInformationPage(page);
    const accountCreated = new AccountCreatedPage(page);

    await signupLogin.goto();
    await signupLogin.signup(newUser.name, newUser.email);
    await expect(accountInformation.heading).toBeVisible();

    await accountInformation.fillDetails({ ...newUser, password: '' });
    await recordFirstInvalidField(accountInformation.form);
    await accountInformation.createAccount();

    await expect(accountInformation.form).toHaveAttribute('data-first-invalid', 'password');
    expect(await validityFlag(accountInformation.password, 'valueMissing')).toBe(true);
    await expect(page).toHaveURL(/\/signup$/);
    await expect(accountCreated.heading).toBeHidden();
    await expect(accountInformation.heading).toBeVisible();
    expect(await api.getUserDetailByEmail(newUser.email)).toBeNull();
  });

  test('REG-08 user can delete their account through the UI', async ({
    page,
    api,
    registeredUser,
  }) => {
    const signupLogin = new SignupLoginPage(page);
    const accountDeleted = new AccountDeletedPage(page);
    const header = new Header(page);

    await signupLogin.goto();
    await signupLogin.login(registeredUser.email, registeredUser.password);
    await expect(header.loggedInAs).toHaveText(loggedInAsPattern(registeredUser.name));

    await header.deleteAccount();
    await expect(accountDeleted.heading).toBeVisible();
    await expect(header.signupLoginLink).toBeVisible();
    await expect(header.loggedInAs).toBeHidden();
    expect(await api.getUserDetailByEmail(registeredUser.email)).toBeNull();

    await signupLogin.goto();
    await signupLogin.login(registeredUser.email, registeredUser.password);
    await expect(signupLogin.loginError).toBeVisible();
    await expect(header.loggedInAs).toBeHidden();
  });
});

/**
 * Marks the form with the name of the first field that fails browser validation.
 * Validation runs synchronously inside the submit click and fires "invalid" instead of
 * submitting, so the mark is final as soon as the click returns. If the form did submit,
 * the page would navigate and the mark would be gone, so the check cannot pass by accident.
 * "invalid" does not bubble, hence the capture-phase listener.
 */
async function recordFirstInvalidField(form: Locator): Promise<void> {
  await form.evaluate((element) => {
    element.addEventListener(
      'invalid',
      (event) => {
        element.dataset.firstInvalid ??= (event.target as HTMLInputElement).name;
      },
      { capture: true },
    );
  });
}

async function validityFlag(field: Locator, flag: keyof ValidityState): Promise<boolean> {
  return field.evaluate((element, key) => (element as HTMLInputElement).validity[key], flag);
}

/** Anchored at the end so the name is exact; \s+ absorbs the spacing after the icon. */
function loggedInAsPattern(name: string): RegExp {
  return new RegExp(`Logged in as\\s+${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`);
}

/** createAccount parameters as the user detail API names them; mobile_number is not returned. */
function expectedUserDetails(user: User): Record<string, string> {
  return {
    name: user.name,
    email: user.email,
    title: user.title,
    birth_day: user.birthDay,
    birth_month: user.birthMonth,
    birth_year: user.birthYear,
    first_name: user.firstName,
    last_name: user.lastName,
    company: user.company,
    address1: user.address1,
    address2: user.address2,
    country: user.country,
    state: user.state,
    city: user.city,
    zipcode: user.zipcode,
  };
}
