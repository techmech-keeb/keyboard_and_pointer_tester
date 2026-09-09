#!/usr/bin/env node
// Capture actual browser output and assert layout/input behavior.
// Synthetic wheel/Vial fixtures verify UI logic, not hardware capability.
"use strict";
const path = require("node:path");
const fs = require("node:fs");
const assert = require("node:assert/strict");
let pw;
try { pw = require("playwright"); } catch (_) { pw = require("playwright-core"); }
const SIZES = [
  { tag: "1368x912", width: 1368, height: 912 },
  { tag: "2560x1440", width: 2560, height: 1440 },
  { tag: "1024x768", width: 1024, height: 768 },
];
const THEMES = ["default", "lcd"];
const settle = (page) => page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));

async function wheel(page, values, target = "kbPanel") {
  return page.evaluate(({ values, target }) => {
    const node = document.getElementById(target);
    let prevented = true;
    for (const value of values) {
      const e = new WheelEvent("wheel", {
        bubbles: true, cancelable: true, clientX: 460, clientY: 400,
        deltaY: value.dy || 0, deltaX: value.dx || 0, deltaMode: value.mode || 0,
      });
      // Legacy properties are explicit fixtures, not CDP/hardware observations.
      Object.defineProperties(e, {
        wheelDeltaY: { value: value.legacyY },
        wheelDeltaX: { value: value.legacyX },
        wheelDelta: { value: value.legacy },
      });
      node.dispatchEvent(e);
      prevented = prevented && e.defaultPrevented;
    }
    return { prevented, state: ScrollLab.state };
  }, { values, target });
}

async function layoutCheck(page, name) {
  const result = await page.evaluate(() => {
    const failures = [];
    const primary = ["typePanel", "kbPanel", "keyboard", "scrollPanel", "scrollViewport", "monitorBar"];
    for (const id of primary) {
      const el = document.getElementById(id), r = el.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0 || r.x < -1 || r.y < -1 || r.right > innerWidth + 1 || r.bottom > innerHeight + 1)
        failures.push(id + ": viewport overflow");
      if (id !== "scrollViewport" && (el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1))
        failures.push(id + ": content overflow " + el.scrollHeight + "/" + el.clientHeight + " " + el.scrollWidth + "/" + el.clientWidth);
    }
    for (const id of ["phraseLine", "practiceStats", "scrollTitle", "scrollPercent", "clickPills", "scrollViz", "scrollResolution"]) {
      const el = document.getElementById(id), r = el.getBoundingClientRect();
      if (r.width && (r.right > innerWidth + 1 || r.bottom > innerHeight + 1)) failures.push(id + ": offscreen");
    }
    if (window.scrollX || window.scrollY || document.documentElement.scrollTop || document.body.scrollTop) failures.push("document scrolled");
    const model = document.getElementById("keyboard").getBoundingClientRect();
    const wrap = document.getElementById("kbWrap").getBoundingClientRect();
    if (model.x < wrap.x - 1 || model.y < wrap.y - 1 || model.right > wrap.right + 1 || model.bottom > wrap.bottom + 1)
      failures.push("keyboard: outside its allocated area");
    const paper = document.getElementById("scrollViewport");
    return { failures, model: { width: model.width, height: model.height }, scrollScreens: paper.scrollHeight / paper.clientHeight };
  });
  assert.deepEqual(result.failures, [], name);
  assert.ok(result.scrollScreens >= 20 && result.scrollScreens <= 31, name + ": content length " + result.scrollScreens);
  return result;
}

async function inputChecks(page) {
  const reset = async () => { await page.evaluate(() => resetAll(false)); await settle(page); };
  const near = (actual, expected, label) => assert.ok(Math.abs(actual - expected) < 1e-6, label + ": " + actual + " != " + expected);
  for (const target of ["keyboard", "monitorBar", "typePanel", "scrollViewport"]) {
    await reset();
    const result = await wheel(page, [{ dy: 12.5 }], target);
    assert.equal(result.prevented, true, target + ": default not prevented");
    near(result.state.position, 12.5, target);
    await settle(page);
    assert.ok(Math.abs(await page.$eval("#scrollViewport", e => e.scrollTop) - 12.5) <= 1, target + ": rendered position");
    await reset();
    const area = await page.locator("#" + target).boundingBox();
    await page.mouse.move(area.x + area.width / 2, area.y + area.height / 2);
    await page.mouse.wheel(0, 40); // Browser-dispatched input exercises default prevention.
    await page.waitForFunction(() => ScrollLab.state.position === 40);
    await settle(page);
    assert.equal(await page.$eval("#scrollViewport", e => e.scrollTop), 40, target + ": browser wheel");
    assert.equal(await page.evaluate(() => window.scrollY), 0);
  }
  await reset();
  let result = await wheel(page, [{ dy: -10 }, { dy: 5 }]);
  near(result.state.position, 5, "top reversal");
  await reset();
  result = await wheel(page, [{ dy: .25 }, { dy: .25 }, { dy: .25 }, { dy: .25 }]);
  near(result.state.position, 1, "fractional input");
  await reset();
  const units = await page.evaluate(() => ScrollLab.state);
  result = await wheel(page, [{ dy: .5, mode: 1 }, { dy: .25, mode: 2 }]);
  near(result.state.position, units.lineHeight * .5 + units.pageHeight * .25, "line/page conversion");
  await reset();
  result = await wheel(page, Array.from({ length: 10000 }, () => ({ dy: .1 })));
  near(result.state.position, 1000, "10,000 events");
  near(result.state.absolute, 1000, "input conservation");
  await settle(page);
  assert.ok(Math.abs(await page.$eval("#scrollViewport", e => e.scrollTop) - 1000) <= 1);
  assert.equal(await page.$eval("#inputFeed", e => e.children.length), 1, "feed is grouped by amount");
  await reset();
  result = await wheel(page, [{ dy: 1e6 }, { dy: -.25 }]);
  near(result.state.position, result.state.max - .25, "bottom reversal");
  await reset();
  result = await wheel(page, [{ dx: 80 }]);
  near(result.state.position, 0, "horizontal input does not move vertical content");
  for (const legacy of [120, 240, 180, 119.99997, 10, 40]) {
    await reset();
    await wheel(page, [{ dy: 20, legacyY: legacy }]);
    await settle(page);
    assert.equal(await page.$eval("#scrollResolution", e => e.dataset.resolution), legacy < 119.5 ? "high" : "standard");
  }
  await reset();
  await wheel(page, [{ dy: .25 }]);
  await settle(page);
  assert.equal(await page.$eval("#scrollResolution", e => e.dataset.resolution), "unknown");
  await page.evaluate(() => {
    document.dispatchEvent(new WheelEvent("wheel", { deltaY: 75, bubbles: true, cancelable: true }));
    resetAll(false);
  });
  await settle(page);
  near(await page.evaluate(() => ScrollLab.state.position), 0, "reset before rAF");
  assert.equal(await page.$eval("#scrollViewport", e => e.scrollTop), 0);
  assert.equal(await page.$eval("#scrollResolution", e => e.dataset.resolution), "unknown");
  assert.equal(await page.$eval("#numScroll", e => e.textContent), "0");

  await page.evaluate(() => { phrases = ["type without leaving home row"]; phraseIdx = -1; practiceNext(); });
  await page.keyboard.type("type ");
  await wheel(page, [{ dy: 40 }]);
  await page.keyboard.down("KeyW");
  await settle(page);
  assert.equal(await page.$eval('.key[data-id="KeyW"]', e => e.classList.contains("down")), true);
  assert.equal(await page.$eval("#keyCount", e => e.textContent), "6");
  assert.equal(await page.$eval("#phraseLine", e => e.querySelectorAll(".ok").length), 6);
  await page.keyboard.up("KeyW");

  await page.evaluate(() => { setJpInput(true); setMode(true); });
  await page.keyboard.type("hello ");
  await wheel(page, [{ dy: 20 }], "typePanel");
  await page.keyboard.type("scroll");
  assert.equal(await page.$eval("#hiddenInput", e => e.value), "hello scroll");
  assert.equal(await page.evaluate(() => document.activeElement.id), "hiddenInput");
  // Composition handlers are exercised; OS IME candidate windows require hardware.
  await page.evaluate(() => {
    hiddenInput.dispatchEvent(new CompositionEvent("compositionstart", { data: "" }));
    hiddenInput.value += "ことば";
    hiddenInput.dispatchEvent(new CompositionEvent("compositionupdate", { data: "ことば" }));
  });
  await wheel(page, [{ dy: .5 }]);
  assert.equal(await page.$eval("#freeDisplay .comp", e => e.textContent), "ことば");
  await page.evaluate(() => hiddenInput.dispatchEvent(new CompositionEvent("compositionend", { data: "ことば" })));

  await page.evaluate(() => { document.getElementById("staffMenu").hidden = false; document.getElementById("themeSelect").focus(); });
  const paused = await page.evaluate(() => ScrollLab.state.position);
  await wheel(page, [{ dy: 50 }], "staffOptions");
  near(await page.evaluate(() => ScrollLab.state.position), paused, "staff modal pauses background");
  await page.waitForTimeout(60);
  assert.equal(await page.evaluate(() => document.activeElement.id), "themeSelect", "staff focus is not stolen");
  await page.evaluate(() => { document.getElementById("staffMenu").hidden = true; resumeFreeFocus(); });
  assert.equal(await page.evaluate(() => document.activeElement.id), "hiddenInput");

  await reset();
  // Use the registered profile object even when an id is renamed.
  await page.evaluate(() => applyBoard(BOARDS.find(b => !b.pointing)));
  await wheel(page, [{ dy: 12 }]);
  await settle(page);
  near(await page.evaluate(() => ScrollLab.state.position), 12, "profile without TrackPoint");
  await page.evaluate(() => applyBoard(DEFAULT_BOARD));
  await reset();

  // The Vial fixture models responses only; it is not a connected-device test.
  const legends = await page.evaluate(() => {
    VS.connected = true; VS.layers = 4;
    VS.keymap = Array.from({ length: 4 }, () => Array.from({ length: VS.rows }, () => new Array(VS.cols).fill(0x0004)));
    const key = BOARD.keys.find(k => k.code === "KeyA");
    const [r, c] = key.m;
    VS.keymap[1][r][c] = 0x0005;
    VS.viewLayer = 1; buildLayerTabs(); applyLayerView();
    const label = matrixEls.get(r + "," + c).querySelector(".keycap").textContent;
    vialMatrixEdge(r, c, true);
    const down = matrixEls.get(r + "," + c).classList.contains("down");
    vialMatrixEdge(r, c, false);
    VS.viewLayer = 0; applyLayerView();
    setAutoLayerSimConfig({ on: true, delay: 150 });
    return { label, down };
  });
  assert.equal(legends.label, "B"); assert.equal(legends.down, true);
  await wheel(page, Array.from({ length: 10000 }, () => ({ dy: .0008 })));
  near(await page.evaluate(() => ScrollLab.state.position), 8, "connected input burst");
  assert.equal(await page.evaluate(() => VS.viewLayer), 3, "auto-layer simulation on wheel");
  await page.waitForTimeout(200);
  assert.equal(await page.evaluate(() => VS.viewLayer), 0, "auto-layer simulation restores view");

  // 同じ PC に別の Vial 機が挿さっていても、登録済みボードの機を先に選ぶ。
  const picked = await page.evaluate(() => {
    const rmk = BOARDS.find(b => b.id === "olsk60v2-rmk");
    const other = { uid: new Uint8Array(8), uidHex: "0000000000000000", vendorId: 0x1234, productId: 0x0001 };
    const olsk = { uid: Uint8Array.from(rmk.match.uid), uidHex: "1eebcb509f6b94ee", vendorId: 0x746D, productId: 0x0102 };
    return [pickPreferredCandidate([other, olsk], "").uidHex, pickPreferredCandidate([other, olsk], other.uidHex).uidHex];
  });
  assert.deepEqual(picked, ["1eebcb509f6b94ee", "0000000000000000"], "candidate preference");

  // 未登録の機や matrix が食い違う定義は、値は読んでも絵には重ねない。
  const guard = await page.evaluate(async () => {
    const dev = { readLayoutOptions: async () => 1 };
    const foreign = { matrix: { rows: 1, cols: 3 }, layouts: { labels: ["Opt"], keymap: [["0,0", "0,1", "0,2"]] } };
    const unknown = await vialReadLayoutOptions(dev, foreign, false);
    const mismatch = await vialReadLayoutOptions(dev, foreign, true);
    const own = await vialReadLayoutOptions(dev, null, true);
    return { unknown: unknown && unknown.keys, unknownFits: unknown && unknown.fits,
      mismatch: mismatch && mismatch.keys, own: own && own.keys.length };
  });
  assert.deepEqual(guard, { unknown: null, unknownFits: false, mismatch: null, own: 62 }, "device layout guard");

  // unlock の案内は、マウスレイヤー表示中でも刻印（Esc と Enter）で名付ける。
  const unlockHint = await page.evaluate(async () => {
    const esc = BOARD.keys.find(k => k.code === "Escape").m, enter = BOARD.keys.find(k => k.code === "Enter").m;
    VS.keymap[3][esc[0]][esc[1]] = 0x5200; // TO(0)
    VS.viewLayer = 3; applyLayerView();
    VS.unlocked = false;
    VS.dev = {
      readUnlockStatus: async () => ({ unlocked: false, keys: [esc, enter] }),
      unlockStart: async () => { throw new Error("fixture: stop before polling"); },
    };
    await vialUnlockStart();
    const text = document.getElementById("unlockHint").textContent;
    const layer = VS.viewLayer;
    VS.dev = null; VS.keymap[3][esc[0]][esc[1]] = 0x0004; VS.viewLayer = 0; applyLayerView();
    return { text, layer };
  });
  assert.ok(unlockHint.text.includes("Esc と Enter"), "unlock hint names the legends: " + unlockHint.text);
  assert.equal(unlockHint.layer, 0, "unlock resets the view to the base layer");
  await page.evaluate(() => { autoLayerSimCancel(); VS.connected = false; VS.keymap = null; vialRestoreStatic(); setAutoLayerSimConfig({ on: true, delay: 800 }); });
  await reset();
}

async function idleCheck(page) {
  await page.keyboard.type("a");
  await wheel(page, [{ dy: 50, legacyY: 10 }]);
  await page.evaluate(() => { S.lastInput = performance.now() - IDLE_RESET_MS - 1; });
  await page.waitForFunction(() => S.attract, undefined, { timeout: 6500 });
  assert.equal(await page.evaluate(() => ScrollLab.state.position), 0, "idle reset position");
  assert.equal(await page.$eval("#keyCount", e => e.textContent), "0");
  assert.equal(await page.$eval("#scrollResolution", e => e.dataset.resolution), "unknown");
}

async function recoveryChecks(page, shot) {
  // Exercise the real phrase pool; the fixed short phrase alone cannot test wrapping.
  const overflow = await page.evaluate(() => {
    resetAll(false);
    const all = PRACTICE_PHRASES.concat(BOARD.phrases || []).sort((a, b) => a.length - b.length);
    const failures = [];
    for (const text of all) {
      phrases = [text]; phraseIdx = -1; practiceNext();
      const box = document.getElementById("typePanel").getBoundingClientRect();
      for (const el of spans) {
        const r = el.getBoundingClientRect();
        if (r.top < box.top || r.bottom > box.bottom || r.left < box.left || r.right > box.right) failures.push(text);
      }
    }
    return failures;
  });
  assert.deepEqual(overflow, [], "all bundled phrases fit the typing band");
  await shot("long-phrase");
  await page.evaluate(() => { phrases = ["a"]; phraseIdx = -1; practiceNext(); });
  await page.keyboard.type("a");
  assert.equal(await page.$eval("#clearFlash", e => e.classList.contains("show")), true);
  await page.keyboard.press("Escape");
  assert.equal(await page.$eval("#clearFlash", e => e.classList.contains("show")), false, "skip cancels clear effect");
  await page.keyboard.type("a");
  await page.evaluate(() => resetAll(false));
  assert.equal(await page.$eval("#clearFlash", e => e.classList.contains("show")), false, "reset cancels clear effect");
  await page.evaluate(() => {
    setJpInput(true); setMode(true);
    hiddenInput.value = "入力を続けながら、文章をスクロールします。\n".repeat(20);
    hiddenInput.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await wheel(page, [{ dy: .5 }]);
  assert.ok(await page.$eval("#freeDisplay", e => e.scrollTop > 0), "long free input keeps the caret visible");
  await layoutCheck(page, "long free input");
  await page.evaluate(() => {
    hiddenInput.value = ""; renderFree();
    VS.connected = true; VS.unlocked = true; VS.layers = 4;
    VS.keymap = Array.from({ length: 4 }, () => Array.from({ length: VS.rows }, () => new Array(VS.cols).fill(0x0004)));
    const key = BOARD.keys.find(k => k.code === "__Fn2");
    VS.keymap[0][key.m[0]][key.m[1]] = 0x5222;
    buildLayerTabs(); applyLayerView(); tourEngine.updateGuideButton();
  });
  await page.locator("#guideBtn").click();
  await page.waitForTimeout(80); // Let the old blur-refocus timeout run while the menu is open.
  await page.keyboard.press("Escape");
  await page.keyboard.type("back from guide");
  assert.equal(await page.$eval("#hiddenInput", e => e.value), "back from guide", "Esc restores focus without a click");

  // Use the longest existing guide text in a clearly synthetic display fixture.
  await page.evaluate(() => {
    window.originalFixtureTours = tourEngine.getToursFor(BOARD.id);
    const steps = originalFixtureTours.flatMap(t => t.steps);
    const longest = steps.reduce((a, b) => (a.body || "").length > (b.body || "").length ? a : b);
    tourEngine.registerTours(BOARD.id, [{ id: "layout-fixture", title: "表示検証", steps: [{ ...longest, target: { mo: 2 }, cond: { type: "next" } }] }]);
    tourEngine.start("layout-fixture");
  });
  await settle(page);
  const guide = await page.evaluate(() => {
    const card = document.querySelector(".tour-card"), r = card.getBoundingClientRect();
    const model = keyboardEl.getBoundingClientRect();
    return { overflow: card.scrollHeight > card.clientHeight + 1, coversModel: r.bottom > model.top && r.top < model.bottom, outside: r.top < 0 || r.right > innerWidth || r.bottom > innerHeight };
  });
  assert.deepEqual(guide, { overflow: false, coversModel: false, outside: false }, "guide remains readable above keyboard");
  await shot("guide-fixture");
  await page.keyboard.press("Escape");
  await page.keyboard.type(" again");
  assert.equal(await page.$eval("#hiddenInput", e => e.value), "back from guide again", "tour stop restores input");
  await page.evaluate(() => {
    tourEngine.registerTours(BOARD.id, originalFixtureTours); delete window.originalFixtureTours;
    VS.connected = false; VS.unlocked = false; VS.keymap = null;
    vialRestoreStatic(); tourEngine.updateGuideButton(); resetAll(false);
  });
}

(async () => {
  const outDir = path.resolve(process.argv[2] || "screenshots");
  fs.mkdirSync(outDir, { recursive: true });
  const launch = {};
  if (process.env.CHROMIUM_PATH) launch.executablePath = process.env.CHROMIUM_PATH;
  if (process.env.CHROMIUM_DISABLE_GPU === "1") launch.args = ["--disable-gpu"];
  const browser = await pw.chromium.launch(launch);
  const report = { browser: browser.version(), hardwareVerified: false, passed: false, screenshots: [], layouts: [] };
  try {
    for (const size of SIZES) for (const theme of THEMES) {
      const page = await browser.newPage({ viewport: { width: size.width, height: size.height } });
      const errors = [];
      page.on("pageerror", e => errors.push(e.message));
      await page.addInitScript(theme => {
        localStorage.setItem("olsk60.theme", theme);
        localStorage.setItem("olsk60.jpInput", "0");
      }, theme);
      await page.goto("file://" + path.resolve(__dirname, "../ui/index.html") + "?kiosk=1");
      await page.evaluate(async () => { await document.fonts.ready; });
      await settle(page);
      const tag = size.tag + "-" + theme;
      const shot = async (state) => {
        const filename = tag + "-" + state + ".png";
        await page.screenshot({ path: path.join(outDir, filename) });
        report.screenshots.push(filename);
      };
      await shot("attract");
      await page.evaluate(() => {
        resetAll(false);
        phrases = ["type without leaving home row"]; phraseIdx = -1; practiceNext();
      });
      await settle(page);
      report.layouts.push({ tag, ...await layoutCheck(page, tag) });
      await shot("start");
      await page.keyboard.type("type without ");
      await page.keyboard.down("KeyL");
      await shot("key-down");
      await page.keyboard.up("KeyL");
      await page.mouse.move(size.width * .42, size.height * .43);
      await page.mouse.move(size.width * .60, size.height * .52, { steps: 16 });
      await shot("pointer");
      await page.mouse.down(); await page.mouse.up();
      await shot("click");
      await wheel(page, [{ dy: 64, legacyY: 120 }]);
      await settle(page);
      await wheel(page, Array.from({ length: 8 }, () => ({ dy: .25, legacyY: 10 })));
      await settle(page);
      await shot("precision-fixture");
      const maximum = await page.evaluate(() => ScrollLab.state.max);
      await page.evaluate(() => resetAll(false));
      await wheel(page, [{ dy: maximum / 2 }]);
      await settle(page);
      await shot("middle");
      await wheel(page, [{ dy: maximum }]);
      await settle(page);
      await shot("end");
      await page.evaluate(() => resetAll(false));
      // Large continuous input, with a frame between bursts.
      for (let i = 0; i < 12; i++) { await wheel(page, [{ dy: 160, legacyY: 240 }], "monitorBar"); await settle(page); }
      await shot("fast-fixture");
      await page.evaluate(() => { setJpInput(true); setMode(true); });
      await page.keyboard.type("typing and scrolling, together.");
      await wheel(page, [{ dy: 16 }], "typePanel");
      await settle(page);
      await shot("free-input");
      await layoutCheck(page, tag + "-free");
      // 端末が保存しているレイアウト（5-Split・エンコーダ有り = 1）を重ねた状態。
      // 応答の合成だけで、接続機の検証ではない。
      const overlay = await page.evaluate(() => {
        applyBoard(BOARDS.find(b => b.id === "olsk60v2-rmk")); // 既定は QMK 版（プッシュは 5,13）
        const parsed = VialLayout.parseKle(BOARD.layoutKeymap);
        applyDeviceLayout(VialLayout.selectLayout(parsed, VialLayout.decodeOptions(BOARD.layoutLabels, 1)));
        return { push: matrixEls.has("5,12"), arrowDown: matrixEls.has("4,11"),
          encoders: document.querySelectorAll(".key.encoder").length, keys: activeKeys().length };
      });
      assert.deepEqual(overlay, { push: true, arrowDown: false, encoders: 2, keys: 62 }, "device layout overlay");
      await settle(page);
      await shot("device-layout");
      await layoutCheck(page, tag + "-device-layout");
      const restored = await page.evaluate(() => {
        clearDeviceLayout();
        const r = { keys: activeKeys().length, encoders: document.querySelectorAll(".key.encoder").length, arrowDown: matrixEls.has("4,11") };
        applyBoard(DEFAULT_BOARD);
        return r;
      });
      assert.deepEqual(restored, { keys: 60, encoders: 0, arrowDown: true }, "profile restored after overlay");
      await inputChecks(page);
      await recoveryChecks(page, shot);
      if (size === SIZES[0] && theme === THEMES[0]) await idleCheck(page);
      assert.deepEqual(errors, [], tag + ": browser exceptions");
      console.log(tag + ": layout, mixed input, wheel, reset and Vial fixtures passed");
      await page.close();
    }
    report.passed = true;
  } finally {
    await browser.close();
    fs.writeFileSync(path.join(outDir, "verification.json"), JSON.stringify(report, null, 2) + "\n");
  }
  console.log("visual-check: " + report.screenshots.length + " screenshots; hardware/WebView2 remain unverified");
})().catch(e => { console.error(e); process.exit(1); });
