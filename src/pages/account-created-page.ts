import type { Locator, Page } from '@playwright/test';

/** /account_created, shown after registration step 2. */
export class AccountCreatedPage {
  readonly heading: Locator;
  readonly continueLink: Locator;

  constructor(page: Page) {
    // CSS shows the heading in uppercase; role name matching ignores case.
    this.heading = page.getByRole('heading', { name: 'Account Created!' });
    this.continueLink = page.getByRole('link', { name: 'Continue' });
  }

  async clickContinue(): Promise<void> {
    await this.continueLink.click();
  }
}
