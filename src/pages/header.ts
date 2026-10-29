import type { Locator, Page } from '@playwright/test';

/** Site header, present on every page. The <header> element is exposed as role banner. */
export class Header {
  readonly signupLoginLink: Locator;
  readonly logoutLink: Locator;
  readonly deleteAccountLink: Locator;
  readonly loggedInAs: Locator;

  constructor(page: Page) {
    const banner = page.getByRole('banner');
    this.signupLoginLink = banner.getByRole('link', { name: 'Signup / Login' });
    this.logoutLink = banner.getByRole('link', { name: 'Logout' });
    this.deleteAccountLink = banner.getByRole('link', { name: 'Delete Account' });
    // "Logged in as <name>" is an <a> without href, so it has no link role.
    this.loggedInAs = banner.getByText('Logged in as');
  }

  async deleteAccount(): Promise<void> {
    await this.deleteAccountLink.click();
  }
}
