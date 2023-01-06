import { test, expect } from "@playwright/test";

import { PlaywrightFixture } from "./helpers/playwright-fixture";
import type { Fixture, AppFixture } from "./helpers/create-fixture";
import { createAppFixture, createFixture, js } from "./helpers/create-fixture";

const TEST_PADDING_VALUE = "20px";

test.describe("Vanilla Extract", () => {
  let fixture: Fixture;
  let appFixture: AppFixture;

  test.beforeAll(async () => {
    fixture = await createFixture({
      files: {
        "remix.config.js": js`
          module.exports = {
            future: {
              // Enable all CSS future flags to
              // ensure features don't clash
              unstable_cssModules: true,
              unstable_cssSideEffectImports: true,
              unstable_vanillaExtract: true,
            },
          };
        `,
        "app/root.jsx": js`
          import { Links, Outlet } from "@remix-run/react";
          import { cssBundleHref } from "@remix-run/css-bundle";
          export function links() {
            return [{ rel: "stylesheet", href: cssBundleHref }];
          }
          export default function Root() {
            return (
              <html>
                <head>
                  <Links />
                </head>
                <body>
                  <Outlet />
                </body>
              </html>
            )
          }
        `,
        ...typeScriptFixture(),
        ...javaScriptFixture(),
        ...imageUrlsViaCssUrlFixture(),
        ...imageUrlsViaRootRelativeCssUrlFixture(),
        ...imageUrlsViaJsImportFixture(),
        ...imageUrlsViaRootRelativeJsImportFixture(),
        ...standardImageUrlsViaJsImportFixture(),
        ...standardImageUrlsViaRootRelativeJsImportFixture(),
      },
    });
    appFixture = await createAppFixture(fixture);
  });

  test.afterAll(async () => {
    await appFixture.close();
  });

  let typeScriptFixture = () => ({
    "app/fixtures/typescript/styles.css.ts": js`
      import { style } from "@vanilla-extract/css";

      export const root = style({
        background: 'peachpuff',
        padding: ${JSON.stringify(TEST_PADDING_VALUE)}
      });
    `,
    "app/routes/typescript-test.jsx": js`
      import * as styles from "../fixtures/typescript/styles.css";
      
      export default function() {
        return (
          <div data-testid="typescript" className={styles.root}>
            TypeScript test
          </div>
        )
      }
    `,
  });
  test("TypeScript", async ({ page }) => {
    let app = new PlaywrightFixture(appFixture, page);
    await app.goto("/typescript-test");
    let locator = await page.locator("[data-testid='typescript']");
    let padding = await locator.evaluate(
      (element) => window.getComputedStyle(element).padding
    );
    expect(padding).toBe(TEST_PADDING_VALUE);
  });

  let javaScriptFixture = () => ({
    "app/fixtures/javascript/styles.css.js": js`
      import { style } from "@vanilla-extract/css";

      export const root = style({
        background: 'peachpuff',
        padding: ${JSON.stringify(TEST_PADDING_VALUE)}
      });
    `,
    "app/routes/javascript-test.jsx": js`
      import * as styles from "../fixtures/javascript/styles.css";
      
      export default function() {
        return (
          <div data-testid="javascript" className={styles.root}>
            javaScript test
          </div>
        )
      }
    `,
  });
  test("JavaScript", async ({ page }) => {
    let app = new PlaywrightFixture(appFixture, page);
    await app.goto("/javascript-test");
    let locator = await page.locator("[data-testid='javascript']");
    let padding = await locator.evaluate(
      (element) => window.getComputedStyle(element).padding
    );
    expect(padding).toBe(TEST_PADDING_VALUE);
  });

  let imageUrlsViaCssUrlFixture = () => ({
    "app/fixtures/imageUrlsViaCssUrl/styles.css.ts": js`
      import { style } from "@vanilla-extract/css";

      export const root = style({
        backgroundColor: 'peachpuff',
        backgroundImage: 'url("./image.svg")',
        padding: ${JSON.stringify(TEST_PADDING_VALUE)}
      });
    `,
    "app/fixtures/imageUrlsViaCssUrl/image.svg": `
      <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="50" fill="coral" />
      </svg>
    `,
    "app/routes/image-urls-via-css-url-test.jsx": js`
      import * as styles from "../fixtures/imageUrlsViaCssUrl/styles.css";
      
      export default function() {
        return (
          <div data-testid="image-urls-via-css-url" className={styles.root}>
            Image URLs via CSS URL test
          </div>
        )
      }
    `,
  });
  test("image URLs via CSS URL", async ({ page }) => {
    let app = new PlaywrightFixture(appFixture, page);
    let imgStatus: number | null = null;
    app.page.on("response", (res) => {
      if (res.url().endsWith(".svg")) imgStatus = res.status();
    });
    await app.goto("/image-urls-via-css-url-test");
    let locator = await page.locator("[data-testid='image-urls-via-css-url']");
    let backgroundImage = await locator.evaluate(
      (element) => window.getComputedStyle(element).backgroundImage
    );
    expect(backgroundImage).toContain(".svg");
    expect(imgStatus).toBe(200);
  });

  let imageUrlsViaRootRelativeCssUrlFixture = () => ({
    "app/fixtures/imageUrlsViaRootRelativeCssUrl/styles.css.ts": js`
      import { style } from "@vanilla-extract/css";

      export const root = style({
        backgroundColor: 'peachpuff',
        backgroundImage: 'url("~/fixtures/imageUrlsViaRootRelativeCssUrl/image.svg")',
        padding: ${JSON.stringify(TEST_PADDING_VALUE)}
      });
    `,
    "app/fixtures/imageUrlsViaRootRelativeCssUrl/image.svg": `
      <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="50" fill="coral" />
      </svg>
    `,
    "app/routes/image-urls-via-root-relative-css-url-test.jsx": js`
      import * as styles from "../fixtures/imageUrlsViaRootRelativeCssUrl/styles.css";
      
      export default function() {
        return (
          <div data-testid="image-urls-via-root-relative-css-url" className={styles.root}>
            Image URLs via CSS URL test
          </div>
        )
      }
    `,
  });
  test("image URLs via root-relative CSS URL", async ({ page }) => {
    let app = new PlaywrightFixture(appFixture, page);
    let imgStatus: number | null = null;
    app.page.on("response", (res) => {
      if (res.url().endsWith(".svg")) imgStatus = res.status();
    });
    await app.goto("/image-urls-via-root-relative-css-url-test");
    let locator = await page.locator(
      "[data-testid='image-urls-via-root-relative-css-url']"
    );
    let backgroundImage = await locator.evaluate(
      (element) => window.getComputedStyle(element).backgroundImage
    );
    expect(backgroundImage).toContain(".svg");
    expect(imgStatus).toBe(200);
  });

  let imageUrlsViaJsImportFixture = () => ({
    "app/fixtures/imageUrlsViaJsImport/styles.css.ts": js`
      import { style } from "@vanilla-extract/css";
      import href from "./image.svg";

      export const root = style({
        backgroundColor: 'peachpuff',
        backgroundImage: 'url(' + href + ')',
        padding: ${JSON.stringify(TEST_PADDING_VALUE)}
      });
    `,
    "app/fixtures/imageUrlsViaJsImport/image.svg": `
      <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="50" fill="coral" />
      </svg>
    `,
    "app/routes/image-urls-via-js-import-test.jsx": js`
      import * as styles from "../fixtures/imageUrlsViaJsImport/styles.css";
      
      export default function() {
        return (
          <div data-testid="image-urls-via-js-import" className={styles.root}>
            Image URLs via JS import test
          </div>
        )
      }
    `,
  });
  test("Image URLs via JS import", async ({ page }) => {
    let app = new PlaywrightFixture(appFixture, page);
    let imgStatus: number | null = null;
    app.page.on("response", (res) => {
      if (res.url().endsWith(".svg")) imgStatus = res.status();
    });
    await app.goto("/image-urls-via-js-import-test");
    let locator = await page.locator(
      "[data-testid='image-urls-via-js-import']"
    );
    let backgroundImage = await locator.evaluate(
      (element) => window.getComputedStyle(element).backgroundImage
    );
    expect(backgroundImage).toContain(".svg");
    expect(imgStatus).toBe(200);
  });

  let imageUrlsViaRootRelativeJsImportFixture = () => ({
    "app/fixtures/imageUrlsViaRootRelativeJsImport/styles.css.ts": js`
      import { style } from "@vanilla-extract/css";
      import href from "~/fixtures/imageUrlsViaRootRelativeJsImport/image.svg";

      export const root = style({
        backgroundColor: 'peachpuff',
        backgroundImage: 'url(' + href + ')',
        padding: ${JSON.stringify(TEST_PADDING_VALUE)}
      });
    `,
    "app/fixtures/imageUrlsViaRootRelativeJsImport/image.svg": `
      <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="50" fill="coral" />
      </svg>
    `,
    "app/routes/image-urls-via-root-relative-js-import-test.jsx": js`
      import * as styles from "../fixtures/imageUrlsViaRootRelativeJsImport/styles.css";
      
      export default function() {
        return (
          <div data-testid="image-urls-via-root-relative-js-import" className={styles.root}>
            Image URLs via root-relative JS import test
          </div>
        )
      }
    `,
  });
  test("Image URLs via root-relative JS import", async ({ page }) => {
    let app = new PlaywrightFixture(appFixture, page);
    let imgStatus: number | null = null;
    app.page.on("response", (res) => {
      if (res.url().endsWith(".svg")) imgStatus = res.status();
    });
    await app.goto("/image-urls-via-root-relative-js-import-test");
    let locator = await page.locator(
      "[data-testid='image-urls-via-root-relative-js-import']"
    );
    let backgroundImage = await locator.evaluate(
      (element) => window.getComputedStyle(element).backgroundImage
    );
    expect(backgroundImage).toContain(".svg");
    expect(imgStatus).toBe(200);
  });

  let standardImageUrlsViaJsImportFixture = () => ({
    "app/fixtures/standardImageUrlsViaJsImport/styles.css.ts": js`
      import { style } from "@vanilla-extract/css";
      
      export { default as src } from "./image.svg";

      export const root = style({
        width: 200,
        height: 200,
      });
    `,
    "app/fixtures/standardImageUrlsViaJsImport/image.svg": `
      <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="50" fill="coral" />
      </svg>
    `,
    "app/routes/standard-image-urls-via-js-import-test.jsx": js`
      import { root, src } from "../fixtures/standardImageUrlsViaJsImport/styles.css";
      
      export default function() {
        return (
          <img
            data-testid="standard-image-urls-via-js-import"
            src={src}
            className={root}
          />
        )
      }
    `,
  });
  test("Standard image URLs via JS import", async ({ page }) => {
    // This ensures that image URLs are fully resolved within the CSS file
    // rather than using some intermediary format that needs to be resolved
    // later. This is important to ensure that image import semantics are the
    // same throughout the app, regardless of whether it's in a JS file or a
    // Vanilla Extract context, e.g. you might want to export the image URL
    // from the CSS file and use it for preloading.
    let app = new PlaywrightFixture(appFixture, page);
    let imgStatus: number | null = null;
    app.page.on("response", (res) => {
      if (res.url().endsWith(".svg")) imgStatus = res.status();
    });
    await app.goto("/standard-image-urls-via-js-import-test");
    let element = await app.getElement(
      "[data-testid='standard-image-urls-via-js-import']"
    );
    expect(element.attr("src")).toContain(".svg");
    expect(imgStatus).toBe(200);
  });

  let standardImageUrlsViaRootRelativeJsImportFixture = () => ({
    "app/fixtures/standardImageUrlsViaRootRelativeJsImport/styles.css.ts": js`
      import { style } from "@vanilla-extract/css";

      export { default as src } from "~/fixtures/standardImageUrlsViaRootRelativeJsImport/image.svg";

      export const root = style({
        width: 200,
        height: 200,
      });
    `,
    "app/fixtures/standardImageUrlsViaRootRelativeJsImport/image.svg": `
      <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="50" fill="coral" />
      </svg>
    `,
    "app/routes/standard-image-urls-via-root-relative-js-import-test.jsx": js`
      import { root, src } from "../fixtures/standardImageUrlsViaRootRelativeJsImport/styles.css";
      
      export default function() {
        return (
          <img
            data-testid="standard-image-urls-via-root-relative-js-import"
            src={src}
            className={root}
          />
        )
      }
    `,
  });
  test("Standard image URLs via root-relative JS import", async ({ page }) => {
    let app = new PlaywrightFixture(appFixture, page);
    let imgStatus: number | null = null;
    app.page.on("response", (res) => {
      if (res.url().endsWith(".svg")) imgStatus = res.status();
    });
    await app.goto("/standard-image-urls-via-root-relative-js-import-test");
    let element = await app.getElement(
      "[data-testid='standard-image-urls-via-root-relative-js-import']"
    );
    expect(element.attr("src")).toContain(".svg");
    expect(imgStatus).toBe(200);
  });
});
