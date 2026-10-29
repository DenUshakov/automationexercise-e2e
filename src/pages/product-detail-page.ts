import type { Locator, Page } from '@playwright/test';

/** /product_details/:id, including the "Added!" modal shown after Add to cart. */
export class ProductDetailPage {
  readonly info: Locator;
  readonly name: Locator;
  readonly price: Locator;
  readonly availability: Locator;
  readonly quantity: Locator;
  readonly addToCartButton: Locator;
  readonly modal: Locator;
  readonly addedHeading: Locator;
  readonly viewCartLink: Locator;

  constructor(private readonly page: Page) {
    // The information block has no role or label; everything below is scoped to it.
    this.info = page.locator('.product-information');
    this.name = this.info.getByRole('heading', { level: 2 });
    // Anchored, so it matches only the inner price span, not the span around the controls.
    this.price = this.info.getByText(/^Rs\. \d+$/);
    // The value is a bare text node after <b>Availability:</b>, so the paragraph is the unit.
    this.availability = this.info.getByRole('paragraph').filter({ hasText: 'Availability:' });
    // Unnamed (its label is not associated), but the only spinbutton in the block.
    this.quantity = this.info.getByRole('spinbutton');
    this.addToCartButton = this.info.getByRole('button', { name: 'Add to cart' });
    // The modal has no dialog role; the id is its only hook.
    this.modal = page.locator('#cartModal');
    this.addedHeading = this.modal.getByRole('heading', { name: 'Added!' });
    this.viewCartLink = this.modal.getByRole('link', { name: 'View Cart' });
  }

  async goto(productId: number): Promise<void> {
    await this.page.goto(`/product_details/${productId}`);
  }

  async setQuantity(quantity: number): Promise<void> {
    await this.quantity.fill(String(quantity));
  }

  async addToCart(): Promise<void> {
    await this.addToCartButton.click();
  }

  async viewCart(): Promise<void> {
    await this.viewCartLink.click();
  }
}
