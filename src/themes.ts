export interface CodeTheme {
  id: string;
  name: string;
  isDark: boolean;
  bg: string;
  fg: string;
  lineNumber: string;
  titleFg: string;
  tokens: {
    keyword: string;
    builtIn: string;
    type: string;
    literal: string;
    number: string;
    string: string;
    comment: string;
    meta: string;
    function: string;
    variable: string;
    operator: string;
    addition: string;
    deletion: string;
  };
}

export const CODE_THEMES: CodeTheme[] = [
  {
    id: "dark-plus",
    name: "VS Code Dark+",
    isDark: true,
    bg: "#1e1e1e",
    fg: "#d4d4d4",
    lineNumber: "#858585",
    titleFg: "#cccccc",
    tokens: {
      keyword: "#569cd6",
      builtIn: "#4ec9b0",
      type: "#4ec9b0",
      literal: "#569cd6",
      number: "#b5cea8",
      string: "#ce9178",
      comment: "#6a9955",
      meta: "#c586c0",
      function: "#dcdcaa",
      variable: "#9cdcfe",
      operator: "#d4d4d4",
      addition: "#81b88b",
      deletion: "#f48771",
    },
  },
  {
    id: "nord",
    name: "Nord",
    isDark: true,
    bg: "#2e3440",
    fg: "#d8dee9",
    lineNumber: "#616e88",
    titleFg: "#d8dee9",
    tokens: {
      keyword: "#81a1c1",
      builtIn: "#88c0d0",
      type: "#8fbcbb",
      literal: "#81a1c1",
      number: "#b48ead",
      string: "#a3be8c",
      comment: "#616e88",
      meta: "#5e81ac",
      function: "#88c0d0",
      variable: "#d8dee9",
      operator: "#81a1c1",
      addition: "#a3be8c",
      deletion: "#bf616a",
    },
  },
  {
    id: "one-dark",
    name: "One Dark",
    isDark: true,
    bg: "#282c34",
    fg: "#abb2bf",
    lineNumber: "#5c6370",
    titleFg: "#abb2bf",
    tokens: {
      keyword: "#c678dd",
      builtIn: "#e6c07b",
      type: "#e5c07b",
      literal: "#d19a66",
      number: "#d19a66",
      string: "#98c379",
      comment: "#5c6370",
      meta: "#c678dd",
      function: "#61afef",
      variable: "#e06c75",
      operator: "#56b6c2",
      addition: "#98c379",
      deletion: "#e06c75",
    },
  },
  {
    id: "dracula",
    name: "Dracula",
    isDark: true,
    bg: "#282a36",
    fg: "#f8f8f2",
    lineNumber: "#6272a4",
    titleFg: "#f8f8f2",
    tokens: {
      keyword: "#ff79c6",
      builtIn: "#8be9fd",
      type: "#8be9fd",
      literal: "#bd93f9",
      number: "#bd93f9",
      string: "#f1fa8c",
      comment: "#6272a4",
      meta: "#ff79c6",
      function: "#50fa7b",
      variable: "#f8f8f2",
      operator: "#ff79c6",
      addition: "#50fa7b",
      deletion: "#ff5555",
    },
  },
  {
    id: "github-light",
    name: "GitHub Light",
    isDark: false,
    bg: "#ffffff",
    fg: "#24292f",
    lineNumber: "#8c959f",
    titleFg: "#57606a",
    tokens: {
      keyword: "#cf222e",
      builtIn: "#953800",
      type: "#953800",
      literal: "#0550ae",
      number: "#0550ae",
      string: "#0a3069",
      comment: "#6e7781",
      meta: "#8250df",
      function: "#8250df",
      variable: "#24292f",
      operator: "#cf222e",
      addition: "#116329",
      deletion: "#82071e",
    },
  },
  {
    id: "solarized-light",
    name: "Solarized Light",
    isDark: false,
    bg: "#fdf6e3",
    fg: "#657b83",
    lineNumber: "#93a1a1",
    titleFg: "#586e75",
    tokens: {
      keyword: "#859900",
      builtIn: "#b58900",
      type: "#b58900",
      literal: "#2aa198",
      number: "#2aa198",
      string: "#2aa198",
      comment: "#93a1a1",
      meta: "#cb4b16",
      function: "#268bd2",
      variable: "#586e75",
      operator: "#859900",
      addition: "#859900",
      deletion: "#dc322f",
    },
  },
];

export type BackgroundSpec =
  | { id: string; name: string; kind: "solid"; color: string }
  | { id: string; name: string; kind: "gradient"; angle: number; stops: [number, string][] }
  | { id: string; name: string; kind: "transparent" };

export const BACKGROUND_PRESETS: BackgroundSpec[] = [
  { id: "codesnap", name: "CodeSnap 原版", kind: "solid", color: "#abb8c3" },
  { id: "slate", name: "深岩灰", kind: "solid", color: "#334155" },
  {
    id: "ocean",
    name: "海洋渐变",
    kind: "gradient",
    angle: 135,
    stops: [
      [0, "#38bdf8"],
      [0.5, "#3b82f6"],
      [1, "#6366f1"],
    ],
  },
  {
    id: "sunset",
    name: "日落渐变",
    kind: "gradient",
    angle: 135,
    stops: [
      [0, "#f97316"],
      [0.5, "#ec4899"],
      [1, "#8b5cf6"],
    ],
  },
  {
    id: "mint",
    name: "薄荷青",
    kind: "gradient",
    angle: 135,
    stops: [
      [0, "#10b981"],
      [1, "#06b6d4"],
    ],
  },
  {
    id: "midnight",
    name: "午夜蓝",
    kind: "gradient",
    angle: 135,
    stops: [
      [0, "#0f172a"],
      [1, "#1e293b"],
    ],
  },
  { id: "transparent", name: "透明背景", kind: "transparent" },
];

export function getThemeById(id: string): CodeTheme {
  return CODE_THEMES.find((t) => t.id === id) ?? CODE_THEMES[0];
}

export function getBackgroundById(id: string): BackgroundSpec {
  return BACKGROUND_PRESETS.find((b) => b.id === id) ?? BACKGROUND_PRESETS[0];
}

export function resolveTokenColor(theme: CodeTheme, scope: string | null): string {
  if (!scope) return theme.fg;
  const s = scope;
  if (s.includes("comment") || s.includes("quote")) return theme.tokens.comment;
  if (s.includes("string") || s.includes("regexp") || s.includes("char")) return theme.tokens.string;
  if (s.includes("number")) return theme.tokens.number;
  if (s.includes("literal")) return theme.tokens.literal;
  if (s.includes("meta")) return theme.tokens.meta;
  if (s.includes("keyword") || s.includes("selector-tag")) return theme.tokens.keyword;
  if (s.includes("title.function") || s.includes("title")) return theme.tokens.function;
  if (s.includes("type") || s.includes("class")) return theme.tokens.type;
  if (s.includes("built_in")) return theme.tokens.builtIn;
  if (s.includes("variable") || s.includes("attr") || s.includes("property")) return theme.tokens.variable;
  if (s.includes("operator") || s.includes("punctuation")) return theme.tokens.operator;
  if (s.includes("addition")) return theme.tokens.addition;
  if (s.includes("deletion")) return theme.tokens.deletion;
  return theme.fg;
}
