import * as vscode from "vscode";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export class GitService {
  private workspaceRoot: string;

  constructor(workspaceRoot: string) {
    this.workspaceRoot = workspaceRoot;
  }

  /**
   * Check if the workspace is a Git repository.
   */
  async isGitRepo(): Promise<boolean> {
    try {
      await execAsync("git rev-parse --is-inside-work-tree", {
        cwd: this.workspaceRoot,
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get files changed since the last commit (unstaged + staged).
   */
  async getChangedFiles(): Promise<string[]> {
    try {
      const { stdout: unstaged } = await execAsync(
        "git diff --name-only",
        { cwd: this.workspaceRoot }
      );
      const { stdout: staged } = await execAsync(
        "git diff --cached --name-only",
        { cwd: this.workspaceRoot }
      );
      const { stdout: untracked } = await execAsync(
        "git ls-files --others --exclude-standard",
        { cwd: this.workspaceRoot }
      );

      const files = new Set<string>();
      const addFiles = (output: string) => {
        output
          .split("\n")
          .map((f) => f.trim())
          .filter((f) => f.length > 0)
          .forEach((f) => files.add(f));
      };

      addFiles(unstaged);
      addFiles(staged);
      addFiles(untracked);

      return Array.from(files);
    } catch {
      return [];
    }
  }

  /**
   * Get files changed between the last two commits.
   */
  async getLastCommitChangedFiles(): Promise<string[]> {
    try {
      const { stdout } = await execAsync(
        "git diff --name-only HEAD~1 HEAD",
        { cwd: this.workspaceRoot }
      );
      return stdout
        .split("\n")
        .map((f) => f.trim())
        .filter((f) => f.length > 0);
    } catch {
      return [];
    }
  }

  /**
   * Get the last N commit messages for context.
   */
  async getRecentCommits(n: number = 5): Promise<string[]> {
    try {
      const { stdout } = await execAsync(
        `git log --oneline -${n}`,
        { cwd: this.workspaceRoot }
      );
      return stdout
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.length > 0);
    } catch {
      return [];
    }
  }

  /**
   * Get the current branch name.
   */
  async getCurrentBranch(): Promise<string> {
    try {
      const { stdout } = await execAsync(
        "git branch --show-current",
        { cwd: this.workspaceRoot }
      );
      return stdout.trim();
    } catch {
      return "unknown";
    }
  }
}
