import type { CodeIssue } from "../types";

/**
 * Security analyzer — regex-based detection of common security issues.
 * Runs locally, no API calls needed.
 */

interface SecurityPattern {
  name: string;
  pattern: RegExp;
  title: string;
  description: string;
  fix: string;
  severity: "critical" | "warning" | "suggestion";
  fileFilter?: (filePath: string) => boolean;
}

const PATTERNS: SecurityPattern[] = [
  // ─── Hardcoded Secrets ───
  {
    name: "hardcoded-aws-key",
    pattern: /(?:AKIA|ASIA)[0-9A-Z]{16}/,
    title: "Hardcoded AWS Access Key",
    description: "AWS access key ID found in source code. This should be stored securely in environment variables.",
    fix: "Move to .env file and use process.env.AWS_ACCESS_KEY_ID",
    severity: "critical",
  },
  {
    name: "hardcoded-api-key",
    pattern: /(?:api[_-]?key|apikey|api[_-]?secret|secret[_-]?key)\s*[:=]\s*['"][A-Za-z0-9_\-]{16,}['"]/i,
    title: "Hardcoded API Key or Secret",
    description: "An API key or secret appears to be hardcoded in the source. This is a security risk if committed.",
    fix: "Use environment variables: process.env.YOUR_API_KEY",
    severity: "critical",
  },
  {
    name: "hardcoded-password",
    pattern: /(?:password|passwd|pwd)\s*[:=]\s*['"][^'"]{4,}['"]/i,
    title: "Hardcoded Password",
    description: "A password string appears to be hardcoded. Use environment variables or a secrets manager.",
    fix: "Store in environment variable or secrets manager",
    severity: "critical",
  },
  {
    name: "private-key-pattern",
    pattern: /-----BEGIN (?:RSA|EC|DSA|OPENSSH) PRIVATE KEY-----/,
    title: "Private Key in Source Code",
    description: "A private key is present in the source code. This should never be committed to version control.",
    fix: "Remove the key and load from a secure file or environment variable",
    severity: "critical",
  },
  {
    name: "jwt-secret-hardcoded",
    pattern: /(?:jwt[_-]?secret|token[_-]?secret)\s*[:=]\s*['"][^'"]{8,}['"]/i,
    title: "Hardcoded JWT Secret",
    description: "A JWT secret is hardcoded. This should be stored in an environment variable.",
    fix: "Use process.env.JWT_SECRET",
    severity: "critical",
  },

  // ─── XSS Risks ───
  {
    name: "dangerously-set-html",
    pattern: /dangerouslySetInnerHTML\s*=\s*\{\s*\{\s*__html\s*:/,
    title: "dangerouslySetInnerHTML Usage",
    description: "Using dangerouslySetInnerHTML can lead to XSS attacks if the content isn't properly sanitized.",
    fix: "Sanitize HTML with DOMPurify: import DOMPurify from 'dompurify'; dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }}",
    severity: "warning",
    fileFilter: (f) => /\.(tsx|jsx)$/.test(f),
  },
  {
    name: "inner-html-assignment",
    pattern: /\.innerHTML\s*=(?!=)/,
    title: "Direct innerHTML Assignment",
    description: "Setting innerHTML directly can introduce XSS vulnerabilities. Use textContent or a sanitization library.",
    fix: "Use element.textContent = value or sanitize with DOMPurify",
    severity: "warning",
  },

  // ─── SQL Injection ───
  {
    name: "sql-string-concat",
    pattern: /(?:SELECT|INSERT|UPDATE|DELETE|FROM|WHERE)\s.*?\+\s*(?:req|params|query|body|input|user)/i,
    title: "Possible SQL Injection",
    description: "SQL query appears to use string concatenation with user input. Use parameterized queries instead.",
    fix: "Use parameterized queries: db.query('SELECT * FROM users WHERE id = ?', [userId])",
    severity: "critical",
  },
  {
    name: "sql-template-literal",
    pattern: /(?:SELECT|INSERT|UPDATE|DELETE|FROM|WHERE)\s.*?\$\{(?:req|params|query|body|input|user)/i,
    title: "SQL Injection via Template Literal",
    description: "SQL query uses template literals with user input. Use parameterized queries.",
    fix: "Use parameterized queries instead of template literals",
    severity: "critical",
  },

  // ─── Process.env in Frontend ───
  {
    name: "process-env-in-frontend",
    pattern: /process\.env\.(?!NODE_ENV|NEXT_PUBLIC_|REACT_APP_|VITE_)/,
    title: "Server-side env var in potentially frontend code",
    description: "process.env usage without a public prefix (NEXT_PUBLIC_, REACT_APP_, VITE_) might expose server secrets in the client bundle.",
    fix: "Prefix with NEXT_PUBLIC_, REACT_APP_, or VITE_ for client-side vars, or keep on server only",
    severity: "warning",
    fileFilter: (f) => /\.(tsx|jsx|vue|svelte)$/.test(f),
  },

  // ─── Eval Usage ───
  {
    name: "eval-usage",
    pattern: /\beval\s*\(/,
    title: "eval() Usage Detected",
    description: "Using eval() is dangerous as it can execute arbitrary code. Avoid unless absolutely necessary.",
    fix: "Replace with JSON.parse(), Function constructor, or structured alternatives",
    severity: "warning",
  },
];

export function analyzeSecurityIssues(
  filePath: string,
  content: string
): CodeIssue[] {
  const issues: CodeIssue[] = [];
  const lines = content.split("\n");

  for (const pattern of PATTERNS) {
    // Skip if file doesn't match the filter
    if (pattern.fileFilter && !pattern.fileFilter(filePath)) continue;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Skip comments
      const trimmed = line.trim();
      if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*")) continue;

      if (pattern.pattern.test(line)) {
        issues.push({
          id: `sec-${pattern.name}-${filePath}:${i + 1}`,
          file: filePath,
          line: i + 1,
          category: "security",
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
