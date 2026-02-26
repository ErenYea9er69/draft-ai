import type { CodeIssue } from "../types";
import { randomUUID } from "crypto";

/**
 * Bug analyzer — pattern-based detection of common bug patterns.
 * No AI needed — runs locally and instantly.
 */

interface BugPattern {
  name: string;
  pattern: RegExp;
  title: string;
  description: string;
  fix: string;
  severity: "critical" | "warning" | "suggestion";
  fileFilter?: (filePath: string) => boolean;
}

const PATTERNS: BugPattern[] = [
  // ─── Unhandled Promises ───
  {
    name: "then-no-catch",
    pattern: /\.then\s*\([^)]*\)\s*(?!\.catch|\.finally)/,
    title: "Promise .then() Without .catch()",
    description: "This Promise chain has a .then() handler but no .catch(). Unhandled rejections can crash the process.",
    fix: "Add .catch(err => { /* handle error */ }) or use async/await with try/catch",
    severity: "warning",
  },
  {
    name: "floating-promise",
    pattern: /^\s+(?!return\s|await\s|void\s|const\s|let\s|var\s|\/\/|if|for|while)[a-zA-Z_$][\w$.]*\([^)]*\)\s*;?\s*$/,
    title: "Possible Floating Promise",
    description: "A function call returns a value that's not awaited, returned, or assigned. If it returns a Promise, this could silently swallow errors.",
    fix: "Add await, assign to a variable, or explicitly void it: void someAsyncFunction()",
    severity: "suggestion",
    fileFilter: (f) => /\.(ts|tsx|js|jsx)$/.test(f),
  },

  // ─── Null/Undefined Risks ───
  {
    name: "loose-equality-null",
    pattern: /==\s*null\b|null\s*==[^=]/,
    title: "Loose Equality with null",
    description: "Using == null matches both null and undefined. This might be intentional, but === null or === undefined is safer.",
    fix: "Use strict equality: === null or === undefined",
    severity: "suggestion",
  },
  {
    name: "optional-chain-assignment",
    pattern: /\?\.\w+\s*=[^=]/,
    title: "Assignment to Optional Chain",
    description: "Assigning a value to an optional chain (foo?.bar = x) will throw if the base is nullish in strict mode.",
    fix: "Add a null check before assignment: if (foo) { foo.bar = x; }",
    severity: "warning",
  },

  // ─── Common JS/TS Bugs ───
  {
    name: "console-log-left",
    pattern: /console\.(log|debug|info|dir|table)\s*\(/,
    title: "console.log Left in Code",
    description: "Debug console statement left in code. Should be removed before production.",
    fix: "Remove the console statement or replace with proper logger",
    severity: "suggestion",
  },
  {
    name: "debugger-statement",
    pattern: /^\s*debugger\s*;?\s*$/,
    title: "debugger Statement",
    description: "A debugger statement is present. This will pause execution in development and should be removed.",
    fix: "Remove the debugger statement",
    severity: "warning",
  },
  {
    name: "todo-fixme",
    pattern: /\/\/\s*(?:TODO|FIXME|HACK|XXX|BUG)\b/i,
    title: "TODO/FIXME Comment",
    description: "A TODO or FIXME comment indicates unfinished work that should be addressed.",
    fix: "Address the TODO or create a ticket and reference it",
    severity: "suggestion",
  },

  // ─── Array/Object Mistakes ───
  {
    name: "array-delete",
    pattern: /delete\s+\w+\[\w+\]/,
    title: "Using delete on Array Element",
    description: "delete on an array creates a hole (undefined at that index). Use splice() to remove elements properly.",
    fix: "Use array.splice(index, 1) instead of delete",
    severity: "warning",
  },
  {
    name: "json-parse-no-try",
    pattern: /JSON\.parse\s*\([^)]+\)(?!\s*catch|\s*\))/,
    title: "JSON.parse Without try/catch",
    description: "JSON.parse can throw a SyntaxError on invalid input. Without try/catch, this will crash.",
    fix: "Wrap in try/catch: try { JSON.parse(data) } catch(e) { /* handle */ }",
    severity: "warning",
  },

  // ─── Async/Await Issues ───
  {
    name: "async-no-await",
    pattern: /async\s+(?:function\s+\w+|[\w$]+\s*=\s*async)\s*\([^)]*\)\s*(?::\s*\w+)?\s*\{[^}]*\}/,
    title: "Async Function Without await",
    description: "This async function doesn't appear to use await. It might not need to be async.",
    fix: "Remove async keyword or add await where needed",
    severity: "suggestion",
  },

  // ─── Error Handling ───
  {
    name: "empty-catch",
    pattern: /catch\s*\(\s*\w*\s*\)\s*\{\s*\}/,
    title: "Empty catch Block",
    description: "An empty catch block silently swallows errors. At minimum, log the error.",
    fix: "Add error handling: catch(e) { console.error(e); }",
    severity: "warning",
  },
];

export function analyzeBugIssues(
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

      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith("//") || trimmed.startsWith("*")) continue;

      if (pattern.pattern.test(line)) {
        issues.push({
          id: `bug-${pattern.name}-${randomUUID().slice(0, 8)}`,
          file: filePath,
          line: i + 1,
          category: "bugs",
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
