import hljs from "highlight.js/lib/core";
import bash from "highlight.js/lib/languages/bash";
import c from "highlight.js/lib/languages/c";
import cpp from "highlight.js/lib/languages/cpp";
import diff from "highlight.js/lib/languages/diff";
import go from "highlight.js/lib/languages/go";
import ini from "highlight.js/lib/languages/ini";
import java from "highlight.js/lib/languages/java";
import javascript from "highlight.js/lib/languages/javascript";
import json from "highlight.js/lib/languages/json";
import python from "highlight.js/lib/languages/python";
import rust from "highlight.js/lib/languages/rust";
import typescript from "highlight.js/lib/languages/typescript";

hljs.registerLanguage("cpp", cpp);
hljs.registerLanguage("c", c);
hljs.registerLanguage("python", python);
hljs.registerLanguage("rust", rust);
hljs.registerLanguage("java", java);
hljs.registerLanguage("go", go);
hljs.registerLanguage("javascript", javascript);
hljs.registerLanguage("typescript", typescript);
hljs.registerLanguage("bash", bash);
hljs.registerLanguage("json", json);
hljs.registerLanguage("toml", ini);
hljs.registerLanguage("diff", diff);

export interface LanguageOption {
  id: string;
  label: string;
}

export const LANGUAGES: LanguageOption[] = [
  { id: "cpp", label: "C++" },
  { id: "c", label: "C" },
  { id: "python", label: "Python" },
  { id: "rust", label: "Rust" },
  { id: "java", label: "Java" },
  { id: "go", label: "Go" },
  { id: "typescript", label: "TypeScript" },
  { id: "javascript", label: "JavaScript" },
  { id: "bash", label: "Bash" },
  { id: "json", label: "JSON" },
  { id: "toml", label: "TOML" },
  { id: "diff", label: "Diff" },
  { id: "plaintext", label: "Plain Text" },
];

export interface StyledSpan {
  text: string;
  scope: string | null;
}

export type StyledLine = StyledSpan[];

function decodeEntities(raw: string): string {
  return raw
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

function expandTabs(text: string, tabSize = 4): string {
  if (!text.includes("\t")) return text;
  return text.replace(/\t/g, " ".repeat(tabSize));
}

function parseHljsHtmlToLines(html: string): StyledLine[] {
  const lines: StyledLine[] = [[]];
  const scopeStack: string[] = [];
  const tagRe = /<span class="([^"]+)">|<\/span>/g;
  let lastIndex = 0;

  const pushText = (rawChunk: string) => {
    if (!rawChunk) return;
    const text = expandTabs(decodeEntities(rawChunk));
    const scope = scopeStack.length > 0 ? scopeStack[scopeStack.length - 1] : null;
    const parts = text.split("\n");
    for (let i = 0; i < parts.length; i++) {
      if (i > 0) {
        lines.push([]);
      }
      if (parts[i].length > 0) {
        lines[lines.length - 1].push({ text: parts[i], scope });
      }
    }
  };

  let match: RegExpExecArray | null;
  while ((match = tagRe.exec(html)) !== null) {
    if (match.index > lastIndex) {
      pushText(html.slice(lastIndex, match.index));
    }
    if (match[1] !== undefined) {
      scopeStack.push(match[1]);
    } else if (scopeStack.length > 0) {
      scopeStack.pop();
    }
    lastIndex = tagRe.lastIndex;
  }

  if (lastIndex < html.length) {
    pushText(html.slice(lastIndex));
  }

  return lines;
}

export function highlightToLines(code: string, lang: string): StyledLine[] {
  const normalized = code.replace(/\r\n?/g, "\n");
  if (!normalized) {
    return [[{ text: " ", scope: null }]];
  }
  if (lang === "plaintext" || !hljs.getLanguage(lang)) {
    return normalized.split("\n").map((line) => [{ text: expandTabs(line), scope: null }]);
  }
  try {
    const res = hljs.highlight(normalized, { language: lang, ignoreIllegals: true });
    return parseHljsHtmlToLines(res.value);
  } catch {
    return normalized.split("\n").map((line) => [{ text: expandTabs(line), scope: null }]);
  }
}

export function detectLanguageFromFilename(filename: string): string | null {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  switch (ext) {
    case "cpp":
    case "cc":
    case "cxx":
    case "hpp":
    case "hh":
      return "cpp";
    case "c":
    case "h":
      return "c";
    case "py":
      return "python";
    case "rs":
      return "rust";
    case "java":
      return "java";
    case "go":
      return "go";
    case "ts":
    case "tsx":
      return "typescript";
    case "js":
    case "jsx":
    case "mjs":
    case "cjs":
      return "javascript";
    case "sh":
    case "bash":
    case "zsh":
      return "bash";
    case "json":
      return "json";
    case "toml":
    case "ini":
      return "toml";
    case "diff":
    case "patch":
      return "diff";
    default:
      return null;
  }
}
