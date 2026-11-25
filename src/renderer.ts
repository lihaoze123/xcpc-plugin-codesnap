import { highlightToLines } from "./highlighter";
import {
  getBackgroundById,
  getThemeById,
  resolveTokenColor,
  type BackgroundSpec,
} from "./themes";

export interface SnapshotConfig {
  code: string;
  language: string;
  themeId: string;
  backgroundId: string;
  customBgColor: string;
  containerPadding: number;
  roundedCorners: boolean;
  showWindowControls: boolean;
  showWindowTitle: boolean;
  windowTitle: string;
  showLineNumbers: boolean;
  shadow: boolean;
  fontSize: number;
  scale: 1 | 2 | 3;
}

export interface RenderDimensions {
  width: number;
  height: number;
}

const MONO_FONT_STACK =
  '"JetBrains Mono", "Fira Code", "Cascadia Code", "SF Mono", Menlo, Monaco, Consolas, ui-monospace, monospace';
const TITLE_FONT_STACK =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif';

// Authentic kufii/CodeSnap window proportions (webview/style.css)
const WINDOW_PADDING = 18;
const NAVBAR_BOTTOM_GAP = 15;
const DOT_DIAMETER = 15;
const DOT_GAP = 10;
const LINE_NUMBER_GAP = 18;
const WINDOW_RADIUS = 4;
const MIN_WINDOW_WIDTH = 320;
const MAX_CANVAS_PX = 8192;

function drawRoundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const radius = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function fillContainerBackground(
  ctx: CanvasRenderingContext2D,
  bg: BackgroundSpec,
  customColor: string,
  width: number,
  height: number,
  isCustom: boolean,
): void {
  if (isCustom) {
    ctx.fillStyle = customColor || "#abb8c3";
    ctx.fillRect(0, 0, width, height);
    return;
  }
  if (bg.kind === "transparent") {
    return;
  }
  if (bg.kind === "solid") {
    ctx.fillStyle = bg.color;
    ctx.fillRect(0, 0, width, height);
    return;
  }
  const rad = ((bg.angle - 90) * Math.PI) / 180;
  const cx = width / 2;
  const cy = height / 2;
  const halfDiag = Math.hypot(width, height) / 2;
  const x0 = cx - Math.cos(rad) * halfDiag;
  const y0 = cy - Math.sin(rad) * halfDiag;
  const x1 = cx + Math.cos(rad) * halfDiag;
  const y1 = cy + Math.sin(rad) * halfDiag;
  const grad = ctx.createLinearGradient(x0, y0, x1, y1);
  for (const [offset, color] of bg.stops) {
    grad.addColorStop(offset, color);
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);
}

export function renderSnapshotToCanvas(
  canvas: HTMLCanvasElement,
  cfg: SnapshotConfig,
  renderScale?: number,
): RenderDimensions {
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return { width: 0, height: 0 };
  }

  const theme = getThemeById(cfg.themeId);
  const bgSpec = getBackgroundById(cfg.backgroundId);
  const isCustomBg = cfg.backgroundId === "custom";
  const lines = highlightToLines(cfg.code, cfg.language);

  const fontSize = Math.max(11, Math.min(24, cfg.fontSize));
  const lineHeight = Math.round(fontSize * 1.55);
  const codeFont = `${fontSize}px ${MONO_FONT_STACK}`;
  const titleFont = `500 ${Math.max(12, Math.round(fontSize * 0.92))}px ${TITLE_FONT_STACK}`;

  // 1. Measure code block dimensions
  ctx.font = codeFont;
  const lineCount = Math.max(1, lines.length);
  const digits = String(lineCount).length;
  const lineNumWidth = cfg.showLineNumbers
    ? Math.ceil(ctx.measureText("9".repeat(Math.max(2, digits))).width) + LINE_NUMBER_GAP
    : 0;

  let maxCodeLineWidth = 0;
  for (const line of lines) {
    let w = 0;
    for (const span of line) {
      w += ctx.measureText(span.text).width;
    }
    if (w > maxCodeLineWidth) maxCodeLineWidth = w;
  }

  const hasNavbar = cfg.showWindowControls || (cfg.showWindowTitle && cfg.windowTitle.trim().length > 0);
  const navbarHeight = hasNavbar ? Math.max(DOT_DIAMETER + 4, Math.ceil(fontSize * 1.15)) + NAVBAR_BOTTOM_GAP : 0;

  let titleNeededWidth = 0;
  if (cfg.showWindowTitle && cfg.windowTitle.trim().length > 0) {
    ctx.font = titleFont;
    titleNeededWidth = Math.ceil(ctx.measureText(cfg.windowTitle.trim()).width) + 160;
  }

  const innerContentWidth = Math.max(
    MIN_WINDOW_WIDTH - WINDOW_PADDING * 2,
    Math.ceil(lineNumWidth + maxCodeLineWidth + 8),
    titleNeededWidth,
  );
  const windowWidth = innerContentWidth + WINDOW_PADDING * 2;
  const windowHeight = WINDOW_PADDING * 2 + navbarHeight + lineCount * lineHeight;

  const pad = Math.max(0, Math.min(96, cfg.containerPadding));
  const logicalWidth = Math.ceil(windowWidth + pad * 2);
  const logicalHeight = Math.ceil(windowHeight + pad * 2);

  const desiredScale = renderScale ?? cfg.scale;
  const clampedScale = Math.min(
    desiredScale,
    MAX_CANVAS_PX / Math.max(1, logicalWidth),
    MAX_CANVAS_PX / Math.max(1, logicalHeight),
  );

  canvas.width = Math.max(1, Math.round(logicalWidth * clampedScale));
  canvas.height = Math.max(1, Math.round(logicalHeight * clampedScale));

  ctx.save();
  ctx.scale(clampedScale, clampedScale);
  ctx.clearRect(0, 0, logicalWidth, logicalHeight);

  // 2. Container background
  fillContainerBackground(ctx, bgSpec, cfg.customBgColor, logicalWidth, logicalHeight, isCustomBg);

  // 3. Window card + kufii/CodeSnap signature shadow: rgba(0, 0, 0, 0.55) 0px 20px 68px
  const winX = pad;
  const winY = pad;
  const radius = cfg.roundedCorners ? WINDOW_RADIUS : 0;

  ctx.save();
  if (cfg.shadow && pad > 0) {
    ctx.shadowColor = "rgba(0, 0, 0, 0.55)";
    ctx.shadowBlur = 68;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 20;
  }
  drawRoundedRectPath(ctx, winX, winY, windowWidth, windowHeight, radius);
  ctx.fillStyle = theme.bg;
  ctx.fill();
  ctx.restore();

  // Subtle hairline border for light themes on light backgrounds
  if (!theme.isDark) {
    ctx.save();
    drawRoundedRectPath(ctx, winX + 0.5, winY + 0.5, windowWidth - 1, windowHeight - 1, radius);
    ctx.strokeStyle = "rgba(0, 0, 0, 0.08)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }

  // 4. Navbar (macOS traffic lights + optional centered title)
  if (hasNavbar) {
    const navTop = winY + WINDOW_PADDING;
    if (cfg.showWindowControls) {
      const colors = ["#ff5f5a", "#ffbe2e", "#2aca44"];
      const cy = navTop + 2 + DOT_DIAMETER / 2;
      for (let i = 0; i < colors.length; i++) {
        const cx = winX + WINDOW_PADDING + DOT_DIAMETER / 2 + i * (DOT_DIAMETER + DOT_GAP);
        ctx.beginPath();
        ctx.arc(cx, cy, DOT_DIAMETER / 2, 0, Math.PI * 2);
        ctx.fillStyle = colors[i];
        ctx.fill();
      }
    }

    if (cfg.showWindowTitle && cfg.windowTitle.trim().length > 0) {
      ctx.font = titleFont;
      ctx.fillStyle = theme.titleFg;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const cy = navTop + 2 + DOT_DIAMETER / 2;
      ctx.fillText(cfg.windowTitle.trim(), winX + windowWidth / 2, cy);
    }
  }

  // 5. Code lines + line numbers
  ctx.font = codeFont;
  ctx.textBaseline = "top";
  const codeStartX = winX + WINDOW_PADDING + lineNumWidth;
  const codeStartY = winY + WINDOW_PADDING + navbarHeight;
  const verticalTextOffset = Math.round((lineHeight - fontSize) / 2);

  for (let i = 0; i < lines.length; i++) {
    const y = codeStartY + i * lineHeight + verticalTextOffset;

    if (cfg.showLineNumbers) {
      ctx.textAlign = "right";
      ctx.fillStyle = theme.lineNumber;
      ctx.fillText(String(i + 1), codeStartX - LINE_NUMBER_GAP, y);
    }

    ctx.textAlign = "left";
    let x = codeStartX;
    for (const span of lines[i]) {
      ctx.fillStyle = resolveTokenColor(theme, span.scope);
      ctx.fillText(span.text, x, y);
      x += ctx.measureText(span.text).width;
    }
  }

  ctx.restore();
  return { width: logicalWidth, height: logicalHeight };
}
