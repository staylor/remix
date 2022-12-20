import { test, expect } from "@playwright/test";

import { PlaywrightFixture } from "./helpers/playwright-fixture";
import type { Fixture, AppFixture } from "./helpers/create-fixture";
import { createAppFixture, createFixture, js } from "./helpers/create-fixture";

let fixture: Fixture;
let appFixture: AppFixture;

const ROOT_ID = "ROOT_ID";
const INDEX_ID = "INDEX_ID";
const DEFERRED_ID = "DEFERRED_ID";
const RESOLVED_DEFERRED_ID = "RESOLVED_DEFERRED_ID";
const FALLBACK_ID = "FALLBACK_ID";

test.beforeAll(async () => {
  fixture = await createFixture({
    ////////////////////////////////////////////////////////////////////////////
    // 💿 Next, add files to this object, just like files in a real app,
    // `createFixture` will make an app and run your tests against it.
    ////////////////////////////////////////////////////////////////////////////
    files: {
      "app/root.jsx": js`
        import { json } from "@remix-run/node";
        import { Links, Meta, Outlet, Scripts, useLoaderData, useMatches } from "@remix-run/react";

          export const loader = () => json({
            ROOT_ID: "${ROOT_ID}",
          });

          export default function Root() {
            let { ROOT_ID } = useLoaderData();
            let matches = useMatches();
            // Set export const handle = true on a route to enable
            // scripts for that route.
            let scripts = matches.some(match => match.handle);
            return (
              <html lang="en">
                <head>
                  <Meta />
                  <Links />
                </head>
                <body>
                  <div id={ROOT_ID}>
                    <p>{ROOT_ID}</p>
                    <Outlet />
                  </div>
                  {scripts ? <Scripts /> : null}
                </body>
              </html>
            );
          }
        `,

      "app/routes/index.jsx": js`
        import { defer } from "@remix-run/node";
        import { Link, useLoaderData } from "@remix-run/react";

        export function loader() {
          return defer({
            INDEX_ID: "${INDEX_ID}",
          });
        }

        export default function Index() {
          let { INDEX_ID } = useLoaderData();
          return (
            <div id={INDEX_ID}>
              <p>{INDEX_ID}</p>
            </div>
          );
        }
      `,

      "app/routes/deferred-noscript-resolved.jsx": js`
        import { Suspense } from "react";
        import { defer } from "@remix-run/node";
        import { Await, Link, useLoaderData } from "@remix-run/react";

        export function loader() {
          return defer({
            DEFERRED_ID: "${DEFERRED_ID}",
            RESOLVED_DEFERRED_ID: Promise.resolve("${RESOLVED_DEFERRED_ID}"),
          });
        }

        export default function Deferred() {
          let { DEFERRED_ID, RESOLVED_DEFERRED_ID } = useLoaderData();
          return (
            <div id={DEFERRED_ID}>
              <p>{DEFERRED_ID}</p>
              <Suspense fallback={<div id="${FALLBACK_ID}">fallback</div>}>
                <Await
                  resolve={RESOLVED_DEFERRED_ID}
                  children={(resolvedDeferredId) => (
                    <div id={resolvedDeferredId}>
                      <p>{resolvedDeferredId}</p>
                    </div>
                  )}
                />
              </Suspense>
            </div>
          );
        }
      `,

      "app/routes/deferred-noscript-unresolved.jsx": js`
        import { Suspense } from "react";
        import { defer } from "@remix-run/node";
        import { Await, Link, useLoaderData } from "@remix-run/react";

        export function loader() {
          return defer({
            DEFERRED_ID: "${DEFERRED_ID}",
            RESOLVED_DEFERRED_ID: new Promise(
              (resolve) => setTimeout(() => {
                resolve("${RESOLVED_DEFERRED_ID}");
              }, 10)
            ),
          });
        }

        export default function Deferred() {
          let { DEFERRED_ID, RESOLVED_DEFERRED_ID } = useLoaderData();
          return (
            <div id={DEFERRED_ID}>
              <p>{DEFERRED_ID}</p>
              <Suspense fallback={<div id="${FALLBACK_ID}">fallback</div>}>
                <Await
                  resolve={RESOLVED_DEFERRED_ID}
                  children={(resolvedDeferredId) => (
                    <div id={resolvedDeferredId}>
                      <p>{resolvedDeferredId}</p>
                    </div>
                  )}
                />
              </Suspense>
            </div>
          );
        }
      `,
    },
  });

  // This creates an interactive app using puppeteer.
  appFixture = await createAppFixture(fixture);
});

test.afterAll(() => {
  appFixture.close();
});

test("works with critical JSON like data", async ({ page }) => {
  let response = await fixture.requestDocument("/");
  let html = await response.text();
  let criticalHTML = html.replace(/<\/html>.*/i, "");
  expect(criticalHTML).toContain(ROOT_ID);
  expect(criticalHTML).toContain(INDEX_ID);

  let app = new PlaywrightFixture(appFixture, page);
  await app.goto("/");
  await page.waitForSelector(`#${ROOT_ID}`);
  await page.waitForSelector(`#${INDEX_ID}`);
});

test("resolved promises render in initial payload", async ({ page }) => {
  let response = await fixture.requestDocument("/deferred-noscript-resolved");
  let html = await response.text();
  let criticalHTML = html.replace(/<\/html>.*/i, "");
  expect(criticalHTML).toContain(ROOT_ID);
  expect(criticalHTML).toContain(DEFERRED_ID);
  expect(criticalHTML).toContain(RESOLVED_DEFERRED_ID);

  let app = new PlaywrightFixture(appFixture, page);
  await app.goto("/deferred-noscript-resolved");
  await page.waitForSelector(`#${ROOT_ID}`);
  await page.waitForSelector(`#${DEFERRED_ID}`);
  await page.waitForSelector(`#${RESOLVED_DEFERRED_ID}`);
});

test("slow promises render in subsequent payload", async ({ page }) => {
  let response = await fixture.requestDocument("/deferred-noscript-unresolved");
  let html = await response.text();
  let criticalHTML = html.replace(/<\/html>.*/ig, "");
  expect(criticalHTML).toContain(ROOT_ID);
  expect(criticalHTML).toContain(DEFERRED_ID);
  expect(criticalHTML).toContain(FALLBACK_ID);
  expect(criticalHTML).not.toContain(RESOLVED_DEFERRED_ID);

  let app = new PlaywrightFixture(appFixture, page);
  await app.goto("/deferred-noscript-resolved");
  await page.waitForSelector(`#${ROOT_ID}`);
  await page.waitForSelector(`#${DEFERRED_ID}`);
  await page.waitForSelector(`#${RESOLVED_DEFERRED_ID}`);
});
