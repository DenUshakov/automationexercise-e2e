import type { Locator, Page } from '@playwright/test';
import type { User } from '../support/user-factory';

// The radio labels add a dot to the submitted value.
const TITLE_LABELS: Record<User['title'], string> = { Mr: 'Mr.', Mrs: 'Mrs.' };

/**
 * Registration step 2 (/signup, "Enter Account Information"). Text fields and selects use
 * data-qa: the Zipcode label points to the City input and the date of birth selects have
 * no label, so role and label queries are unreliable on this form.
 */
export class AccountInformationPage {
  readonly form: Locator;
  readonly heading: Locator;
  readonly name: Locator;
  readonly email: Locator;
  readonly password: Locator;
  readonly day: Locator;
  readonly month: Locator;
  readonly year: Locator;
  readonly newsletter: Locator;
  readonly offers: Locator;
  readonly firstName: Locator;
  readonly lastName: Locator;
  readonly company: Locator;
  readonly address1: Locator;
  readonly address2: Locator;
  readonly country: Locator;
  readonly state: Locator;
  readonly city: Locator;
  readonly zipcode: Locator;
  readonly mobileNumber: Locator;
  readonly createAccountButton: Locator;

  constructor(private readonly page: Page) {
    this.form = page.locator('form[action="/signup"]');
    this.heading = page.getByRole('heading', { name: 'Enter Account Information' });
    this.name = page.getByTestId('name');
    this.email = page.getByTestId('email');
    this.password = page.getByTestId('password');
    this.day = page.getByTestId('days');
    this.month = page.getByTestId('months');
    this.year = page.getByTestId('years');
    // No data-qa on the checkboxes, but their labels work.
    this.newsletter = page.getByRole('checkbox', { name: 'Sign up for our newsletter!' });
    this.offers = page.getByRole('checkbox', { name: 'Receive special offers from our partners!' });
    this.firstName = page.getByTestId('first_name');
    this.lastName = page.getByTestId('last_name');
    this.company = page.getByTestId('company');
    this.address1 = page.getByTestId('address');
    this.address2 = page.getByTestId('address2');
    this.country = page.getByTestId('country');
    this.state = page.getByTestId('state');
    this.city = page.getByTestId('city');
    this.zipcode = page.getByTestId('zipcode');
    this.mobileNumber = page.getByTestId('mobile_number');
    this.createAccountButton = page.getByRole('button', { name: 'Create Account' });
  }

  titleRadio(title: User['title']): Locator {
    return this.page.getByRole('radio', { name: TITLE_LABELS[title], exact: true });
  }

  /** Fills every field except name and email, which step 1 already set. */
  async fillDetails(user: User): Promise<void> {
    await this.titleRadio(user.title).check();
    await this.password.fill(user.password);
    await this.day.selectOption({ value: user.birthDay });
    await this.month.selectOption({ value: user.birthMonth });
    await this.year.selectOption({ value: user.birthYear });
    await this.newsletter.check();
    await this.offers.check();
    await this.firstName.fill(user.firstName);
    await this.lastName.fill(user.lastName);
    await this.company.fill(user.company);
    await this.address1.fill(user.address1);
    await this.address2.fill(user.address2);
    await this.country.selectOption({ value: user.country });
    await this.state.fill(user.state);
    await this.city.fill(user.city);
    await this.zipcode.fill(user.zipcode);
    await this.mobileNumber.fill(user.mobileNumber);
  }

  async createAccount(): Promise<void> {
    await this.createAccountButton.click();
  }
}
