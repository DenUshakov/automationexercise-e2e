import type { Locator, Page } from '@playwright/test';

/** The /login page: "New User Signup!" (registration step 1) and "Login to your account". */
export class SignupLoginPage {
  readonly signupForm: Locator;
  readonly signupName: Locator;
  readonly signupEmail: Locator;
  readonly signupButton: Locator;
  readonly duplicateEmailError: Locator;
  readonly loginForm: Locator;
  readonly loginEmail: Locator;
  readonly loginPassword: Locator;
  readonly loginButton: Locator;
  readonly loginError: Locator;

  constructor(private readonly page: Page) {
    // A form without an accessible name has no role; the action is the stable hook.
    this.signupForm = page.locator('form[action="/signup"]');
    // The inputs have placeholders but no labels, and "Email Address" appears in both forms.
    this.signupName = page.getByTestId('signup-name');
    this.signupEmail = page.getByTestId('signup-email');
    this.signupButton = this.signupForm.getByRole('button', { name: 'Signup' });
    this.duplicateEmailError = this.signupForm.getByText('Email Address already exist!');

    this.loginForm = page.locator('form[action="/login"]');
    this.loginEmail = page.getByTestId('login-email');
    this.loginPassword = page.getByTestId('login-password');
    this.loginButton = this.loginForm.getByRole('button', { name: 'Login' });
    this.loginError = this.loginForm.getByText('Your email or password is incorrect!');
  }

  async goto(): Promise<void> {
    await this.page.goto('/login');
  }

  async signup(name: string, email: string): Promise<void> {
    await this.signupName.fill(name);
    await this.signupEmail.fill(email);
    await this.signupButton.click();
  }

  async login(email: string, password: string): Promise<void> {
    await this.loginEmail.fill(email);
    await this.loginPassword.fill(password);
    await this.loginButton.click();
  }
}
