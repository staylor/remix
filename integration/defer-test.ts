import { test, expect } from "@playwright/test";
import type { ConsoleMessage, Page } from "@playwright/test";

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
      "app/components/counter.tsx": js`
        import { useState } from "react";

        export default function Counter({ id }) {
          let [count, setCount] = useState(0);
          return (
            <div>
              <button id={"increment-"+id} onClick={() => setCount((c) => c+1)}>Increment</button>
              <p id={"count-"+id}>{count}</p>
            </div>
          )
        }
      `,
      "app/root.tsx": js`
        import { defer } from "@remix-run/node";
        import { Links, Meta, Outlet, Scripts, useLoaderData, useMatches } from "@remix-run/react";
        import Counter from "~/components/counter";

        export const meta: MetaFunction = () => ({
          charset: "utf-8",
          title: "New Remix App",
          viewport: "width=device-width,initial-scale=1",
        });

        export const loader = () => defer({
          id: "${ROOT_ID}",
        });

        export default function Root() {
          let { id } = useLoaderData();
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
                <div id={id}>
                  <p>{id}</p>
                  <Counter id={id} />
                  <Outlet />
                </div>
                {scripts ? <Scripts /> : null}
                {/* Send arbitrary data so safari renders the initial shell before
                    the document finishes downloading. */}
                {Array(6000).fill(null).map((_, i)=><p key={i}>YOOOOOOOOOO   {i}</p>)}
              </body>
            </html>
          );
        }
      `,

      "app/routes/index.tsx": js`
        import { defer } from "@remix-run/node";
        import { Link, useLoaderData } from "@remix-run/react";
        import Counter from "~/components/counter";

        export const handle = true;

        export function loader() {
          return defer({
            id: "${INDEX_ID}",
          });
        }

        export default function Index() {
          let { id } = useLoaderData();
          return (
            <div id={id}>
              <p>{id}</p>
              <Counter id={id} />
            </div>
          );
        }
      `,

      "app/routes/deferred-noscript-resolved.tsx": js`
        import { Suspense } from "react";
        import { defer } from "@remix-run/node";
        import { Await, Link, useLoaderData } from "@remix-run/react";
        import Counter from "~/components/counter";

        export function loader() {
          return defer({
            deferredId: "${DEFERRED_ID}",
            resolvedId: Promise.resolve("${RESOLVED_DEFERRED_ID}"),
          });
        }

        export default function Deferred() {
          let { deferredId, resolvedId } = useLoaderData();
          return (
            <div id={deferredId}>
              <p>{deferredId}</p>
              <Counter id={deferredId} />
              <Suspense fallback={<div id="${FALLBACK_ID}">fallback</div>}>
                <Await
                  resolve={resolvedId}
                  children={(resolvedDeferredId) => (
                    <div id={resolvedDeferredId}>
                      <p>{resolvedDeferredId}</p>
                      <Counter id={resolvedDeferredId} />
                    </div>
                  )}
                />
              </Suspense>
            </div>
          );
        }
      `,

      "app/routes/deferred-noscript-unresolved.tsx": js`
        import { Suspense } from "react";
        import { defer } from "@remix-run/node";
        import { Await, Link, useLoaderData } from "@remix-run/react";
        import Counter from "~/components/counter";

        export function loader() {
          return defer({
            deferredId: "${DEFERRED_ID}",
            resolvedId: new Promise(
              (resolve) => setTimeout(() => {
                resolve("${RESOLVED_DEFERRED_ID}");
              }, 10)
            ),
          });
        }

        export default function Deferred() {
          let { deferredId, resolvedId } = useLoaderData();
          return (
            <div id={deferredId}>
              <p>{deferredId}</p>
              <Counter id={deferredId} />
              <Suspense fallback={<div id="${FALLBACK_ID}">fallback</div>}>
                <Await
                  resolve={resolvedId}
                  children={(resolvedDeferredId) => (
                    <div id={resolvedDeferredId}>
                      <p>{resolvedDeferredId}</p>
                      <Counter id={resolvedDeferredId} />
                    </div>
                  )}
                />
              </Suspense>
            </div>
          );
        }
      `,

      "app/routes/deferred-script-resolved.tsx": js`
        import { Suspense } from "react";
        import { defer } from "@remix-run/node";
        import { Await, Link, useLoaderData } from "@remix-run/react";
        import Counter from "~/components/counter";

        export const handle = true;

        export function loader() {
          return defer({
            deferredId: "${DEFERRED_ID}",
            resolvedId: Promise.resolve("${RESOLVED_DEFERRED_ID}"),
          });
        }

        export default function Deferred() {
          let { deferredId, resolvedId } = useLoaderData();
          return (
            <div id={deferredId}>
              <p>{deferredId}</p>
              <Counter id={deferredId} />
              <Suspense fallback={<div id="${FALLBACK_ID}">fallback</div>}>
                <Await
                  resolve={resolvedId}
                  children={(resolvedDeferredId) => (
                    <div id={resolvedDeferredId}>
                      <p>{resolvedDeferredId}</p>
                      <Counter id={resolvedDeferredId} />
                    </div>
                  )}
                />
              </Suspense>
            </div>
          );
        }
      `,

      "app/routes/deferred-script-unresolved.tsx": js`
        import { Suspense } from "react";
        import { defer } from "@remix-run/node";
        import { Await, Link, useLoaderData } from "@remix-run/react";
        import Counter from "~/components/counter";

        export const handle = true;

        export function loader() {
          return defer({
            deferredId: "${DEFERRED_ID}",
            resolvedId: new Promise(
              (resolve) => setTimeout(() => {
                resolve("${RESOLVED_DEFERRED_ID}");
              }, 10)
            ),
          });
        }

        export default function Deferred() {
          let { deferredId, resolvedId } = useLoaderData();
          return (
            <div id={deferredId}>
              <p>{deferredId}</p>
              <Counter id={deferredId} />
              <Suspense fallback={<div id="${FALLBACK_ID}">fallback</div>}>
                <Await
                  resolve={resolvedId}
                  children={(resolvedDeferredId) => (
                    <div id={resolvedDeferredId}>
                      <p>{resolvedDeferredId}</p>
                      <Counter id={resolvedDeferredId} />
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
  let criticalHTML = html.slice(0, html.indexOf("</html>") + 7);
  expect(criticalHTML).toContain(ROOT_ID);
  expect(criticalHTML).toContain(INDEX_ID);
  let deferredHTML = html.slice(html.indexOf("</html>") + 7);
  expect(deferredHTML).toBe("");

  let app = new PlaywrightFixture(appFixture, page);
  let assertConsole = monitorConsole(page);
  await app.goto("/");
  await page.waitForSelector(`#${ROOT_ID}`);
  await page.waitForSelector(`#${INDEX_ID}`);

  await ensureInteractivity(page, ROOT_ID);
  await ensureInteractivity(page, INDEX_ID);

  await assertConsole();
});

test("resolved promises render in initial payload", async ({ page }) => {
  let response = await fixture.requestDocument("/deferred-noscript-resolved");
  let html = await response.text();
  let criticalHTML = html.slice(0, html.indexOf("</html>") + 7);
  expect(criticalHTML).toContain(ROOT_ID);
  expect(criticalHTML).toContain(DEFERRED_ID);
  expect(criticalHTML).not.toContain(FALLBACK_ID);
  expect(criticalHTML).toContain(RESOLVED_DEFERRED_ID);
  let deferredHTML = html.slice(html.indexOf("</html>") + 7);
  expect(deferredHTML).toBe("");

  let app = new PlaywrightFixture(appFixture, page);
  await app.goto("/deferred-noscript-resolved");
  await page.waitForSelector(`#${ROOT_ID}`);
  await page.waitForSelector(`#${DEFERRED_ID}`);
  await page.waitForSelector(`#${RESOLVED_DEFERRED_ID}`);
});

test("slow promises render in subsequent payload", async ({ page }) => {
  let response = await fixture.requestDocument("/deferred-noscript-unresolved");
  let html = await response.text();
  let criticalHTML = html.slice(0, html.indexOf("</html>") + 7);
  expect(criticalHTML).toContain(ROOT_ID);
  expect(criticalHTML).toContain(DEFERRED_ID);
  expect(criticalHTML).toContain(FALLBACK_ID);
  expect(criticalHTML).not.toContain(RESOLVED_DEFERRED_ID);
  let deferredHTML = html.slice(html.indexOf("</html>") + 7);
  expect(deferredHTML).toContain(RESOLVED_DEFERRED_ID);

  let app = new PlaywrightFixture(appFixture, page);
  await app.goto("/deferred-noscript-unresolved");
  await page.waitForSelector(`#${ROOT_ID}`);
  await page.waitForSelector(`#${DEFERRED_ID}`);
  await page.waitForSelector(`#${RESOLVED_DEFERRED_ID}`);
});

test("resolved promises render in initial payload and hydrates", async ({
  page,
}) => {
  let response = await fixture.requestDocument("/deferred-script-resolved");
  let html = await response.text();
  let criticalHTML = html.slice(0, html.indexOf("</html>") + 7);
  expect(criticalHTML).toContain(ROOT_ID);
  expect(criticalHTML).toContain(DEFERRED_ID);
  expect(criticalHTML).not.toContain(FALLBACK_ID);
  expect(criticalHTML).toContain(RESOLVED_DEFERRED_ID);
  let deferredHTML = html.slice(html.indexOf("</html>") + 7);
  expect(deferredHTML).toBe("");

  let app = new PlaywrightFixture(appFixture, page);
  let assertConsole = monitorConsole(page);
  await app.goto("/deferred-script-resolved", true);
  await page.waitForSelector(`#${ROOT_ID}`);
  await page.waitForSelector(`#${DEFERRED_ID}`);
  await page.waitForSelector(`#${RESOLVED_DEFERRED_ID}`);

  await ensureInteractivity(page, ROOT_ID);
  await ensureInteractivity(page, DEFERRED_ID);
  await ensureInteractivity(page, RESOLVED_DEFERRED_ID);

  await assertConsole();
});

test("slow promises render in subsequent payload and hydrates", async ({
  page,
}) => {
  let response = await fixture.requestDocument("/deferred-script-unresolved");
  let html = await response.text();
  let criticalHTML = html.slice(0, html.indexOf("</html>") + 7);
  expect(criticalHTML).toContain(ROOT_ID);
  expect(criticalHTML).toContain(DEFERRED_ID);
  expect(criticalHTML).toContain(FALLBACK_ID);
  expect(criticalHTML).not.toContain(RESOLVED_DEFERRED_ID);
  let deferredHTML = html.slice(html.indexOf("</html>") + 7);
  expect(deferredHTML).toContain(RESOLVED_DEFERRED_ID);

  let app = new PlaywrightFixture(appFixture, page);
  let assertConsole = monitorConsole(page);
  await app.goto("/deferred-script-unresolved", true);
  await page.waitForSelector(`#${ROOT_ID}`);
  await page.waitForSelector(`#${DEFERRED_ID}`);
  await page.waitForSelector(`#${RESOLVED_DEFERRED_ID}`);

  await ensureInteractivity(page, ROOT_ID);
  await ensureInteractivity(page, DEFERRED_ID);
  await ensureInteractivity(page, RESOLVED_DEFERRED_ID);

  await assertConsole();
});

function monitorConsole(page: Page) {
  let messages: ConsoleMessage[] = [];
  page.on("console", (message) => {
    messages.push(message);
  });

  return async () => {
    if (!messages.length) return;
    for (let message of messages) {
      let args = message.args();
      if (args[0]) {
        let arg0 = await args[0].jsonValue();
        if (
          typeof arg0 === "string" &&
          arg0.includes("Download the React DevTools")
        ) {
          continue;
        }
      }
      throw new Error(`Unexpected console.log()`);
    }
  };
}

async function ensureInteractivity(page: Page, id: string, expect: number = 1) {
  let increment = await page.waitForSelector("#increment-" + id);
  await increment.click();
  await page.waitForSelector(`#count-${id}:has-text('${expect}')`);
}
