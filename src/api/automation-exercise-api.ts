import type { APIRequestContext } from '@playwright/test';
import type { User } from '../support/user-factory';

/**
 * Client for the site's public API.
 *
 * The API always answers HTTP 200; the real outcome is the responseCode field in the
 * JSON body (served as text/html). Requests must be form data: JSON bodies are ignored.
 */
interface ApiBody {
  responseCode: number;
  message?: string;
  [key: string]: unknown;
}

export type UserDetails = Record<string, unknown>;

export class AutomationExerciseApi {
  constructor(private readonly request: APIRequestContext) {}

  async createAccount(user: User): Promise<void> {
    const body = await this.send('POST', '/api/createAccount', {
      form: {
        name: user.name,
        email: user.email,
        password: user.password,
        title: user.title,
        birth_date: user.birthDay,
        birth_month: user.birthMonth,
        birth_year: user.birthYear,
        firstname: user.firstName,
        lastname: user.lastName,
        company: user.company,
        address1: user.address1,
        address2: user.address2,
        country: user.country,
        zipcode: user.zipcode,
        state: user.state,
        city: user.city,
        mobile_number: user.mobileNumber,
      },
    });
    expectCode(body, 201, `createAccount ${user.email}`);
  }

  /**
   * Returns 'not-found' for code 404. The API uses the same 404 for a wrong password,
   * so callers that need certainty must confirm with getUserDetailByEmail.
   */
  async deleteAccount(email: string, password: string): Promise<'deleted' | 'not-found'> {
    const body = await this.send('DELETE', '/api/deleteAccount', { form: { email, password } });
    if (body.responseCode === 404) return 'not-found';
    expectCode(body, 200, `deleteAccount ${email}`);
    return 'deleted';
  }

  /** Returns null when no account exists for the email. */
  async getUserDetailByEmail(email: string): Promise<UserDetails | null> {
    const body = await this.send('GET', '/api/getUserDetailByEmail', { params: { email } });
    if (body.responseCode === 404) return null;
    expectCode(body, 200, `getUserDetailByEmail ${email}`);
    if (!isRecord(body.user)) {
      throw new Error(`getUserDetailByEmail ${email}: response has no user object`);
    }
    return body.user;
  }

  async searchProductNames(term: string): Promise<string[]> {
    const body = await this.send('POST', '/api/searchProduct', { form: { search_product: term } });
    expectCode(body, 200, `searchProduct "${term}"`);
    const products = body.products;
    if (!Array.isArray(products)) {
      throw new Error(`searchProduct "${term}": response has no products array`);
    }
    return products.map((product, index) => {
      if (!isRecord(product) || typeof product.name !== 'string') {
        throw new Error(`searchProduct "${term}": product ${index} has no name`);
      }
      return product.name;
    });
  }

  private async send(
    method: 'GET' | 'POST' | 'DELETE',
    path: string,
    options: { form?: Record<string, string>; params?: Record<string, string> },
  ): Promise<ApiBody> {
    const response = await this.request.fetch(path, { method, ...options });
    const text = await response.text();
    if (response.status() !== 200) {
      throw new Error(
        `${method} ${path}: unexpected HTTP ${response.status()}: ${text.slice(0, 200)}`,
      );
    }
    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch (error) {
      throw new Error(`${method} ${path}: response is not JSON: ${text.slice(0, 200)}`, {
        cause: error,
      });
    }
    if (!isRecord(body) || typeof body.responseCode !== 'number') {
      throw new Error(`${method} ${path}: response has no numeric responseCode: ${text}`);
    }
    return body as ApiBody;
  }
}

function expectCode(body: ApiBody, expected: number, action: string): void {
  if (body.responseCode !== expected) {
    throw new Error(
      `${action}: expected responseCode ${expected}, got ${body.responseCode} (${body.message ?? 'no message'})`,
    );
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
