import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  dragWithMouse,
  dragWithTouch,
  findChromium,
  launchBrowser,
  openDemoCompare,
  position,
  stageBox,
  startStaticServer,
} from "./support.mjs";

/**
 * The comparison slider is the app's core interaction, and it is wired to a
 * third-party pointer implementation that changes behaviour based on the
 * pointer type. These tests drive it the way a person would — mouse on a
 * desktop, real touch events on a phone — so a regression cannot slip through.
 */

let server;
let browser;
const chromiumPath = findChromium();

before(async () => {
  if (!chromiumPath) return;
  server = await startStaticServer("dist");
  browser = await launchBrowser();
});

after(async () => {
  await browser?.close();
  await server?.close();
});

describe(
  "comparison slider",
  { skip: chromiumPath ? false : "no Chromium binary — set CHROMIUM_PATH to run browser tests" },
  () => {
  test("desktop: dragging across the image moves the divider", async () => {
    const { context, page, errors } = await openDemoCompare(browser, server.url);

    try {
      const start = await position(page);
      const box = await stageBox(page);
      const y = box.y + box.height / 2;
      await dragWithMouse(page, box.x + box.width * 0.3, y, box.x + box.width * 0.75, y);
      const end = await position(page);

      assert.equal(start, 50, "the divider should start in the middle");
      assert.ok(end > 68 && end < 82, `expected the divider near 75%, got ${end}%`);
      assert.deepEqual(errors, []);
    } finally {
      await context.close();
    }
  });

  test("mobile: touch-dragging the image moves the divider", async () => {
    const { context, page, errors } = await openDemoCompare(browser, server.url, { mobile: true });

    try {
      const box = await stageBox(page);
      const y = box.y + box.height / 2;
      await dragWithTouch(context, page, box.x + box.width * 0.3, y, box.x + box.width * 0.75, y);
      const end = await position(page);

      assert.ok(end > 68 && end < 82, `expected the divider near 75%, got ${end}%`);
      assert.deepEqual(errors, []);
    } finally {
      await context.close();
    }
  });

  test("mobile: touch-dragging the round handle moves the divider", async () => {
    const { context, page, errors } = await openDemoCompare(browser, server.url, { mobile: true });

    try {
      const box = await stageBox(page);
      // Grab the knob itself (it sits on the 50% divider) and pull it left.
      const knobX = box.x + box.width * 0.5;
      const knobY = box.y + box.height / 2;
      await dragWithTouch(context, page, knobX, knobY, box.x + box.width * 0.25, knobY);
      const end = await position(page);

      assert.ok(end > 18 && end < 32, `expected the divider near 25%, got ${end}%`);
      assert.deepEqual(errors, []);
    } finally {
      await context.close();
    }
  });

  test("mobile: a slightly diagonal thumb swipe still drags the divider", async () => {
    const { context, page, errors } = await openDemoCompare(browser, server.url, { mobile: true });

    try {
      const box = await stageBox(page);
      await dragWithTouch(
        context,
        page,
        box.x + box.width * 0.3,
        box.y + box.height * 0.35,
        box.x + box.width * 0.7,
        box.y + box.height * 0.65,
      );
      const end = await position(page);

      assert.ok(end > 63 && end < 77, `expected the divider near 70%, got ${end}%`);
      assert.deepEqual(errors, []);
    } finally {
      await context.close();
    }
  });

  test("keyboard: arrow keys move the divider in 4% steps", async () => {
    const { context, page, errors } = await openDemoCompare(browser, server.url);

    try {
      await page.locator('[data-rcs="handle-root"]').focus();
      await page.keyboard.press("ArrowRight");
      await page.keyboard.press("ArrowRight");
      assert.equal(await position(page), 58, "two 4% steps from 50%");

      for (let step = 0; step < 15; step += 1) await page.keyboard.press("ArrowRight");
      assert.equal(await position(page), 100, "the divider clamps at the far edge");

      for (let step = 0; step < 30; step += 1) await page.keyboard.press("ArrowLeft");
      assert.equal(await position(page), 0, "and clamps at the near edge");

      assert.deepEqual(errors, []);
    } finally {
      await context.close();
    }
  });
  },
);
