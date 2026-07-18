#!/usr/bin/env node
// Visual check: captures the tester's key screens at multiple sizes.
// CI: .github/workflows/visual-check.yml uploads the output as an artifact.
// Local: node tools/visual-check.js [outDir]
//   Uses the full `playwright` package when installed (CI); otherwise
//   `playwright-core` with the CHROMIUM_PATH env var pointing at a browser.
"use strict";
const path = require("path");
const fs = require("fs");

let pw;
try { pw = require("playwright"); } catch (_) { pw = require("playwright-core"); }

const SIZES = [
  { tag: "1368x912", width: 1368, height: 912 },   // Surface Pro 7 (kiosk target)
  { tag: "2560x1440", width: 2560, height: 1440 }, // large exhibition monitor
  { tag: "1024x768", width: 1024, height: 768 },   // small browser window
];

const THEMES = [
  { id: "default" },
  { id: "lcd" },
];

(async () => {
  const outDir = process.argv[2] || "screenshots";
  fs.mkdirSync(outDir, { recursive: true });
  const uiPath = path.resolve(__dirname, "..", "ui", "index.html");
  const uiUrl = "file://" + uiPath + "?kiosk=1";
  const launchOpts = {};
  if (process.env.CHROMIUM_PATH) launchOpts.executablePath = process.env.CHROMIUM_PATH;
  const browser = await pw.chromium.launch(launchOpts);
  for (const s of SIZES) {
    const page = await browser.newPage({ viewport: { width: s.width, height: s.height } });
    await page.goto(uiUrl);
    await page.waitForTimeout(600);
    const shot = (name) => page.screenshot({ path: path.join(outDir, `${s.tag}-${name}.png`) });
    await shot("attract");
    await page.keyboard.press("KeyA"); // any key dismisses the attract screen
    await page.waitForTimeout(400);
    await shot("main");
    await page.mouse.move(s.width * 0.35, s.height * 0.45, { steps: 8 });
    await page.mouse.down();
    await page.mouse.up();
    await page.waitForTimeout(180); // mid click-ripple
    await shot("click-effect");
    await page.mouse.wheel(0, 240);
    await page.waitForTimeout(120); // mid scroll-chevrons
    await shot("scroll-effect");
    await page.close();
  }
  const mainSize = SIZES[0];
  for (const theme of THEMES) {
    if (theme.id === "default") continue;
    const page = await browser.newPage({ viewport: { width: mainSize.width, height: mainSize.height } });
    await page.addInitScript((id) => localStorage.setItem("olsk60.theme", id), theme.id);
    await page.goto(uiUrl);
    await page.waitForTimeout(600);
    await page.keyboard.press("KeyA");
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(outDir, `${mainSize.tag}-main-${theme.id}.png`) });
    await page.close();
  }
  await browser.close();
  console.log("visual-check: screenshots written to " + outDir);
})().catch((e) => { console.error(e); process.exit(1); });
