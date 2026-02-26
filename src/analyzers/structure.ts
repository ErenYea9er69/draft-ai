import type { CodeIssue } from "../types";
import * as path from "path";
import * as fs from "fs";
import { randomUUID } from "crypto";

/**
 * Structure analyzer — checks architectural quality patterns.
 * Looks at the file system and file contents for structural issues.
 */

/**
 * Analyze structural issues in a file.
 */
export function analyzeStructureIssues(
  filePath: string,
  content: string,
  workspaceRoot: string
): CodeIssue[] {
  const issues: CodeIssue[] = [];
  const ext = path.extname(filePath);
  const basename = path.basename(filePath, ext);

  // ─── Missing Test File ───
  if (isSourceFile(filePath) && !isTestFile(filePath)) {
    const testExists = checkTestFileExists(filePath, workspaceRoot);
    if (!testExists) {
      issues.push({
        id: `str-missing-test-${randomUUID().slice(0, 8)}`,
        file: filePath,
        line: 1,
        category: "structure",
        severity: "suggestion",
        title: "No Test File Found",
        description: `No corresponding test file found for ${basename}${ext}. Consider adding tests.`,
        fix: `Create ${basename}.test${ext} or ${basename}.spec${ext}`,
        suppressed: false,
      });
    }
  }

  // ─── React-specific ───
  if (/\.(tsx|jsx)$/.test(filePath)) {
    // Missing error boundary
    if (content.includes("export default") && !content.includes("ErrorBoundary") && !content.includes("error-boundary")) {
      const hasChildren = /children|props\.children|{children}/.test(content);
      if (hasChildren) {
        issues.push({
          id: `str-no-error-boundary-${randomUUID().slice(0, 8)}`,
          file: filePath,
          line: 1,
          category: "structure",
          severity: "suggestion",
          title: "Component Renders Children Without Error Boundary",
          description: "This component renders children but doesn't use an error boundary. Children errors will crash the parent.",
          fix: "Wrap children with an ErrorBoundary component: <ErrorBoundary fallback={<ErrorUI />}>{children}</ErrorBoundary>",
          suppressed: false,
        });
      }
    }

    // Missing loading state
    if (content.includes("useState") && content.includes("useEffect")) {
      const hasLoadingState = /loading|isLoading|pending|fetching/i.test(content);
      if (!hasLoadingState && /fetch|axios|api|\.get\(|\.post\(/i.test(content)) {
        issues.push({
          id: `str-no-loading-${randomUUID().slice(0, 8)}`,
          file: filePath,
          line: 1,
          category: "structure",
          severity: "suggestion",
          title: "Data Fetching Without Loading State",
          description: "This component fetches data but doesn't track a loading state. Users see nothing during fetch.",
          fix: "Add const [loading, setLoading] = useState(true) and show a loader while data is being fetched",
          suppressed: false,
        });
      }
    }

    // Missing empty state
    if (content.includes("useState") && /\.map\s*\(/.test(content)) {
      const hasEmptyState = /empty|noData|no\s*data|no\s*results|length\s*===?\s*0/i.test(content);
      if (!hasEmptyState) {
        issues.push({
          id: `str-no-empty-state-${randomUUID().slice(0, 8)}`,
          file: filePath,
          line: 1,
          category: "structure",
          severity: "suggestion",
          title: "List Rendering Without Empty State",
          description: "This component maps over an array but doesn't handle the empty case.",
          fix: "Add: {items.length === 0 ? <EmptyState /> : items.map(...)}",
          suppressed: false,
        });
      }
    }
  }

  // ─── Large File Warning ───
  const lines = content.split("\n");
  if (lines.length > 400) {
    issues.push({
      id: `str-large-file-${randomUUID().slice(0, 8)}`,
      file: filePath,
      line: 1,
      category: "structure",
      severity: "suggestion",
      title: `File Has ${lines.length} Lines`,
      description: "Large files are harder to maintain. Consider splitting into smaller, focused modules.",
      fix: "Extract related functions/components into separate files",
      suppressed: false,
    });
  }

  // ─── God Function Detection ───
  const functionLengths = detectLongFunctions(content);
  for (const funcInfo of functionLengths) {
    if (funcInfo.lines > 60) {
      issues.push({
        id: `str-long-function-${randomUUID().slice(0, 8)}`,
        file: filePath,
        line: funcInfo.startLine,
        category: "structure",
        severity: "suggestion",
        title: `Long Function: ${funcInfo.name} (${funcInfo.lines} lines)`,
        description: "Functions over 60 lines are hard to understand and test. Break into smaller helpers.",
        fix: "Extract sub-tasks into separate, well-named functions",
        suppressed: false,
      });
    }
  }

  return issues;
}

function isSourceFile(filePath: string): boolean {
  return /\.(ts|tsx|js|jsx|py|rb|go|rs|java|php)$/.test(filePath);
}

function isTestFile(filePath: string): boolean {
  return /\.(test|spec|_test)\.(ts|tsx|js|jsx)$/.test(filePath) ||
    /test_.*\.py$/.test(filePath) ||
    /__tests__/.test(filePath);
}

function checkTestFileExists(filePath: string, workspaceRoot: string): boolean {
  const ext = path.extname(filePath);
  const basename = path.basename(filePath, ext);
  // Resolve relative filePath against workspaceRoot
  const absolutePath = path.isAbsolute(filePath)
    ? filePath
    : path.join(workspaceRoot, filePath);
  const dir = path.dirname(absolutePath);

  // Check common test locations
  const candidates = [
    path.join(dir, `${basename}.test${ext}`),
    path.join(dir, `${basename}.spec${ext}`),
    path.join(dir, "__tests__", `${basename}.test${ext}`),
    path.join(dir, "__tests__", `${basename}.spec${ext}`),
    path.join(workspaceRoot, "tests", `${basename}.test${ext}`),
    path.join(workspaceRoot, "test", `${basename}.test${ext}`),
  ];

  return candidates.some((c) => fs.existsSync(c));
}

interface FunctionInfo {
  name: string;
  startLine: number;
  lines: number;
}

function detectLongFunctions(content: string): FunctionInfo[] {
  const results: FunctionInfo[] = [];
  const lines = content.split("\n");

  // Simple brace-counting function length detection
  const funcStart = /(?:function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?(?:function|\([^)]*\)\s*=>))|(?:(?:async\s+)?(\w+)\s*\([^)]*\)\s*\{)/;

  for (let i = 0; i < lines.length; i++) {
    const match = funcStart.exec(lines[i]);
    if (match) {
      const name = match[1] || match[2] || match[3] || "anonymous";
      let braceCount = 0;
      let started = false;
      let endLine = i;

      for (let j = i; j < lines.length; j++) {
        for (const char of lines[j]) {
          if (char === "{") { braceCount++; started = true; }
          if (char === "}") braceCount--;
        }
        if (started && braceCount === 0) {
          endLine = j;
          break;
        }
      }

      const funcLines = endLine - i + 1;
      results.push({ name, startLine: i + 1, lines: funcLines });
    }
  }

  return results;
}
