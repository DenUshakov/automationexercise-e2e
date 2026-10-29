import type { Locator, Page } from '@playwright/test';

/** The /products page: product search and the result cards. */
export class ProductsPage {
  readonly searchInput: Locator;
  readonly searchButton: Locator;
  readonly resultsHeading: Locator;
  readonly cards: Locator;
  readonly cardNames: Locator;

  constructor(private readonly page: Page) {
    this.searchInput = page.getByRole('textbox', { name: 'Search Product' });
    // The button holds only an icon: no accessible name and no data-qa.
    this.searchButton = page.locator('#submit_search');
    this.resultsHeading = page.getByRole('heading', { name: 'Searched Products' });
    // A card has no role or name. Each card repeats its name in a hover overlay,
    // so names are read from .productinfo only.
    this.cards = page.locator('.product-image-wrapper');
    this.cardNames = this.cards.locator('.productinfo p');
  }

  card(name: string): Locator {
    return this.cards.filter({
      has: this.page.locator('.productinfo').getByText(name, { exact: true }),
    });
  }

  async goto(): Promise<void> {
    await this.page.goto('/products');
  }

  /**
   * Returns after the results page has loaded, so its cards are complete and its scripts
   * have run. Search from /products only: the URL check cannot tell two results pages apart.
   */
  async search(term: string): Promise<void> {
    await this.searchInput.fill(term);
    await this.searchButton.click();
    await this.page.waitForURL(
      (url) => url.pathname === '/products' && url.searchParams.has('search'),
    );
  }

  async openProduct(name: string): Promise<void> {
    await this.card(name).getByRole('link', { name: 'View Product' }).click();
  }
}
