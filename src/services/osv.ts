import type { CodeIssue } from "../types";
import * as fs from "fs";
import * as path from "path";
import { randomUUID } from "crypto";

/**
 * OSV.dev client — checks project dependencies for known vulnerabilities.
 * API docs: https://osv.dev/docs/
 */

const OSV_API_URL = "https://api.osv.dev/v1";
const OSV_TIMEOUT_MS = 10_000;

interface OSVVulnerability {
  id: string;
  summary: string;
  details: string;
  aliases: string[];
  severity: { type: string; score: string }[];
  affected: {
    package: { name: string; ecosystem: string };
    ranges: { type: string; events: { introduced: string; fixed?: string }[] }[];
  }[];
}

interface OSVQueryResponse {
  vulns?: OSVVulnerability[];
}

export class OSVService {
  /**
   * Check a single package for vulnerabilities.
   */
  async checkPackage(
    name: string,
    version: string,
    ecosystem: string = "npm"
  ): Promise<OSVVulnerability[]> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), OSV_TIMEOUT_MS);

    try {
      const response = await fetch(`${OSV_API_URL}/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          package: { name, ecosystem },
          version,
        }),
        signal: controller.signal,
      });

      if (!response.ok) return [];

      const data = (await response.json()) as OSVQueryResponse;
      return data.vulns ?? [];
    } catch {
      return [];
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Scan all dependencies in package.json for vulnerabilities.
   * Returns CodeIssue[] for direct integration with the scanner.
   */
  async scanDependencies(workspaceRoot: string): Promise<CodeIssue[]> {
    const issues: CodeIssue[] = [];
    const pkgPath = path.join(workspaceRoot, "package.json");

    if (!fs.existsSync(pkgPath)) return issues;

    try {
      const pkgJson = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));

      // Prefer package-lock.json for exact versions (like Snyk does)
      const lockPath = path.join(workspaceRoot, "package-lock.json");
      let lockDeps: Record<string, string> = {};

      if (fs.existsSync(lockPath)) {
        try {
          const lockJson = JSON.parse(fs.readFileSync(lockPath, "utf-8"));
          // npm v2+ lockfile format: packages["node_modules/pkgname"].version
          if (lockJson.packages) {
            for (const [key, value] of Object.entries(lockJson.packages)) {
              if (key.startsWith("node_modules/")) {
                const name = key.replace("node_modules/", "");
                lockDeps[name] = (value as any).version ?? "";
              }
            }
          }
          // npm v1 lockfile format: dependencies["pkgname"].version
          else if (lockJson.dependencies) {
            for (const [name, value] of Object.entries(lockJson.dependencies)) {
              lockDeps[name] = (value as any).version ?? "";
            }
          }
        } catch {
          // Fall through to package.json ranges
        }
      }

      const allDeps: Record<string, string> = {
        ...pkgJson.dependencies,
        ...pkgJson.devDependencies,
      };

      // Batch check — limit concurrency to avoid rate limiting
      const entries = Object.entries(allDeps);
      const BATCH_SIZE = 5;

      for (let i = 0; i < entries.length; i += BATCH_SIZE) {
        const batch = entries.slice(i, i + BATCH_SIZE);
        const results = await Promise.all(
          batch.map(async ([name, versionRange]) => {
            // Use exact version from lock file, fall back to cleaned range
            const version = lockDeps[name] || versionRange.replace(/^[^0-9]*/, "");
            if (!version) return [];
            const vulns = await this.checkPackage(name, version);
            return vulns.map((v) => this.vulnToIssue(name, version, v, "package.json"));
          })
        );

        for (const batchIssues of results) {
          issues.push(...batchIssues);
        }
      }
    } catch (err) {
      console.warn("OSV: Failed to scan dependencies:", err);
    }

    return issues;
  }

  private vulnToIssue(
    pkgName: string,
    version: string,
    vuln: OSVVulnerability,
    pkgPath: string
  ): CodeIssue {
    // Determine severity from CVSS or default to warning
    const cvss = vuln.severity?.find((s) => s.type === "CVSS_V3");
    const score = cvss ? parseFloat(cvss.score) : 5;
    const severity: CodeIssue["severity"] =
      score >= 7 ? "critical" : score >= 4 ? "warning" : "suggestion";

    // Find the fixed version if available
    const fixedVersion = vuln.affected
      ?.flatMap((a) => a.ranges)
      ?.flatMap((r) => r.events)
      ?.find((e) => e.fixed)?.fixed;

    const cveId = vuln.aliases?.find((a) => a.startsWith("CVE-")) ?? vuln.id;

    return {
      id: `cve-${cveId}-${randomUUID().slice(0, 8)}`,
      file: pkgPath,
      line: 1,
      category: "security",
      severity,
      title: `${cveId}: ${pkgName}@${version}`,
      description: vuln.summary || vuln.details?.slice(0, 200) || "Known vulnerability in this dependency.",
      fix: fixedVersion
        ? `Update to ${pkgName}@${fixedVersion}: npm install ${pkgName}@${fixedVersion} — Details: https://osv.dev/vulnerability/${vuln.id}`
        : `Review vulnerability: https://osv.dev/vulnerability/${vuln.id}`,
      suppressed: false,
    };
  }
}
