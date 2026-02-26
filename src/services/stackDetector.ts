import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import type { TechStack } from "../types";

interface PackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  workspaces?: string[] | { packages: string[] };
}

const FRAMEWORK_DETECTION: Record<string, string> = {
  "react": "React",
  "react-dom": "React",
  "next": "Next.js",
  "nuxt": "Nuxt",
  "vue": "Vue",
  "@angular/core": "Angular",
  "svelte": "Svelte",
  "@sveltejs/kit": "SvelteKit",
  "express": "Express",
  "fastify": "Fastify",
  "koa": "Koa",
  "nestjs": "NestJS",
  "@nestjs/core": "NestJS",
  "django": "Django",
  "flask": "Flask",
  "laravel": "Laravel",
  "gatsby": "Gatsby",
  "remix": "Remix",
  "@remix-run/react": "Remix",
  "astro": "Astro",
  "solid-js": "SolidJS",
  "preact": "Preact",
  "electron": "Electron",
  "react-native": "React Native",
  "expo": "Expo",
};

const CSS_DETECTION: Record<string, string> = {
  "tailwindcss": "Tailwind CSS",
  "styled-components": "Styled Components",
  "@emotion/react": "Emotion",
  "sass": "SASS/SCSS",
  "@mui/material": "MUI",
  "bootstrap": "Bootstrap",
  "chakra-ui": "Chakra UI",
  "@chakra-ui/react": "Chakra UI",
  "antd": "Ant Design",
};

const BUILD_TOOL_DETECTION: Record<string, string> = {
  "vite": "Vite",
  "webpack": "Webpack",
  "esbuild": "esbuild",
  "rollup": "Rollup",
  "parcel": "Parcel",
  "turbo": "Turborepo",
  "nx": "Nx",
};

export class StackDetectorService {
  private workspaceRoot: string;

  constructor(workspaceRoot: string) {
    this.workspaceRoot = workspaceRoot;
  }

  /**
   * Auto-detect the tech stack from project files.
   */
  async detect(): Promise<TechStack> {
    const stack: TechStack = {
      languages: [],
      frameworks: [],
      buildTools: [],
      packageManager: "unknown",
      hasTypeScript: false,
      cssApproach: [],
      detectedAt: new Date().toISOString(),
    };

    // Detect languages from file extensions
    await this.detectLanguages(stack);

    // Detect from package.json (Node.js ecosystem)
    await this.detectFromPackageJson(stack);

    // Detect from other config files
    await this.detectFromConfigFiles(stack);

    // Detect package manager
    await this.detectPackageManager(stack);

    return stack;
  }

  private async detectLanguages(stack: TechStack): Promise<void> {
    const languageMap: Record<string, string> = {
      ".ts": "TypeScript",
      ".tsx": "TypeScript",
      ".js": "JavaScript",
      ".jsx": "JavaScript",
      ".py": "Python",
      ".rb": "Ruby",
      ".go": "Go",
      ".rs": "Rust",
      ".java": "Java",
      ".php": "PHP",
      ".cs": "C#",
      ".swift": "Swift",
      ".kt": "Kotlin",
    };

    const found = new Set<string>();

    try {
      const files = await vscode.workspace.findFiles(
        "**/*.{ts,tsx,js,jsx,py,rb,go,rs,java,php,cs,swift,kt}",
        "**/node_modules/**",
        100
      );

      for (const file of files) {
        const ext = path.extname(file.fsPath);
        const lang = languageMap[ext];
        if (lang) found.add(lang);
      }
    } catch {
      // Ignore errors
    }

    stack.languages = Array.from(found);
    stack.hasTypeScript = found.has("TypeScript");
  }

  private async detectFromPackageJson(stack: TechStack): Promise<void> {
    const pkgPath = path.join(this.workspaceRoot, "package.json");
    if (!fs.existsSync(pkgPath)) return;

    try {
      const pkgContent = fs.readFileSync(pkgPath, "utf-8");
      const pkg: PackageJson = JSON.parse(pkgContent);
      const allDeps = {
        ...pkg.dependencies,
        ...pkg.devDependencies,
      };

      // Detect frameworks
      for (const [dep, framework] of Object.entries(FRAMEWORK_DETECTION)) {
        if (allDeps[dep]) {
          if (!stack.frameworks.includes(framework)) {
            stack.frameworks.push(framework);
          }
        }
      }

      // Detect CSS approaches
      for (const [dep, cssLib] of Object.entries(CSS_DETECTION)) {
        if (allDeps[dep]) {
          if (!stack.cssApproach.includes(cssLib)) {
            stack.cssApproach.push(cssLib);
          }
        }
      }

      // Detect build tools
      for (const [dep, tool] of Object.entries(BUILD_TOOL_DETECTION)) {
        if (allDeps[dep]) {
          if (!stack.buildTools.includes(tool)) {
            stack.buildTools.push(tool);
          }
        }
      }
    } catch {
      // Invalid package.json
    }
  }

  private async detectFromConfigFiles(stack: TechStack): Promise<void> {
    const configChecks: [string, string, string][] = [
      ["next.config.js", "Next.js", "frameworks"],
      ["next.config.mjs", "Next.js", "frameworks"],
      ["next.config.ts", "Next.js", "frameworks"],
      ["nuxt.config.ts", "Nuxt", "frameworks"],
      ["vue.config.js", "Vue", "frameworks"],
      ["angular.json", "Angular", "frameworks"],
      ["svelte.config.js", "SvelteKit", "frameworks"],
      ["astro.config.mjs", "Astro", "frameworks"],
      ["vite.config.ts", "Vite", "buildTools"],
      ["vite.config.js", "Vite", "buildTools"],
      ["webpack.config.js", "Webpack", "buildTools"],
      ["tailwind.config.js", "Tailwind CSS", "cssApproach"],
      ["tailwind.config.ts", "Tailwind CSS", "cssApproach"],
      ["postcss.config.js", "PostCSS", "cssApproach"],
      ["requirements.txt", "Python", "languages"],
      ["Pipfile", "Python", "languages"],
      ["pyproject.toml", "Python", "languages"],
      ["Gemfile", "Ruby", "languages"],
      ["go.mod", "Go", "languages"],
      ["Cargo.toml", "Rust", "languages"],
      ["composer.json", "PHP", "languages"],
    ];

    for (const [file, name, category] of configChecks) {
      const filePath = path.join(this.workspaceRoot, file);
      if (fs.existsSync(filePath)) {
        const arr = stack[category as keyof TechStack] as string[];
        if (Array.isArray(arr) && !arr.includes(name)) {
          arr.push(name);
        }
      }
    }
  }

  private async detectPackageManager(stack: TechStack): Promise<void> {
    const lockFiles: [string, TechStack["packageManager"]][] = [
      ["bun.lockb", "bun"],
      ["pnpm-lock.yaml", "pnpm"],
      ["yarn.lock", "yarn"],
      ["package-lock.json", "npm"],
    ];

    for (const [file, manager] of lockFiles) {
      if (fs.existsSync(path.join(this.workspaceRoot, file))) {
        stack.packageManager = manager;
        return;
      }
    }
  }
}
