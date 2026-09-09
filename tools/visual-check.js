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
    VS.connected = true; VS.known = true; VS.layers = 4; // 登録機として繋がった想定
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

  // 打鍵でマウスレイヤー表示から抜けたあと、TP を動かせばまた戻る。模擬が
  // active のまま残ると、遅延が切れるまで戻らなくなる（2026-09-09 実機で観測）。
  const simRearm = await page.evaluate(async () => {
    const seen = [];
    const move = () => autoLayerSimPointerInput();
    setAutoLayerSimConfig({ on: true, delay: 800 });
    move(); seen.push(VS.viewLayer);                 // TP → マウスレイヤー
    vialMatrixEdge(2, 1, true); seen.push(VS.viewLayer);   // 素のキーを打つ → 抜ける
    vialMatrixEdge(2, 1, false);
    move(); seen.push(VS.viewLayer);                 // TP → 戻る
    autoLayerSimCancel(); VS.viewLayer = 0; applyLayerView();
    setAutoLayerSimConfig({ on: true, delay: 150 });
    return seen;
  });
  assert.deepEqual(simRearm, [3, 0, 3], "auto-layer simulation re-arms after a keypress");

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
    return { unknown: unknown && unknown.keys.length, unknownFits: unknown && unknown.fits,
      mismatch: mismatch && mismatch.keys, own: own && own.keys.length };
  });
  assert.deepEqual(guard, { unknown: 3, unknownFits: true, mismatch: null, own: 62 }, "device layout guard");

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
    VS.connected = true; VS.known = true; VS.unlocked = true; VS.layers = 4;
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
      // 2026-09-09 に実機で見つかった 2 件の再現。接続すると vialOnConnected が
      // 製品プロファイルへ切り替えるが、切断してもスタッフが選んだ既定ボードへ
      // 戻らなかった。またロック中は HID の通信が絶えて抜線を検知できなかった。
      const afterUnplug = await page.evaluate(() => {
        localStorage.setItem("olsk60.defaultBoard", "ansi104");
        applyBoard(BOARDS.find((b) => b.id === "olsk60v2-rmk")); // 接続で切り替わった状態
        VS.connected = true;
        VS.deviceName = "OLSK60 v2";
        applyDeviceName();
        VS.dev = { readUnlockStatus: async () => { throw new Error("unplugged"); } };
        vialStartHeartbeat();
        const armed = VS.beatTimer !== 0;                        // ロック中でも生存確認が動く
        vialDisconnect("fixture", false);                        // 再接続は張らない
        const out = {
          armed, beat: VS.beatTimer, board: BOARD.id, rows: VS.rows, cols: VS.cols,
          nameShown: !document.getElementById("kbDeviceName").hidden,
        };
        localStorage.removeItem("olsk60.defaultBoard");
        applyBoard(DEFAULT_BOARD);
        return out;
      });
      assert.deepEqual(afterUnplug,
        { armed: true, beat: 0, board: "ansi104", rows: 0, cols: 0, nameShown: false },
        "unplug falls back to the staff default board and drops the heartbeat");
      // 未登録の Vial 機は、製品プロファイルの絵ではなく端末定義と
      // 保存 layout options から一時ボードを描き、切断時は既定ボードへ戻す。
      const foreign = await page.evaluate(() => {
        localStorage.setItem("olsk60.defaultBoard", "ansi104");
        const def = { name: "Fixture 3-key" };
        const selected = {
          keys: [
            { row: 0, col: 0, x: 0, y: 0, w: 1, h: 1 },
            { row: 0, col: 1, x: 1, y: 0, w: 2, h: 1 },
          ],
          encoders: [],
        };
        VS.connected = true;
        VS.known = false; VS.rows = 1; VS.cols = 3; VS.layers = 1;
        VS.layoutOptions = { value: 1, labels: [], choices: [], keys: selected.keys, encoders: selected.encoders };
        VS.keymap = [[[0x0004, 0x0005, 0x0006]]]; // A / B / C
        applyUnregisteredDeviceLayout(def, VS.layoutOptions);
        VS.viewLayer = 0;
        applyLayerView();
        if (window.tourEngine) tourEngine.updateGuideButton();
        const caps = Array.from(document.querySelectorAll(".key:not(.encoder) .keycap"), (el) => el.textContent.trim());
        const out = {
          board: document.getElementById("kbBoardName").textContent,
          caps,
          widths: activeKeys().map((key) => key.w),
          trackpoints: document.querySelectorAll(".pointing").length,
          guideHidden: document.getElementById("guideBtn").hidden,
          productPhrases: BOARD.phrases || null,
          browserCodes: activeKeys().filter((key) => !key.code.startsWith("__m")).length,
        };
        return out;
      });
      assert.deepEqual(foreign,
        { board: "Fixture 3-key", caps: ["A", "B"], widths: [1, 2], trackpoints: 0,
          guideHidden: true, productPhrases: null, browserCodes: 0 },
        "an unregistered device uses only its definition");
      await settle(page);
      await shot("unregistered-device");
      const foreignRestored = await page.evaluate(() => {
        vialDisconnect("fixture", false);
        const restored = BOARD.id;
        localStorage.removeItem("olsk60.defaultBoard");
        applyBoard(DEFAULT_BOARD);
        return restored;
      });
      assert.equal(foreignRestored, "ansi104", "an unregistered device returns to the default board");
      // WebHID などで定義を取得できない未登録機は、直前のボードを残さず
      // スタッフが選んだ既定ボードへ戻し、利用者向けキャプションに理由を出す。
      const noDefinition = await page.evaluate(async () => {
        localStorage.setItem("olsk60.defaultBoard", "ansi104");
        applyBoard(BOARDS.find((b) => b.id === "olsk60v2-rmk"));
        VS.mode = "webhid";
        VS.transport = { vendorId: 0x1234, productId: 0x5678, product: "Unknown fixture", close() {} };
        VS.dev = {
          uid: new Uint8Array(8),
          readDefinition: async () => null,
          readLayerCount: async () => 1,
          readKeymap: async () => [[[0x0004]]],
          readUnlockStatus: async () => ({ unlocked: false, keys: [] }),
        };
        VS.rows = 1; VS.cols = 1;
        await vialOnConnected();
        const out = {
          board: BOARD.id,
          keys: activeKeys().length,
          caption: document.getElementById("kbCaption").textContent,
          deviceName: document.getElementById("kbDeviceName").textContent,
        };
        clearTimeout(VS.beatTimer);
        VS.beatTimer = 0;
        return out;
      });
      assert.deepEqual(noDefinition, {
        board: "ansi104",
        keys: 104,
        caption: "この機の定義を取得できないため、選択中の既定ボードによる汎用表示です",
        deviceName: "接続中: Unknown fixture",
      }, "an unregistered device without a definition uses the selected generic board");
      await settle(page);
      await shot("unregistered-no-definition");
      await page.evaluate(() => {
        vialDisconnect("fixture", false);
        localStorage.removeItem("olsk60.defaultBoard");
        applyBoard(DEFAULT_BOARD);
      });
      // 汎用表示へ落とした端末は、絵の matrix 座標が端末のものではない。押下を
      // 追うと既定ボード（既定は OLSK60）の無関係なキーが光るので、unlock 済みでも
      // マトリクスポーリングを始めないこと。押下を絵へ渡す経路はここだけなので、
      // ポーリングを止めていることが誤点灯を防いでいる根拠になる。
      const noDefinitionUnlocked = await page.evaluate(async () => {
        localStorage.setItem("olsk60.defaultBoard", "olsk60v2-qmk");
        VS.mode = "webhid";
        VS.transport = { vendorId: 0x1234, productId: 0x5678, product: "Unknown fixture", close() {} };
        VS.dev = {
          uid: new Uint8Array(8),
          readDefinition: async () => null,
          readLayerCount: async () => 1,
          readKeymap: async () => [[[0x0004, 0x0005]]],
          readUnlockStatus: async () => ({ unlocked: true, keys: [] }),
          readMatrix: async () => [0b11],
        };
        VS.rows = 1; VS.cols = 2;
        await vialOnConnected();
        const out = {
          board: BOARD.id,
          polling: VS.pollTimer !== 0,
          matrixEls: matrixEls.size,     // 既定ボードの座標は載っている（＝渡せば光る）
        };
        vialDisconnect("fixture", false);
        localStorage.removeItem("olsk60.defaultBoard");
        applyBoard(DEFAULT_BOARD);
        return out;
      });
      assert.deepEqual(noDefinitionUnlocked,
        { board: "olsk60v2-qmk", polling: false, matrixEls: 60 },
        "a generic fallback does not follow the device matrix");
      // unlock が成立した瞬間、接続時とは別の場所でバッジ・キャプション・
      // ポーリングを書いていたため、未登録機が登録機向けの表示に化けていた。
      // 判定は vialApplyConnectionView 1 か所に寄せてある。
      const unlockKeepsState = await page.evaluate(async () => {
        const view = () => ({
          badge: document.getElementById("vialBadge").textContent,
          caption: document.getElementById("kbCaption").textContent,
          polling: VS.pollTimer !== 0,
        });
        // 定義を取れた未登録機（キオスク経路）と、取れない未登録機（WebHID）。
        const run = async (definition) => {
          let polls = 0;
          VS.mode = "webhid";
          VS.transport = { vendorId: 0x1234, productId: 0x5678, product: "OmniTB", close() {} };
          VS.dev = {
            uid: new Uint8Array(8),
            readDefinition: async () => definition,
            readLayoutOptions: async () => 0,
            readLayerCount: async () => 1,
            readKeymap: async () => [[[0x0004, 0x0005]]],
            readUnlockStatus: async () => ({ unlocked: false, keys: [[0, 0]] }),
            readMatrix: async () => [0],
            unlockStart: async () => {},
            unlockPoll: async () => ({ unlocked: ++polls > 1, counter: 0 }),
          };
          VS.rows = 1; VS.cols = 2;
          await vialOnConnected();
          const connected = view();
          await vialUnlockStart();
          await new Promise((r) => setTimeout(r, 400));   // unlockTimer が成立を拾うまで
          const unlocked = view();
          clearTimeout(VS.beatTimer); clearTimeout(VS.pollTimer); clearInterval(VS.unlockTimer);
          vialDisconnect("fixture", false);
          return { connected, unlocked };
        };
        const withDef = await run({
          name: "OmniTB fixture",
          matrix: { rows: 1, cols: 2 },
          layouts: { labels: [], keymap: [[{ a: 4 }, "0,0", "0,1"]] },
        });
        const withoutDef = await run(null);
        applyBoard(DEFAULT_BOARD);
        return { withDef, withoutDef };
      });
      // 定義から描けた機は unlock で押下も追うが、登録機の顔にはならない。
      assert.equal(unlockKeepsState.withDef.unlocked.badge, "VIAL 未登録機");
      assert.ok(unlockKeepsState.withDef.unlocked.caption.startsWith("未登録のキーボードです"),
        unlockKeepsState.withDef.unlocked.caption);
      assert.equal(unlockKeepsState.withDef.unlocked.polling, true);
      // 定義を取れない機は unlock しても汎用表示のまま、ポーリングも始めない。
      assert.deepEqual(unlockKeepsState.withoutDef.unlocked, unlockKeepsState.withoutDef.connected,
        "unlocking a definition-less device must not change the view");
      assert.equal(unlockKeepsState.withoutDef.unlocked.polling, false);
      assert.equal(unlockKeepsState.withoutDef.unlocked.caption,
        "この機の定義を取得できないため、選択中の既定ボードによる汎用表示です");
      // 登録機でも、端末が申告する matrix がプロファイルと食い違えば fits=false に
      // なり、絵はプロファイルのまま・キーマップだけ端末の寸法で読まれる。この
      // ずれた組み合わせで applyLayerView が範囲外を読んで落ちていた（PR #49）。
      const shortKeymap = await page.evaluate(() => {
        applyBoard(BOARDS.find((b) => b.id === "olsk60v2-rmk"));
        VS.connected = true; VS.known = true;
        VS.rows = 2; VS.cols = 3; VS.layers = 1;
        VS.keymap = [[[0x0004, 0x0005, 0x0006], [0x0004, 0x0005, 0x0006]]]; // A / B / C
        VS.layoutOptions = null;
        VS.viewLayer = 0;
        let threw = null;
        try { applyLayerView(); } catch (e) { threw = String(e); }
        const cap = (id) => document.querySelector(`.key[data-id="${id}"] .keycap`).textContent.trim();
        const out = {
          threw,
          inRange: cap("Escape"),   // [0,0] は端末の範囲内 → A
          outOfRange: cap("KeyA"),  // [2,1] は範囲外 → 割り当て無し
        };
        vialDisconnect("fixture", false);
        applyBoard(DEFAULT_BOARD);
        return out;
      });
      assert.deepEqual(shortKeymap, { threw: null, inRange: "A", outOfRange: "" },
        "a keymap smaller than the drawn board renders as unassigned instead of throwing");
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
