// =============================================================
// UI themes
// Classic script so the tester continues to run directly from file://.
// =============================================================
"use strict";

const THEMES = [
  { id: "default", name: "スタンダード" },
  { id: "lcd", name: "レトロ液晶" },
];
const THEME_KEY = "olsk60.theme";

function applyTheme(id) {
  const theme = THEMES.find((item) => item.id === id) || THEMES[0];
  if (theme.id === "default") document.documentElement.removeAttribute("data-theme");
  else document.documentElement.dataset.theme = theme.id;
  try { localStorage.setItem(THEME_KEY, theme.id); } catch (_) { /* ignore */ }
  refreshFxPalette();
  const select = document.getElementById("themeSelect");
  if (select) select.value = theme.id;
}

function savedTheme() {
  try {
    const id = localStorage.getItem(THEME_KEY);
    return THEMES.some((theme) => theme.id === id) ? id : "default";
  } catch (_) { return "default"; }
}

function applyThemeSelect() {
  const select = document.getElementById("themeSelect");
  select.innerHTML = "";
  for (const theme of THEMES) {
    const option = document.createElement("option");
    option.value = theme.id;
    option.textContent = theme.name;
    select.appendChild(option);
  }
  select.value = savedTheme();
}

applyThemeSelect();
document.getElementById("themeSelect").addEventListener("change", (event) => applyTheme(event.target.value));
applyTheme(savedTheme());
