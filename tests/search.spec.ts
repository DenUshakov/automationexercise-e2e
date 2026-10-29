import { testData } from '../src/config/test-data';
import { expect, test } from '../src/fixtures';
import { CartPage } from '../src/pages/cart-page';
import { ProductDetailPage } from '../src/pages/product-detail-page';
import { ProductsPage } from '../src/pages/products-page';
import { parsePrice } from '../src/support/price';

const { product, search, cart } = testData;

test.describe('Product search', () => {
  test('SRCH-01 search for a known product and verify its detail page', async ({ page }) => {
    const products = new ProductsPage(page);
    const productDetail = new ProductDetailPage(page);
    const cartPage = new CartPage(page);

    await products.goto();
    await products.search(product.searchTerm);

    await expect(products.resultsHeading).toBeVisible();
    await expect(products.card(product.name)).toBeVisible();
    expect(await namesWithoutTerm(products, product.searchTerm)).toEqual([]);

    await products.openProduct(product.name);

    await expect(page).toHaveURL(new RegExp(`/product_details/${product.id}$`));
    await expect(productDetail.name).toHaveText(product.name);
    await expect(productDetail.price).toHaveText(product.price);
    await expect(productDetail.availability).toHaveText(`Availability: ${product.availability}`);
    await expect(productDetail.quantity).toBeVisible();
    await expect(productDetail.quantity).toBeEditable();
    await expect(productDetail.quantity).toHaveValue('1');
    await expect(productDetail.addToCartButton).toBeVisible();
    // The test case defines the expected total from the price the page displays.
    const displayedPrice = await productDetail.price.innerText();

    await productDetail.setQuantity(cart.quantity);
    await productDetail.addToCart();
    // Add to cart is a background request; the modal means it has completed.
    await expect(productDetail.addedHeading).toBeVisible();

    await productDetail.viewCart();
    const row = cartPage.row(product.name);

    await expect(cartPage.quantityIn(row)).toHaveText(String(cart.quantity));
    await expect(cartPage.priceIn(row)).toHaveText(displayedPrice);
    // Numbers, not strings, so the check does not depend on how large amounts are formatted.
    expect(parsePrice(await cartPage.totalIn(row).innerText())).toBe(
      parsePrice(displayedPrice) * cart.quantity,
    );
  });

  for (const term of search.caseVariants) {
    test(`SRCH-02 search is case-insensitive: "${term}"`, async ({ page }) => {
      const products = new ProductsPage(page);

      await products.goto();
      await products.search(term);

      await expect(products.resultsHeading).toBeVisible();
      await expect(products.card(product.name)).toBeVisible();
      expect(await namesWithoutTerm(products, term)).toEqual([]);
    });
  }

  test('SRCH-03 partial term returns the same products as the search API', async ({
    page,
    api,
  }) => {
    const products = new ProductsPage(page);
    const apiNames = await api.searchProductNames(search.partialTerm);
    // Without this, an empty API answer and an empty page would match.
    expect(apiNames.length).toBeGreaterThan(0);

    await products.goto();
    await products.search(search.partialTerm);

    await expect(products.resultsHeading).toBeVisible();
    await expect(products.cards).toHaveCount(apiNames.length);
    // Sorted arrays, not Sets: a Set hides a duplicated card. Order is not a requirement.
    expect((await products.cardNames.allInnerTexts()).sort()).toEqual([...apiNames].sort());
  });

  test('SRCH-04 search with no matching products', async ({ page }) => {
    const products = new ProductsPage(page);

    await products.goto();
    await products.search(search.noResultsTerm);

    // The site shows no "no results" message (finding D5), so the heading and an empty list
    // are the observable result.
    await expect(products.resultsHeading).toBeVisible();
    await expect(products.cards).toHaveCount(0);
  });

  for (const term of search.specialCharacters) {
    test(`SRCH-05 special characters do not break the search: ${term}`, async ({ page }) => {
      const products = new ProductsPage(page);
      const pageErrors: string[] = [];
      const dialogs: string[] = [];
      page.on('pageerror', (error) => pageErrors.push(error.message));
      page.on('dialog', (dialog) => {
        dialogs.push(`${dialog.type()}: ${dialog.message()}`);
        // An open dialog would block the page.
        void dialog.dismiss();
      });

      await products.goto();
      // search() returns after the results page has loaded, so its scripts have already run.
      await products.search(term);

      await expect(products.resultsHeading).toBeVisible();
      await expect(products.cards).toHaveCount(0);
      // The term comes back as the input's value: the server treated it as text.
      await expect(products.searchInput).toHaveValue(term);
      expect(pageErrors).toEqual([]);
      expect(dialogs).toEqual([]);
    });
  }

  test.fail(
    'SRCH-06 leading and trailing spaces are ignored',
    {
      annotation: {
        type: 'issue',
        description:
          'D2: leading spaces in the search term are not trimmed; "  Blue Top  " returns no ' +
          'results. See docs/test-cases.md, Observations. Any failure counts as expected, ' +
          'including server errors; check the reported error.',
      },
    },
    async ({ page }) => {
      const products = new ProductsPage(page);

      await products.goto();
      await products.search(search.paddedTerm);

      // search() has loaded the server-rendered results, so a retrying check would only
      // spend the expect timeout before failing on the defect.
      expect(await products.cardNames.allInnerTexts()).toContain(product.name);
    },
  );
});

async function namesWithoutTerm(products: ProductsPage, term: string): Promise<string[]> {
  const names = await products.cardNames.allInnerTexts();
  return names.filter((name) => !name.toLowerCase().includes(term.toLowerCase()));
}
