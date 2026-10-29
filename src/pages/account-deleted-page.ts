import type { Locator, Page } from '@playwright/test';

/** /delete_account, shown right after the Delete Account link is clicked. */
export class AccountDeletedPage {
  readonly heading: Locator;

  constructor(page: Page) {
    // CSS shows the heading in uppercase; role name matching ignores case.
    this.heading = page.getByRole('heading', { name: 'Account Deleted!' });
  }
}
