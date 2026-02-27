import type { CodeIssue } from "../types";

/**
 * Performance analyzer — detects common performance anti-patterns.
 */

interface PerfPattern {
  name: string;
  pattern: RegExp;
  title: string;
  description: string;
  fix: string;
  severity: "critical" | "warning" | "suggestion";
  fileFilter?: (filePath: string) => boolean;
}

const PATTERNS: PerfPattern[] = [
  // ─── Heavy Imports ───
  {
    name: "import-moment",
    pattern: /import\s+(?:moment|['"]moment['"])|require\s*\(['"]moment['"]\)/,
    title: "Heavy Import: moment.js",
    description: "moment.js is 233KB+ minified. Use lighter alternatives like date-fns or dayjs (2KB).",
    fix: "Replace with: import dayjs from 'dayjs'",
    severity: "warning",
  },
  {
    name: "import-lodash-full",
    pattern: /import\s+(?:_|lodash)\s+from\s+['"]lodash['"]/,
    title: "Full lodash Import",
    description: "Importing all of lodash (71KB) when you likely only need a few functions. Import specific methods instead.",
    fix: "Use: import debounce from 'lodash/debounce' or import { debounce } from 'lodash-es'",
    severity: "warning",
  },

  // ─── React Performance ───
  {
    name: "inline-function-jsx",
    pattern: /(?:onClick|onChange|onSubmit|onBlur|onFocus|onKeyDown)\s*=\s*\{\s*\(\s*(?:\w+)?\s*\)\s*=>/,
    title: "Inline Arrow Function in JSX",
    description: "Inline arrow functions in JSX props create new function instances on every render, potentially causing unnecessary re-renders of child components.",
    fix: "Extract to useCallback: const handleClick = useCallback(() => { ... }, [deps])",
    severity: "suggestion",
    fileFilter: (f) => /\.(tsx|jsx)$/.test(f),
  },
  {
    name: "object-literal-in-jsx",
    pattern: /style\s*=\s*\{\s*\{/,
    title: "Inline style Object in JSX",
    description: "Inline style objects create new object references on every render. For frequently re-rendered components, extract to a constant or useMemo.",
    fix: "Extract style to a const outside the component or use useMemo",
    severity: "suggestion",
    fileFilter: (f) => /\.(tsx|jsx)$/.test(f),
  },
  {
    name: "useeffect-no-deps",
    pattern: /useEffect\s*\(\s*(?:async\s*)?\(\s*\)\s*=>\s*\{[^}]+\}\s*\)\s*;/,
    title: "useEffect Without Dependency Array",
    description: "useEffect without a dependency array runs on every render, which is rarely the intended behavior.",
    fix: "Add dependencies: useEffect(() => { ... }, [dep1, dep2]) or [] for mount-only",
    severity: "warning",
    fileFilter: (f) => /\.(tsx|jsx)$/.test(f),
  },

  // ─── Event Listener Leaks ───
  {
    name: "unthrottled-scroll",
    pattern: /addEventListener\s*\(\s*['"](?:scroll|resize|mousemove)['"]/,
    title: "Unthrottled High-Frequency Event Listener",
    description: "scroll, resize, and mousemove events fire very frequently. Without throttling/debouncing, this can cause jank.",
    fix: "Add throttle/debounce: window.addEventListener('scroll', throttle(handler, 100))",
    severity: "warning",
  },

  // ─── Large Sync Operations ───
  {
    name: "sync-fs-read",
    pattern: /fs\.readFileSync|fs\.writeFileSync|fs\.readdirSync|fs\.statSync/,
    title: "Synchronous File System Operation",
    description: "Synchronous fs operations block the event loop. Use async versions in server code.",
    fix: "Use async versions: fs.promises.readFile() or fs.readFile() with callback",
    severity: "warning",
    fileFilter: (f) => /\.(ts|js)$/.test(f),
  },
  {
    name: "json-stringify-large",
    pattern: /JSON\.stringify\s*\(\s*\w+\s*,\s*null\s*,\s*[24]/,
    title: "JSON.stringify with Pretty Printing",
    description: "Pretty-printing JSON (with indentation) in production code wastes memory and CPU. Only use for debug output.",
    fix: "Use JSON.stringify(data) without indentation in production paths",
    severity: "suggestion",
  },

  // ─── Memory Leak Patterns ───
  {
    name: "interval-no-clear",
    pattern: /setInterval\s*\([^)]+\)/,
    title: "setInterval Without Clear Reference",
    description: "setInterval creates a repeating timer. Without storing the ID and calling clearInterval, this causes a memory leak on component unmount.",
    fix: "Store ID: const id = setInterval(...); return () => clearInterval(id);",
    severity: "warning",
  },
];

export function analyzePerformanceIssues(
  filePath: string,
  content: string
): CodeIssue[] {
  const issues: CodeIssue[] = [];
  const lines = content.split("\n");

  for (const pattern of PATTERNS) {
    if (pattern.fileFilter && !pattern.fileFilter(filePath)) continue;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("//") || trimmed.startsWith("*")) continue;

      if (pattern.pattern.test(line)) {
        issues.push({
          id: `perf-${pattern.name}-${filePath}:${i + 1}`,
          file: filePath,
          line: i + 1,
          category: "performance",
          severity: pattern.severity,
          title: pattern.title,
          description: pattern.description,
          fix: pattern.fix,
          suppressed: false,
        });
      }
    }
  }

  return issues;
}
