import type { Locator, Page } from '@playwright/test';

/**
 * /view_cart. The table's header cells are <td>, not <th>, so cells have no column name;
 * the cell classes are the only way to tell the columns apart.
 */
export class CartPage {
  readonly quantityCells: Locator;
  readonly totalCells: Locator;

  constructor(private readonly page: Page) {
    this.quantityCells = page.locator('.cart_quantity');
    this.totalCells = page.locator('.cart_total_price');
  }

  row(productName: string): Locator {
    return this.page
      .getByRole('row')
      .filter({ has: this.page.getByRole('link', { name: productName, exact: true }) });
  }

  priceIn(row: Locator): Locator {
    return row.locator('.cart_price');
  }

  quantityIn(row: Locator): Locator {
    return row.locator('.cart_quantity');
  }

  totalIn(row: Locator): Locator {
    return row.locator('.cart_total_price');
  }

  async goto(): Promise<void> {
    await this.page.goto('/view_cart');
  }
}
