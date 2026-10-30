# automationexercise.com E2E tests

End-to-end tests for https://automationexercise.com, written with Playwright and TypeScript.
They cover user registration and product search through to the cart, run in Chromium and
Firefox, and run on every push and pull request to `main` in GitHub Actions.

Latest HTML report: https://denushakov.github.io/automationexercise-e2e/

## What this suite covers

The test design is in [docs/test-cases.md](docs/test-cases.md). It is the source of truth for
scope, IDs, priorities and expected results.

- **Task 1, registration:** signup, the account form, duplicate email, browser validation on
  both signup steps, and account deletion (REG-01 to REG-09).
- **Task 2, product search and product detail:** search by exact, case-changed, partial, unknown
  and special-character terms, the product detail page, and adding to the cart (SRCH-01 to
  SRCH-08, CART-01).

Priority scale:

| Priority | Meaning                                                                                          |
| -------- | ------------------------------------------------------------------------------------------------ |
| P1       | Core user journey, or a failure that affects money or stored user data. Must pass for a release. |
| P2       | Common user mistake or a credible edge case on a core journey.                                   |
| P3       | Rare input, cosmetic or UX issue.                                                                |

Automated: 14 of the 18 designed cases, as 17 tests per browser (34 in total). REG-03, REG-04 and
REG-05 share one data-driven test; SRCH-02 and SRCH-05 are data-driven over their inputs.

Two automated cases are known site defects and are marked with `test.fail()` and an annotation
naming the defect. They pass while the defect exists and fail when it is fixed:

- SRCH-06: leading and trailing spaces in the search term are not trimmed (D2).
- CART-01: quantity -1 is accepted and the cart total becomes negative (D1).

Not automated, with the reason:

| Case    | Reason                                                                                             |
| ------- | -------------------------------------------------------------------------------------------------- |
| REG-07  | Whitespace-only name. Whether it should be rejected is a product decision; reported as finding D3. |
| REG-09  | Dotless email domain. Valid under the HTML email rules, so not a defect.                           |
| SRCH-07 | Empty search shows all products. Reasonable behaviour, low risk.                                   |
| SRCH-08 | Enter does not start a search. Not required by the site; reported as finding D4.                   |

All site findings (defects, accessibility and minor issues) are listed in the Observations
section of [docs/test-cases.md](docs/test-cases.md#observations-found-during-design-and-reconnaissance).

## Quick start

Prerequisites: Node.js 20 or later (CI uses Node 24) and npm.

```sh
npm ci
npx playwright install chromium firefox
```

On Linux, add `--with-deps` to the install command to get the system libraries the browsers need.

A `.env` file is optional; without one the suite targets https://automationexercise.com.

```sh
cp .env.example .env
```

Run the tests:

```sh
npm test                                    # all tests, Chromium and Firefox
npm run test:chromium                       # Chromium only
npx playwright test --project=firefox       # Firefox only
npx playwright test tests/search.spec.ts    # one spec file
npx playwright test -g "REG-01"             # one test by title
```

Open the HTML report of the last run:

```sh
npm run report
```

Static checks, the same ones CI runs:

```sh
npm run typecheck
npm run lint
npm run format:check
```

## Configuration

Settings come from environment variables, read and validated in
[src/config/env.ts](src/config/env.ts):

| Variable         | Default                           | Meaning                                                     |
| ---------------- | --------------------------------- | ----------------------------------------------------------- |
| `BASE_URL`       | `https://automationexercise.com`  | Site under test. Used by the browser and by the API client. |
| `TEST_DATA_FILE` | `test-data/default.json`          | Test data file, relative to the repository root.            |
| `WORKERS`        | 50% of CPU cores locally, 2 in CI | Number of parallel workers.                                 |

- Variables set in the shell or in CI take precedence over `.env`. `.env` only fills in what the
  environment does not set.
- An empty value counts as not set, so the default applies.
- Invalid values (for example a `BASE_URL` that is not a URL, or `WORKERS=0`) stop the run before
  any test starts, with a message naming the variable.
- CI mode is switched on by the `CI` variable, which GitHub Actions sets. It changes retries,
  `maxFailures`, workers and reporters (see below).

### Test data

[test-data/default.json](test-data/default.json) holds every input and expected value the tests
use: the user profile for registration, the malformed email, the product (id, name, price,
availability), the search terms and the cart quantities. Test code contains no product names
or prices.

The file is validated with a zod schema in [src/config/test-data.ts](src/config/test-data.ts)
when the tests load. A missing or wrongly typed field fails the run with the field's path.

To use other data, copy the file, change the values and point `TEST_DATA_FILE` at the copy:

```sh
TEST_DATA_FILE=test-data/staging.json npm test
```

Email and password are not in the file. Each test generates a unique email and a random password
at runtime (see "Unique data per test" below).

## Project structure

| Folder               | Contents                                                                                     |
| -------------------- | -------------------------------------------------------------------------------------------- |
| `src/pages/`         | Page objects: locators and actions for each page and the shared header. No assertions.       |
| `src/fixtures/`      | Playwright fixtures: ad blocking, API client, generated user, registered user with teardown. |
| `src/api/`           | Client for the site's public API, used for setup, teardown and state checks.                 |
| `src/config/`        | Environment and test data loading, validated with zod.                                       |
| `src/support/`       | Helpers: user factory, ad blocking, price parsing.                                           |
| `tests/`             | Specs: `registration.spec.ts`, `search.spec.ts`, `cart.spec.ts`.                             |
| `test-data/`         | Test data files.                                                                             |
| `docs/`              | Test case design and site observations.                                                      |
| `.github/workflows/` | CI workflow.                                                                                 |

## Technical choices and reasoning

**Page objects.** Each page object holds locators and actions only. All assertions are in the
tests, so a reader sees what is checked without opening another file, and page objects can be
reused by tests with different oracles.

**Fixtures with API setup and teardown.** Tests ask for what they need through fixtures in
[src/fixtures/index.ts](src/fixtures/index.ts):

- `newUser`: unique user data, not registered. Teardown deletes the account if the test created
  one.
- `registeredUser`: the same user, created through the API before the test.
- `api`: the API client.

The UI is used only for the behaviour under test. Preconditions such as "an account with this
email exists" are created through the API, which is faster and removes UI flakiness from steps
that are not being tested. Cleanup happens only in fixture teardown, which runs even when the
test fails; no test body deletes anything.

The site's `deleteAccount` answers 404 both when the account is already gone and when the
password is wrong. Teardown therefore accepts a 404 only after `getUserDetailByEmail` confirms
the account does not exist, and fails the test otherwise.

**Unique data per test.** The user factory builds the email from a prefix, a timestamp, the
worker index and a random suffix (`aqa_<timestamp>_w<worker>_<random>@example.com`), and a random
password. Tests can run in parallel and be repeated without clashing on the shared site.
Passwords are generated at runtime and are not stored in the repository.

Each test also gets its own browser context, so the guest cart and session never carry over
between tests and no cart cleanup is needed.

**Selectors.** In order of preference:

1. Roles and accessible names (`getByRole`), and visible text (`getByText`).
2. The site's `data-qa` attributes via `getByTestId`. `testIdAttribute` is set to `data-qa` in
   [playwright.config.ts](playwright.config.ts). The account form uses these because its labels
   are unreliable: the Zipcode label points to the City input and the date of birth dropdowns
   have no label.
3. CSS only where the site offers no accessible name or test id, scoped to a container. Examples:
   the search button (`#submit_search`, no accessible name), product cards, cart cells, and the
   signup and login forms (`form[action="/signup"]`), which have no name either.

There is no XPath.

**Waits.** There are no fixed sleeps (`waitForTimeout`) and no forced clicks. Tests rely on
Playwright's auto-waiting and web-first assertions (`toBeVisible`, `toHaveText`, `toHaveURL`).
Where a read must happen after the page has settled, the page object waits for a real
condition: for example, `search()` waits for the results URL and its load event before the test
reads the result names.

**Browser validation.** For empty or malformed fields the tests assert the field's validity state
(`valueMissing`, `typeMismatch`), that the browser's `invalid` event fired on that field, and that
the page did not navigate. They never assert the validation message text, because it depends on
the browser and the OS locale. Running in both Chromium and Firefox shows the checks are
portable.

**Config validation with zod.** Environment variables and the test data file are parsed with zod
schemas. A typo or a missing field fails at startup with a clear message, instead of surfacing
later as a confusing test failure.

**Retries and maxFailures in CI.**

- `retries`: 1 in CI, 0 locally. One retry absorbs a network blip on a public site; more would
  hide real flakiness. A test that passes only on retry is reported as flaky, not hidden.
- `maxFailures`: 10 in CI, off locally. When the target is down every test fails the same way;
  stopping early keeps the run inside the job timeout, keeps the report small and stops sending
  traffic to a site that is not responding. Playwright counts a test once, after its last
  attempt, and only if the outcome is unexpected.
- `workers`: 2 in CI, to keep the load on a shared demo site moderate.

**Static checks.** TypeScript in strict mode (including `noUncheckedIndexedAccess` and
`exactOptionalPropertyTypes`), ESLint with `typescript-eslint` and `eslint-plugin-playwright`, and
Prettier. CI runs all three before any test.

## Handling ads and pop-ups

Every test blocks ads at the network level. A fixture applies
[src/support/ad-blocking.ts](src/support/ad-blocking.ts) to each browser context before the first
navigation. It aborts every request to four hosts and their subdomains:

- `googlesyndication.com`
- `doubleclick.net`
- `adtrafficquality.google`
- `fundingchoicesmessages.google.com`

**Why these four.** The site's own pages load only one ad script, `adsbygoogle.js` from
`pagead2.googlesyndication.com`. The consent dialog, the full-page "vignette" ads and the other
ad networks are all loaded by that script or by the Google hosts above. Blocking the entry points
stops the whole chain.

**Why block instead of closing dialogs.** Without blocking, during reconnaissance:

- a full-screen consent dialog covered the page about one second after load, and header link
  clicks timed out behind it;
- after accepting consent, navigation was redirected to `#google_vignette` full-page ads.

Closing these in tests would need handlers for third-party UI that appears at random times and
changes without notice. Every test would carry conditional logic that has nothing to do with the
behaviour under test. Blocking removes the cause, makes runs deterministic and faster, and leaves
no consent handler to maintain. The trade-off is that the suite does not test the site with ads
enabled; that is listed as out of scope in the test design.

**How it was verified.** Two runs with the same flow compared blocking 18 observed ad hosts with
blocking only these four roots. Each run had 20 header navigations and a search, product detail
and add-to-cart flow. Both runs gave the same result:

- no consent dialog within 10 seconds of load;
- no vignette in 20 navigations;
- the flow completed;
- no page errors;
- the only blocked requests were for `adsbygoogle.js` itself, because nothing downstream was
  loaded.

The browser console still logs the blocked requests and mixed-content errors for the site's fonts
(observation M1). Tests do not fail on console errors, because these come from the site and appear
on every page.

## CI and reporting

The workflow is [.github/workflows/e2e.yml](.github/workflows/e2e.yml). It runs on every push and
pull request to `main`, and can be started by hand (`workflow_dispatch`). A new push to a pull
request cancels the run in progress for that pull request.

Job `test` (Ubuntu 24.04, 20 minute timeout, read-only token):

1. Check out the code.
2. Set up Node.js 24 with the npm cache.
3. `npm ci`.
4. Type check, lint and format check.
5. Install Chromium and Firefox with their system dependencies.
6. Run all tests (`npm test`). `BASE_URL` is set in the workflow file.
7. Upload the HTML report and `reports/junit.xml` as an artifact named
   `playwright-report-<attempt>`, kept for 14 days. This step runs even when tests fail.
8. On `main`, if the HTML report exists, package it for GitHub Pages. This also runs when tests
   fail.

Job `publish-report` deploys the packaged report to GitHub Pages. It has the only token with Pages
write access, and it runs whenever the `test` job produced a report, pass or fail.

Reports:

- **HTML report on GitHub Pages:** https://denushakov.github.io/automationexercise-e2e/. It shows
  the latest run on `main`; each deployment replaces the previous one. Traces, screenshots and
  videos are kept for failed tests.
- **Artifact:** the same HTML report plus JUnit XML, for every run including pull requests.
- **JUnit XML:** `reports/junit.xml`, for tools that read JUnit. The workflow does not parse it.
- **GitHub annotations:** in CI the `github` reporter marks failures on the lines of code where
  they happened.

## Problems and solutions

| Problem                                                                                                                                                                                                                           | Solution                                                                                                                                                                                                                                                      |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A consent dialog and vignette ads blocked clicks at random times.                                                                                                                                                                 | Block the four ad and consent root hosts at the network level (see "Handling ads and pop-ups").                                                                                                                                                               |
| The site's API always answers HTTP 200; the real result is a `responseCode` field in a JSON body sent as `text/html`. JSON request bodies are ignored.                                                                            | The API client sends form data only and checks `responseCode`. A non-200 status or a body that is not JSON is an error, reported with the first 200 characters of the body.                                                                                   |
| `deleteAccount` returns 404 both for "already deleted" and for a wrong password.                                                                                                                                                  | Teardown accepts a 404 only after `getUserDetailByEmail` confirms the account is gone.                                                                                                                                                                        |
| The Zipcode label points to the City input, and the date of birth dropdowns have no label.                                                                                                                                        | The account form uses the site's `data-qa` attributes.                                                                                                                                                                                                        |
| The "Logged in as" header item is an `<a>` without `href`, so it has no link role.                                                                                                                                                | The login check uses its text, anchored to the user's name, plus the Logout and Delete Account links.                                                                                                                                                         |
| On the duplicate email error the URL changes to `/signup` while the same page is shown.                                                                                                                                           | REG-02 does not assert the URL. It checks the error inside the signup form, that the account form is not shown, and that the user is still logged out.                                                                                                        |
| Browser validation messages differ by browser and locale.                                                                                                                                                                         | Assert validity state and the `invalid` event instead of message text.                                                                                                                                                                                        |
| Add to cart is a background request; going to the cart too early showed an empty cart.                                                                                                                                            | Wait for the "Added!" confirmation before opening the cart. See issue #1 for one case where this was not enough.                                                                                                                                              |
| With 4 local workers the site returned Cloudflare 520 errors and 503 "heavy load (queue full)" pages in several runs.                                                                                                             | CI uses 2 workers and 1 retry. These errors still occur occasionally; the retry absorbs them and the run reports the test as flaky.                                                                                                                           |
| In a deliberate experiment with the target pointed at a site with none of these pages, all 34 tests failed, the run took about 15 of the 20 job minutes, and the report artifact was 106 MB. API errors printed whole HTML pages. | `maxFailures: 10` in CI and API errors truncated to 200 characters. Run locally against the same host, the suite now stops after 10 failures (11 failed, 22 did not run, 12 seconds). The report was uploaded and published despite the failure, as intended. |
| After that experiment every CI run failed while local runs passed. The workflow read `BASE_URL` from a repository variable, which still pointed at the experiment's host. The browser and the API client both went there.         | `BASE_URL` is now set in the workflow file. It is not a secret, so it belongs in versioned, reviewed code, not in repository settings nobody sees.                                                                                                            |

## Known limitations

- **Shared public demo site.** The suite tests a site it does not control. It can be slow, return
  Cloudflare 520 or 503 "heavy load" pages, or change its products and markup. Product
  expectations live in the test data file so they can be updated in one place.
- **API quirks.** Every API response is HTTP 200 with the outcome in `responseCode`, and
  `deleteAccount` gives the same 404 for "not found" and "wrong password". The client and teardown
  handle both, but an API change could make teardown fail and leave a test account behind. That
  shows up as a test error naming the account.
- **Flaky SRCH-01 on Firefox** ([issue #1](https://github.com/DenUshakov/automationexercise-e2e/issues/1)).
  In one run the cart was empty after the "Added!" confirmation. The cause is not known yet; the
  issue lists the evidence and how to reproduce it.
- **Known-defect tests accept any failure.** `test.fail()` passes on any failure, including a
  server error, so a pass of SRCH-06 or CART-01 does not prove the defect itself was hit. Check the
  reported error. A timeout does not count as an expected failure and is reported as failed. For
  CART-01, a fix that blocks the add before the request is sent would make the test time out and
  report as failed, not as "defect fixed".
- **Ads are always blocked.** Behaviour with ads and the consent dialog enabled is not tested.
- **Console errors are not checked.** The site logs mixed-content errors on every page, so console
  errors cannot be used as a failure signal.
- **Test credentials in traces.** Traces of failed tests, which are part of the public report,
  include the generated test emails and passwords. The accounts are throwaway and deleted in
  teardown.
- **Browsers.** Desktop Chromium and Firefox only. No WebKit, no mobile viewports.
- **The GitHub Pages report shows the latest run on `main` only.** Older reports are available as
  artifacts for 14 days.
