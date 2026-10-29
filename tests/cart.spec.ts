import { testData } from '../src/config/test-data';
import { expect, test } from '../src/fixtures';
import { CartPage } from '../src/pages/cart-page';
import { ProductDetailPage } from '../src/pages/product-detail-page';
import { parsePrice } from '../src/support/price';

const { product, cart } = testData;

test.describe('Cart', () => {
  test.fail(
    'CART-01 quantity below 1 cannot be added to the cart',
    {
      annotation: {
        type: 'issue',
        description:
          'D1: quantity 0 and -1 are accepted by the server; the cart shows quantity -1 and ' +
          'total Rs. -500. See docs/test-cases.md, Observations. Any failure counts as ' +
          'expected, including server errors; check the reported error. If a fix blocks the ' +
          'add before the request, the modal wait times out and the fix is not detected.',
      },
    },
    async ({ page }) => {
      const productDetail = new ProductDetailPage(page);
      const cartPage = new CartPage(page);

      await productDetail.goto(product.id);
      await productDetail.setQuantity(cart.belowMinimumQuantity);
      // The input is marked invalid (min=1), but that does not stop the add.
      expect(
        await productDetail.quantity.evaluate(
          (element) => (element as HTMLInputElement).validity.rangeUnderflow,
        ),
      ).toBe(true);

      await productDetail.addToCart();
      // Add to cart is a background request; the modal means it has completed.
      await expect(productDetail.addedHeading).toBeVisible();

      // goto waits for the page to load, so the lists below are complete. An empty cart has
      // no rows, and a fix that clamps the quantity to 1 passes as well.
      await cartPage.goto();
      const quantities = (await cartPage.quantityCells.allInnerTexts()).map(Number);
      const totals = (await cartPage.totalCells.allInnerTexts()).map(parsePrice);

      expect(quantities.filter((quantity) => quantity < 1)).toEqual([]);
      expect(totals.filter((total) => total < 0)).toEqual([]);
    },
  );
});
