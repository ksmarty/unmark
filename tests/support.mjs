import http from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
  ".ico": "image/x-icon",
};

/** Serve the production build on an ephemeral port so tests need no dev server. */
export async function startStaticServer(root = "dist") {
  if (!existsSync(path.join(root, "index.html"))) {
    throw new Error(`No production build in ${root}/ — run \`npm run build\` first.`);
  }

  const server = http.createServer((request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
    const resolved = path.join(root, pathname);
    const file = existsSync(resolved) && statSync(resolved).isFile() ? resolved : path.join(root, "index.html");

    response.writeHead(200, { "content-type": MIME[path.extname(file)] ?? "application/octet-stream" });
    createReadStream(file).pipe(response);
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();

  return {
    url: `http://127.0.0.1:${port}/`,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

export function findChromium() {
  const candidates = [
    process.env.CHROMIUM_PATH,
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/usr/bin/google-chrome",
  ].filter(Boolean);

  return candidates.find((candidate) => existsSync(candidate));
}

export async function launchBrowser() {
  const executablePath = findChromium();

  if (!executablePath) {
    throw new Error("No Chromium binary found. Set CHROMIUM_PATH to a chrome/chromium executable.");
  }

  return chromium.launch({ executablePath, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
}

/** Fresh context, load the demo batch (no API key needed) and open the comparison. */
export async function openDemoCompare(browser, baseUrl, { mobile = false } = {}) {
  const context = await browser.newContext(
    mobile
      ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true }
      : { viewport: { width: 1280, height: 900 } },
  );
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  page.on("console", (message) => message.type() === "error" && errors.push(message.text()));

  await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Try a demo batch" }).click();
  await page.getByRole("button", { name: /^Compare$/ }).first().waitFor({ state: "visible", timeout: 15_000 });
  await page.getByRole("button", { name: /^Compare$/ }).first().click();

  const slider = page.locator('[data-rcs="handle-root"]');
  await slider.waitFor({ state: "visible", timeout: 10_000 });
  await page.waitForTimeout(350); // let the dialog's entry animation settle

  return { context, page, slider, errors };
}

export async function position(page) {
  const raw = await page.locator('[data-rcs="handle-root"]').getAttribute("aria-valuenow");
  return Number(raw);
}

export async function stageBox(page) {
  const box = await page.locator('[data-rcs="root"]').boundingBox();
  if (!box) throw new Error("The slider has no layout box.");
  return box;
}

/** Desktop drag: pointer events from a real mouse. */
export async function dragWithMouse(page, fromX, fromY, toX, toY) {
  await page.mouse.move(fromX, fromY);
  await page.mouse.down();
  const steps = 12;
  for (let step = 1; step <= steps; step += 1) {
    await page.mouse.move(fromX + ((toX - fromX) * step) / steps, fromY + ((toY - fromY) * step) / steps);
  }
  await page.mouse.up();
}

/** Mobile drag: real touch events through the DevTools protocol (Playwright has no touch-drag API). */
export async function dragWithTouch(context, page, fromX, fromY, toX, toY) {
  const cdp = await context.newCDPSession(page);
  const touch = (x, y) => [{ x, y, id: 1, radiusX: 6, radiusY: 6, force: 1 }];

  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: touch(fromX, fromY) });
  const steps = 12;
  for (let step = 1; step <= steps; step += 1) {
    const x = fromX + ((toX - fromX) * step) / steps;
    const y = fromY + ((toY - fromY) * step) / steps;
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: touch(x, y) });
    await page.waitForTimeout(16);
  }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await cdp.detach();
}
