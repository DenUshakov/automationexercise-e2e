# Test case design

Target: https://automationexercise.com (configurable via `BASE_URL`).

This document covers Task 1 (registration) and Task 2 (product search and product detail). Every case is based on behaviour observed on the site during reconnaissance, not on assumptions. Where the site behaves in a way that looks wrong, the case states the expected behaviour and links to the observation.

## Priority scale

| Priority | Meaning                                                                                          |
| -------- | ------------------------------------------------------------------------------------------------ |
| P1       | Core user journey, or a failure that affects money or stored user data. Must pass for a release. |
| P2       | Common user mistake or a credible edge case on a core journey.                                   |
| P3       | Rare input, cosmetic or UX issue.                                                                |

## Conventions used in all cases

- Ads and the consent dialog are blocked at the network level for every test (see README). No case contains steps to close ads or accept consent.
- Each test runs in its own browser context, so the guest cart and session are isolated per test. This was verified: a fresh context starts with an empty cart and no `sessionid`.
- Test users are generated per test with a unique email (`<prefix>_<timestamp>_<worker>_<random>@example.com`). Any account a test creates is deleted through the public API in fixture teardown, which runs even when the test fails. Teardown confirms deletion through `getUserDetailByEmail` and fails if the account still exists.
- Browser validation is asserted through the field's validity state (`valueMissing`, `typeMismatch`) and by the invalid event firing on that field with no navigation, not through the message text. The text depends on browser and OS locale.
- Product expectations (name, price, availability, product id) come from test data, not from the test code.

---

## Task 1: Registration

### REG-01 Successful registration with full account details

- **Priority:** P1. This is the journey every new customer takes; if it breaks, no one can sign up.
- **Preconditions:** None. The email does not exist on the site.
- **Test data:** Unique user from the factory: name, email, password, title, date of birth, first and last name, company, address 1 and 2, country, state, city, zipcode, mobile number.
- **Steps:**
  1. Open the Signup / Login page.
  2. Submit the "New User Signup!" form with the generated name and email.
  3. On the account details form, check that name is prefilled with the entered value and email is shown and not editable.
  4. Fill all fields, including the optional title, date of birth, newsletter and offers.
  5. Click Create Account.
  6. Click Continue.
- **Expected result:**
  - After step 5 the account created confirmation is shown.
  - After step 6 the header shows "Logged in as" followed by the user's name, plus Logout and Delete Account links. "Signup / Login" is not shown.
  - The user detail API for this email returns the account, and every field it returns matches what was entered: name, email, title, date of birth, first name, last name, company, address 1 and 2, country, state, city and zipcode. Mobile number, password and the newsletter and offers choices are not returned by the API, so they are not compared.
- **Automated:** Yes. The API check proves the data was stored, not only that a confirmation page was rendered.

### REG-02 Duplicate email is rejected at signup step 1

- **Priority:** P1. Duplicate accounts break login and account recovery; this is the most likely signup error for returning users.
- **Preconditions:** An account with the test email exists. Created through the API, not the UI, because account creation is not the behaviour under test here.
- **Test data:** Existing user's email, a different name.
- **Steps:**
  1. Open the Signup / Login page.
  2. Submit the signup form with a different name and the email of the existing account.
- **Expected result:**
  - The message "Email Address already exist!" is shown inside the signup form (text as implemented on the site).
  - The account details form is not shown.
  - The header still shows "Signup / Login" and no "Logged in as".
  - The URL is not asserted: on this error the site changes the URL to `/signup` while showing the same page, so URL is not a reliable signal.
- **Automated:** Yes.

### REG-03 Signup step 1 is blocked when name is empty

- **Priority:** P2. Common user mistake; the check confirms the form does not send incomplete data.
- **Preconditions:** None.
- **Test data:** Empty name, valid unique email.
- **Steps:**
  1. Open the Signup / Login page.
  2. Leave name empty, enter the email, click Signup.
- **Expected result:** The name field is invalid with `valueMissing`. Submission is blocked by browser validation on that field (the invalid event fires on it and the page does not navigate). The account details form is not shown.
- **Automated:** Yes, as one data-driven test together with REG-04 and REG-05.

### REG-04 Signup step 1 is blocked when email is empty

- **Priority:** P2. Same reason as REG-03.
- **Preconditions:** None.
- **Test data:** Valid name, empty email.
- **Steps:** As REG-03, with name filled and email empty.
- **Expected result:** The email field is invalid with `valueMissing`. Submission is blocked by browser validation on that field (the invalid event fires on it and the page does not navigate). The account details form is not shown.
- **Automated:** Yes, data-driven with REG-03.

### REG-05 Signup step 1 is blocked for a malformed email

- **Priority:** P2. Typos in email are frequent and an account with an unreachable email cannot be recovered.
- **Preconditions:** None.
- **Test data:** Valid name, email `abc` (no `@`).
- **Steps:** As REG-03, with the malformed email.
- **Expected result:** The email field is invalid with `typeMismatch`. Submission is blocked by browser validation on that field (the invalid event fires on it and the page does not navigate). The account details form is not shown.
- **Automated:** Yes, data-driven with REG-03. Only one malformed value is used: `abc` and `abc@` were observed to fail the same way, so a second value adds no coverage.

### REG-06 Account is not created when a required field on the account form is empty

- **Priority:** P2. Confirms the second step cannot create a partial account.
- **Preconditions:** None.
- **Test data:** Unique user; password left empty.
- **Steps:**
  1. Complete signup step 1 with a unique name and email.
  2. Fill all account fields except password.
  3. Click Create Account.
- **Expected result:** The password field is invalid with `valueMissing`. Submission is blocked by browser validation on that field (the invalid event fires on it and the page does not navigate). The account created confirmation is not shown. The user detail API returns "not found" for the email.
- **Automated:** Yes. Password is used because it is the one required field with no prefill and no default.

### REG-07 Whitespace-only name is rejected at signup step 1

- **Priority:** P2. A name of spaces produces an account that cannot be identified in the UI or in support.
- **Preconditions:** None.
- **Test data:** Name of three spaces, valid unique email.
- **Steps:** Enter the data in the "New User Signup!" form, click Signup.
- **Expected result:** The signup is rejected with a message, and the account details form is not shown.
- **Observed:** The browser treats the value as filled, the server accepts it, and the account details form opens with the name prefilled as three spaces. See Observations, D3.
- **Automated:** No. What happens after the account form is submitted was not verified, and whether such names should be rejected is a product decision. Reported as a finding instead of encoded as a failing test.

### REG-08 User can delete their account through the UI

- **Priority:** P2. Account deletion is a user right and the documented way to clean up; it must work and must actually remove the data.
- **Preconditions:** An account exists, created through the API.
- **Test data:** That account's email and password.
- **Steps:**
  1. Log in through the Login form.
  2. Click Delete Account.
  3. Try to log in again with the same credentials.
- **Expected result:**
  - After step 2 the account deleted confirmation is shown, and the header shows "Signup / Login" with no "Logged in as".
  - The user detail API returns "not found" for the email.
  - Step 3 shows "Your email or password is incorrect!" and the user stays logged out.
- **Automated:** Yes. Teardown still runs and accepts "already deleted" only after the user detail API confirms the account is gone.

### REG-09 Signup with an email without a dot in the domain

- **Priority:** P3.
- **Test data:** `user@b`.
- **Observed:** Both the browser and the server accept it and the account details form opens.
- **Assessment:** Not a defect. A dotless domain is valid under the HTML email rules. Whether the business wants to accept such addresses is a product question.
- **Automated:** No.

---

## Task 2: Product search and product detail

### SRCH-01 Search for a known product and verify its detail page

- **Priority:** P1. Search to product page to cart is the main path from intent to purchase.
- **Preconditions:** None. Guest user.
- **Test data:** Search term `Blue Top`; expected product name `Blue Top`, price `Rs. 500`, availability `In Stock`; quantity `3`.
- **Steps:**
  1. Open the Products page.
  2. Submit the search term from the Products page.
  3. Open the product from its own result card.
  4. Read name, price and availability.
  5. Set quantity to 3 and click Add to cart.
  6. In the confirmation modal, click View Cart.
- **Expected result:**
  - After step 2 the results heading is "Searched Products", the expected product is in the results, and every result name contains the term (case-insensitive).
  - After step 3 the product detail page shows the expected name, price and availability. The quantity input is visible, editable and defaults to 1. The Add to cart button is visible.
  - After step 5 the confirmation modal shows "Added!".
  - After step 6 the cart contains the product with quantity 3 and a total equal to the displayed price x 3.
- **Automated:** Yes. "Working quantity input and Add to cart" is proven by the cart contents, not by the controls being visible.

### SRCH-02 Search is case-insensitive

- **Priority:** P2. Users type in any case; a case-sensitive search would hide existing products.
- **Test data:** `blue top`, `BLUE TOP`.
- **Steps:** For each term, search from the Products page.
- **Expected result:** The expected product `Blue Top` is in the results and every result name contains the term, ignoring case.
- **Automated:** Yes, data-driven.

### SRCH-03 Partial term returns the same products as the search API

- **Priority:** P2. Partial terms are how most users search; the UI must show every product the backend matched, with no missing or duplicated cards.
- **Test data:** `top`.
- **Steps:**
  1. Call the search API with the term.
  2. Search the same term in the UI.
- **Expected result:** The set of product names in the UI equals the set returned by the API.
- **Why not "every name contains the term":** For `top`, two results do not contain the word in their names; they match on category ("Tops & Shirts"). The matching rules are not documented, so the test checks that the UI faithfully renders backend results, not how the backend decides relevance.
- **Automated:** Yes.

### SRCH-04 Search with no matching products

- **Priority:** P2. Users must be able to tell that nothing was found rather than see a broken page.
- **Test data:** `zzzqqq` (a term that matches no product name or category).
- **Expected result:** The results heading "Searched Products" is shown and no product cards are listed.
- **Note:** The site shows no "no results" message. The test asserts current behaviour; the missing message is reported as a UX finding.
- **Automated:** Yes.

### SRCH-05 Special characters do not break the search

- **Priority:** P2. Search input is free text sent to the server; characters with meaning in URLs, SQL or HTML must not cause errors.
- **Test data:** `%`, `'`, `<script>`.
- **Expected result:** The results page loads with no product cards, no uncaught page errors and no JavaScript dialogs.
- **Automated:** Yes, data-driven. This is a robustness check, not security testing.

### SRCH-06 Leading and trailing spaces are ignored

- **Priority:** P2. Pasted text often includes spaces; the product exists and should be found.
- **Test data:** `  Blue Top  `.
- **Expected result:** The expected product `Blue Top` is in the results.
- **Observed:** No results. Leading spaces are sent to the server and not trimmed. See Observations, D2.
- **Automated:** Yes, as a known failing test (`test.fail`) with a link to the defect. The suite stays green while the defect exists and reports when it is fixed.

### SRCH-07 Empty search

- **Priority:** P3.
- **Observed:** Shows all products under "All Products".
- **Automated:** No. Reasonable behaviour with low risk.

### SRCH-08 Search runs on Enter

- **Priority:** P3. Common expectation, but not required by the site.
- **Observed:** Pressing Enter does nothing; only the button starts a search. See Observations, D4.
- **Automated:** No. Reported as a UX finding.

### CART-01 Quantity below 1 cannot be added to the cart

- **Priority:** P1. A negative quantity produces a negative cart total, which affects pricing and checkout.
- **Preconditions:** None. Guest user.
- **Test data:** Product `Blue Top`; quantity `-1`.
- **Steps:**
  1. Open the product detail page.
  2. Set quantity to -1. The input shows as invalid (`min=1`).
  3. Click Add to cart.
  4. Open the cart.
- **Expected result:** The product is not added with a quantity below 1, and the cart total is never negative.
- **Observed:** The click is not blocked, the server accepts the value, and the cart shows quantity -1 and total `Rs. -500`. Quantity 0 is accepted the same way. See Observations, D1.
- **Automated:** Yes, as a known failing test (`test.fail`).

---

## Summary

| ID      | Title                                     | Priority | Automated               |
| ------- | ----------------------------------------- | -------- | ----------------------- |
| REG-01  | Successful registration                   | P1       | Yes                     |
| REG-02  | Duplicate email rejected at signup step 1 | P1       | Yes                     |
| REG-03  | Empty name blocked                        | P2       | Yes (data-driven)       |
| REG-04  | Empty email blocked                       | P2       | Yes (data-driven)       |
| REG-05  | Malformed email blocked                   | P2       | Yes (data-driven)       |
| REG-06  | No account without password               | P2       | Yes                     |
| REG-07  | Whitespace-only name                      | P2       | No (finding D3)         |
| REG-08  | Delete account through UI                 | P2       | Yes                     |
| REG-09  | Dotless email domain                      | P3       | No                      |
| SRCH-01 | Known product to cart                     | P1       | Yes                     |
| SRCH-02 | Case-insensitive search                   | P2       | Yes (data-driven)       |
| SRCH-03 | Partial term matches API                  | P2       | Yes                     |
| SRCH-04 | No results                                | P2       | Yes                     |
| SRCH-05 | Special characters                        | P2       | Yes (data-driven)       |
| SRCH-06 | Spaces around term                        | P2       | Yes (known failing, D2) |
| SRCH-07 | Empty search                              | P3       | No                      |
| SRCH-08 | Search on Enter                           | P3       | No (finding D4)         |
| CART-01 | Quantity below 1                          | P1       | Yes (known failing, D1) |

## Prioritisation rationale

- The P1 cases follow the two journeys that bring revenue: a new customer signs up, and a customer finds a product and puts it in the cart. CART-01 is P1 because it is the only observed failure that directly affects money.
- P2 cases cover the mistakes users actually make (empty fields, typos, existing email, different case, partial terms, pasted spaces) and inputs that must not break the page.
- Data-driven tests are used where several inputs share the same steps and the same oracle, so coverage grows without duplicated code.
- Known defects are automated only when the expected behaviour is clear and the impact is real (D1, D2). Defects that need a product decision or were not fully verified are reported, not encoded as tests.
- Setup that is not the behaviour under test (existing account, deletion) goes through the API, which is faster and removes UI flakiness from places where it adds nothing.

## Observations (found during design and reconnaissance)

| ID  | Observation                                                                                                                                    | Impact        |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| D1  | Quantity 0 and -1 are accepted by the server; the cart total becomes negative. Validation exists only as `min=1` on the input.                 | High          |
| D2  | Search does not trim leading spaces; `  Blue Top  ` returns no results.                                                                        | Medium        |
| D3  | A name of only spaces passes signup step 1 and is carried to the account form unchanged.                                                       | Medium        |
| D4  | Pressing Enter in the search box does not search.                                                                                              | Low           |
| D5  | Search shows no "no results" message.                                                                                                          | Low           |
| A1  | The Zipcode label points to the City input; the zipcode input has no label.                                                                    | Accessibility |
| A2  | The search button, the quantity input and the date of birth dropdowns have no accessible name. Error messages have no live region.             | Accessibility |
| M1  | Font stylesheets are requested over `http://` and blocked as mixed content on every page.                                                      | Low           |
| M2  | The account deleted page keeps the browser title "Account Created".                                                                            | Low           |
| M3  | Account deletion is a plain GET with no confirmation step. Session cookies are not marked `secure`. Observed only; security impact not tested. | Not assessed  |

## Out of scope

- Login and logout as standalone features, beyond what registration and deletion need.
- Checkout, payment, order history and the contact form.
- Security testing (XSS payloads, CSRF, session handling). M3 is recorded as an observation only.
- Accessibility audit. A1 and A2 were found while choosing selectors, not through a full review.
- Search relevance rules on the server. They are not documented; SRCH-03 checks UI and API consistency instead.
- Visual regression, performance and load testing.
- Mobile layouts and browsers other than those configured in the suite.
- Behaviour with ads enabled. Ads are third-party content and are blocked to keep tests deterministic.
