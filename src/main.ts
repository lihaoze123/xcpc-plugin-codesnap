import { getXcpc, type XcpcBridge } from "@xcpc-workstation/plugin-sdk/ui";
import { detectLanguageFromFilename, LANGUAGES } from "./highlighter";
import { renderSnapshotToCanvas, type SnapshotConfig } from "./renderer";
import { BACKGROUND_PRESETS, CODE_THEMES } from "./themes";
import "./style.css";

type ExtendedClipboard = XcpcBridge["clipboard"] & {
  writeImage?: (pngBase64: string) => Promise<void>;
};

const STORAGE_KEY = "codesnap.config.v1";

const DEFAULT_CODE = `#include <bits/stdc++.h>
using namespace std;

constexpr long long MOD = 998244353;

long long qpow(long long a, long long b) {
    long long res = 1;
    for (a %= MOD; b > 0; b >>= 1, a = a * a % MOD) {
        if (b & 1) res = res * a % MOD;
    }
    return res;
}`;

const DEFAULT_CONFIG: SnapshotConfig = {
  code: DEFAULT_CODE,
  language: "cpp",
  themeId: "dark-plus",
  backgroundId: "codesnap",
  customBgColor: "#abb8c3",
  containerPadding: 48,
  roundedCorners: true,
  showWindowControls: true,
  showWindowTitle: false,
  windowTitle: "main.cpp",
  showLineNumbers: true,
  shadow: true,
  fontSize: 14,
  scale: 2,
};

// Iconic kufii/CodeSnap Nord aperture shutter SVG
const SHUTTER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28.3 28.3">
  <path fill="#EBCB8B" d="M8.495,3.628c0,0-3.556,1.322-5.656,6.294l11.585-2.19L8.495,3.628z"/>
  <path fill="#A3BE8C" d="M2.664,10.631c0,0-1.568,3.455,0.481,8.448l6.612-9.763L2.664,10.631z"/>
  <path fill="#8FBCBB" d="M3.588,19.571c0,0,1.322,3.556,6.294,5.656L7.693,13.64L3.588,19.571z"/>
  <path fill="#88C0D0" d="M10.591,25.401c0,0,3.455,1.567,8.448-0.481l-9.763-6.61L10.591,25.401z"/>
  <path fill="#81A1C1" d="M19.722,24.629c0,0,3.557-1.322,5.656-6.296l-11.586,2.189L19.722,24.629z"/>
  <path fill="#B48EAD" d="M25.071,9.177l-6.61,9.763l7.093-1.316C25.554,17.625,27.12,14.17,25.071,9.177z"/>
  <path fill="#BF616A" d="M24.628,8.685c0,0-1.322-3.556-6.295-5.655l2.189,11.585L24.628,8.685z"/>
  <path fill="#D08770" d="M17.624,2.855c0,0-3.453-1.568-8.447,0.482l9.764,6.61L17.624,2.855z"/>
  <path fill="#4C566A" d="M14.151,0C6.336,0,0,6.336,0,14.15C0,21.963,6.335,28.3,14.151,28.3c7.813,0,14.149-6.338,14.149-14.15C28.301,6.336,21.965,0,14.151,0z M14.151,27.206c-7.199,0-13.057-5.857-13.057-13.056S6.952,1.094,14.151,1.094c7.197,0,13.055,5.857,13.055,13.056C27.206,21.349,21.348,27.206,14.151,27.206z"/>
</svg>`;

let xcpc: XcpcBridge | null = null;
try {
  xcpc = getXcpc();
} catch {
  xcpc = null;
}

const state: SnapshotConfig = { ...DEFAULT_CONFIG };

// Hydrate initial code if opened with payload
if (xcpc?.initialPayload && typeof xcpc.initialPayload === "object") {
  const payload = xcpc.initialPayload as Record<string, unknown>;
  if (typeof payload.code === "string" && payload.code.trim().length > 0) {
    state.code = payload.code;
  }
  if (typeof payload.language === "string") {
    state.language = payload.language;
  }
  if (typeof payload.title === "string") {
    state.windowTitle = payload.title;
    state.showWindowTitle = true;
  }
}

const app = document.getElementById("app")!;
app.innerHTML = `
  <header class="toolbar">
    <div class="toolbar-group">
      <label class="field" title="代码语言"><span class="field-label">语言</span>
        <select id="sel-lang"></select>
      </label>
      <label class="field" title="配色主题"><span class="field-label">主题</span>
        <select id="sel-theme"></select>
      </label>
      <label class="field" title="卡片背景"><span class="field-label">背景</span>
        <select id="sel-bg"></select>
      </label>
      <input id="inp-custom-bg" type="color" value="#abb8c3" title="自定义背景色" style="display:none;" />
    </div>
    <span class="toolbar-sep"></span>
    <div class="toolbar-group">
      <label class="field" title="外边距留白"><span class="field-label">留白</span>
        <select id="sel-pad">
          <option value="0">无留白</option>
          <option value="24">紧凑</option>
          <option value="48" selected>原版</option>
          <option value="64">宽松</option>
        </select>
      </label>
      <label class="field" title="代码字号"><span class="field-label">字号</span>
        <select id="sel-font">
          <option value="12">12px</option>
          <option value="13">13px</option>
          <option value="14" selected>14px</option>
          <option value="16">16px</option>
          <option value="18">18px</option>
        </select>
      </label>
      <label class="field" title="导出倍率"><span class="field-label">倍率</span>
        <select id="sel-scale">
          <option value="1">1x</option>
          <option value="2" selected>2x</option>
          <option value="3">3x</option>
        </select>
      </label>
    </div>
    <div class="toolbar-spacer"></div>
    <div class="toolbar-group">
      <button id="btn-copy" class="btn primary" type="button">复制图片</button>
      <button id="btn-save" class="btn" type="button">保存 PNG</button>
    </div>
  </header>

  <main class="workspace">
    <section class="editor-pane">
      <div class="pane-bar">
        <span>代码输入</span>
        <button id="btn-open" class="btn" type="button">打开文件</button>
      </div>
      <textarea id="code-input" class="code-input" spellcheck="false" autocomplete="off" autocorrect="off" autocapitalize="off"></textarea>
    </section>

    <section class="preview-pane">
      <div class="pane-bar">
        <div class="preview-controls">
          <button id="tog-dots" class="toggle-btn active" type="button">圆点</button>
          <button id="tog-lines" class="toggle-btn active" type="button">行号</button>
          <button id="tog-round" class="toggle-btn active" type="button">圆角</button>
          <button id="tog-shadow" class="toggle-btn active" type="button">阴影</button>
          <button id="tog-title" class="toggle-btn" type="button">标题</button>
          <input id="inp-title" type="text" placeholder="main.cpp" style="width:110px;display:none;" />
        </div>
      </div>
      <div class="stage">
        <div id="canvas-frame" class="canvas-frame">
          <canvas id="preview-canvas"></canvas>
        </div>
        <div class="shutter-wrap">
          <button id="btn-shutter" class="shutter-btn" type="button" title="拍摄并复制图片（Shift+点击保存 PNG）">
            ${SHUTTER_SVG}
          </button>
          <span id="meta-dims" class="meta-dims"></span>
        </div>
      </div>
    </section>
  </main>

  <div id="flash-fx" class="flash-fx"></div>
`;

const selLang = document.getElementById("sel-lang") as HTMLSelectElement;
const selTheme = document.getElementById("sel-theme") as HTMLSelectElement;
const selBg = document.getElementById("sel-bg") as HTMLSelectElement;
const inpCustomBg = document.getElementById("inp-custom-bg") as HTMLInputElement;
const selPad = document.getElementById("sel-pad") as HTMLSelectElement;
const selFont = document.getElementById("sel-font") as HTMLSelectElement;
const selScale = document.getElementById("sel-scale") as HTMLSelectElement;
const togDots = document.getElementById("tog-dots") as HTMLButtonElement;
const togLines = document.getElementById("tog-lines") as HTMLButtonElement;
const togRound = document.getElementById("tog-round") as HTMLButtonElement;
const togShadow = document.getElementById("tog-shadow") as HTMLButtonElement;
const togTitle = document.getElementById("tog-title") as HTMLButtonElement;
const inpTitle = document.getElementById("inp-title") as HTMLInputElement;
const btnCopy = document.getElementById("btn-copy") as HTMLButtonElement;
const btnSave = document.getElementById("btn-save") as HTMLButtonElement;
const btnOpen = document.getElementById("btn-open") as HTMLButtonElement;
const btnShutter = document.getElementById("btn-shutter") as HTMLButtonElement;
const codeInput = document.getElementById("code-input") as HTMLTextAreaElement;
const canvasFrame = document.getElementById("canvas-frame") as HTMLDivElement;
const previewCanvas = document.getElementById("preview-canvas") as HTMLCanvasElement;
const metaDims = document.getElementById("meta-dims") as HTMLSpanElement;
const flashFx = document.getElementById("flash-fx") as HTMLDivElement;

for (const lang of LANGUAGES) {
  const opt = document.createElement("option");
  opt.value = lang.id;
  opt.textContent = lang.label;
  selLang.appendChild(opt);
}

for (const theme of CODE_THEMES) {
  const opt = document.createElement("option");
  opt.value = theme.id;
  opt.textContent = theme.name;
  selTheme.appendChild(opt);
}

for (const bg of BACKGROUND_PRESETS) {
  const opt = document.createElement("option");
  opt.value = bg.id;
  opt.textContent = bg.name;
  selBg.appendChild(opt);
}
{
  const opt = document.createElement("option");
  opt.value = "custom";
  opt.textContent = "自定义纯色";
  selBg.appendChild(opt);
}

let saveTimer: number | undefined;
function persistConfig(): void {
  if (!xcpc) return;
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    const { code: _omit, ...prefs } = state;
    void xcpc?.storage.set(STORAGE_KEY, prefs).catch(() => {});
  }, 200);
}

function syncControlsFromState(): void {
  selLang.value = state.language;
  selTheme.value = state.themeId;
  selBg.value = state.backgroundId;
  inpCustomBg.value = state.customBgColor;
  inpCustomBg.style.display = state.backgroundId === "custom" ? "inline-block" : "none";
  selPad.value = String(state.containerPadding);
  selFont.value = String(state.fontSize);
  selScale.value = String(state.scale);
  togDots.classList.toggle("active", state.showWindowControls);
  togLines.classList.toggle("active", state.showLineNumbers);
  togRound.classList.toggle("active", state.roundedCorners);
  togShadow.classList.toggle("active", state.shadow);
  togTitle.classList.toggle("active", state.showWindowTitle);
  inpTitle.value = state.windowTitle;
  inpTitle.style.display = state.showWindowTitle ? "inline-block" : "none";
  codeInput.value = state.code;
}

let rafId = 0;
function scheduleRender(): void {
  if (rafId) return;
  rafId = window.requestAnimationFrame(() => {
    rafId = 0;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const dims = renderSnapshotToCanvas(previewCanvas, state, dpr);
    previewCanvas.style.width = `${dims.width}px`;
    canvasFrame.classList.toggle("checkerboard", state.backgroundId === "transparent");
    const outW = Math.round(dims.width * state.scale);
    const outH = Math.round(dims.height * state.scale);
    metaDims.textContent = `${outW} × ${outH} px (${state.scale}x)`;
  });
}

function triggerFlash(): void {
  flashFx.classList.add("active");
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      flashFx.classList.remove("active");
    });
  });
}

function exportPngDataUrl(): string {
  const offscreen = document.createElement("canvas");
  renderSnapshotToCanvas(offscreen, state, state.scale);
  return offscreen.toDataURL("image/png");
}

function dataUrlToRawBase64(dataUrl: string): string {
  const idx = dataUrl.indexOf(",");
  return idx >= 0 ? dataUrl.slice(idx + 1) : dataUrl;
}

async function copyImage(): Promise<void> {
  try {
    const dataUrl = exportPngDataUrl();
    triggerFlash();
    const clipboard = xcpc?.clipboard as ExtendedClipboard | undefined;
    if (clipboard && typeof clipboard.writeImage === "function") {
      await clipboard.writeImage(dataUrl);
      xcpc?.toast("已复制代码截图到剪贴板", "success");
      return;
    }
    // Fallback for older host versions without clipboard.writeImage
    if (xcpc) {
      const saved = await xcpc.files.savePng(defaultFilename(), dataUrlToRawBase64(dataUrl));
      if (saved) {
        xcpc.toast("当前宿主不支持复制图片，已保存为 PNG", "info");
      }
    }
  } catch (err) {
    xcpc?.toast(`复制失败：${err instanceof Error ? err.message : String(err)}`, "error");
  }
}

function defaultFilename(): string {
  const raw = state.showWindowTitle && state.windowTitle.trim() ? state.windowTitle.trim() : "codesnap";
  const stem = raw.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "codesnap";
  return `${stem}.png`;
}

async function savePng(): Promise<void> {
  try {
    const dataUrl = exportPngDataUrl();
    triggerFlash();
    if (!xcpc) return;
    const saved = await xcpc.files.savePng(defaultFilename(), dataUrlToRawBase64(dataUrl));
    if (saved) {
      xcpc.toast("已保存 PNG 截图", "success");
    }
  } catch (err) {
    xcpc?.toast(`保存失败：${err instanceof Error ? err.message : String(err)}`, "error");
  }
}

async function openLocalFile(): Promise<void> {
  if (!xcpc) return;
  try {
    const picked = await xcpc.files.pickFile({
      title: "选择代码文件",
      extensions: ["cpp", "cc", "cxx", "c", "h", "hpp", "py", "rs", "java", "go", "ts", "js", "sh", "json", "toml", "diff", "txt"],
    });
    if (!picked) return;
    state.code = picked.content;
    codeInput.value = picked.content;
    const detected = detectLanguageFromFilename(picked.name);
    if (detected) {
      state.language = detected;
      selLang.value = detected;
    }
    state.windowTitle = picked.name;
    inpTitle.value = picked.name;
    persistConfig();
    scheduleRender();
  } catch (err) {
    xcpc.toast(`打开文件失败：${err instanceof Error ? err.message : String(err)}`, "error");
  }
}

// Event bindings
codeInput.addEventListener("input", () => {
  state.code = codeInput.value;
  scheduleRender();
});

codeInput.addEventListener("keydown", (e) => {
  if (e.key === "Tab") {
    e.preventDefault();
    const start = codeInput.selectionStart;
    const end = codeInput.selectionEnd;
    codeInput.value = `${codeInput.value.slice(0, start)}    ${codeInput.value.slice(end)}`;
    codeInput.selectionStart = codeInput.selectionEnd = start + 4;
    state.code = codeInput.value;
    scheduleRender();
  }
});

selLang.addEventListener("change", () => {
  state.language = selLang.value;
  persistConfig();
  scheduleRender();
});

selTheme.addEventListener("change", () => {
  state.themeId = selTheme.value;
  persistConfig();
  scheduleRender();
});

selBg.addEventListener("change", () => {
  state.backgroundId = selBg.value;
  inpCustomBg.style.display = state.backgroundId === "custom" ? "inline-block" : "none";
  persistConfig();
  scheduleRender();
});

inpCustomBg.addEventListener("input", () => {
  state.customBgColor = inpCustomBg.value;
  persistConfig();
  scheduleRender();
});

selPad.addEventListener("change", () => {
  state.containerPadding = Number(selPad.value) || 0;
  persistConfig();
  scheduleRender();
});

selFont.addEventListener("change", () => {
  state.fontSize = Number(selFont.value) || 14;
  persistConfig();
  scheduleRender();
});

selScale.addEventListener("change", () => {
  const v = Number(selScale.value);
  state.scale = v === 1 || v === 3 ? v : 2;
  persistConfig();
  scheduleRender();
});

togDots.addEventListener("click", () => {
  state.showWindowControls = !state.showWindowControls;
  togDots.classList.toggle("active", state.showWindowControls);
  persistConfig();
  scheduleRender();
});

togLines.addEventListener("click", () => {
  state.showLineNumbers = !state.showLineNumbers;
  togLines.classList.toggle("active", state.showLineNumbers);
  persistConfig();
  scheduleRender();
});

togRound.addEventListener("click", () => {
  state.roundedCorners = !state.roundedCorners;
  togRound.classList.toggle("active", state.roundedCorners);
  persistConfig();
  scheduleRender();
});

togShadow.addEventListener("click", () => {
  state.shadow = !state.shadow;
  togShadow.classList.toggle("active", state.shadow);
  persistConfig();
  scheduleRender();
});

togTitle.addEventListener("click", () => {
  state.showWindowTitle = !state.showWindowTitle;
  togTitle.classList.toggle("active", state.showWindowTitle);
  inpTitle.style.display = state.showWindowTitle ? "inline-block" : "none";
  persistConfig();
  scheduleRender();
});

inpTitle.addEventListener("input", () => {
  state.windowTitle = inpTitle.value;
  persistConfig();
  scheduleRender();
});

btnCopy.addEventListener("click", () => void copyImage());
btnSave.addEventListener("click", () => void savePng());
btnOpen.addEventListener("click", () => void openLocalFile());
btnShutter.addEventListener("click", (e) => {
  if (e.shiftKey) {
    void savePng();
  } else {
    void copyImage();
  }
});

// Initial render + restore saved preferences
syncControlsFromState();
scheduleRender();
if (typeof document.fonts?.ready?.then === "function") {
  void document.fonts.ready.then(() => scheduleRender());
}

if (xcpc) {
  void xcpc.storage
    .get<Partial<SnapshotConfig>>(STORAGE_KEY)
    .then((saved) => {
      if (!saved || typeof saved !== "object") return;
      if (typeof saved.language === "string") state.language = saved.language;
      if (typeof saved.themeId === "string") state.themeId = saved.themeId;
      if (typeof saved.backgroundId === "string") state.backgroundId = saved.backgroundId;
      if (typeof saved.customBgColor === "string") state.customBgColor = saved.customBgColor;
      if (typeof saved.containerPadding === "number") state.containerPadding = saved.containerPadding;
      if (typeof saved.roundedCorners === "boolean") state.roundedCorners = saved.roundedCorners;
      if (typeof saved.showWindowControls === "boolean") state.showWindowControls = saved.showWindowControls;
      if (typeof saved.showWindowTitle === "boolean") state.showWindowTitle = saved.showWindowTitle;
      if (typeof saved.windowTitle === "string") state.windowTitle = saved.windowTitle;
      if (typeof saved.showLineNumbers === "boolean") state.showLineNumbers = saved.showLineNumbers;
      if (typeof saved.shadow === "boolean") state.shadow = saved.shadow;
      if (typeof saved.fontSize === "number") state.fontSize = saved.fontSize;
      if (saved.scale === 1 || saved.scale === 2 || saved.scale === 3) state.scale = saved.scale;
      syncControlsFromState();
      scheduleRender();
    })
    .catch(() => {});
}
