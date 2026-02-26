import * as vscode from "vscode";
import { DraftAIPanel } from "./panel/DraftAIPanel";
import { LongCatService } from "./services/longcat";
import { TavilyService } from "./services/tavily";
import { StorageService } from "./services/storage";
import { GitService } from "./services/git";
import { StackDetectorService } from "./services/stackDetector";
import { ScannerService } from "./services/scanner";
import { OSVService } from "./services/osv";
import { CompetitorResearchService } from "./services/competitorResearch";
import { UIAuditorService } from "./services/uiAuditor";
import { buildChatSystemPrompt } from "./prompts/chat";
import type { WebviewMessage, ChatMessage } from "./types";

let scanTimer: NodeJS.Timeout | undefined;

export function activate(context: vscode.ExtensionContext) {
  console.log("Draft AI is activating...");

  // ─── Initialize Services ───
  const workspaceRoot =
    vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? "";

  const longcat = new LongCatService();
  const tavily = new TavilyService();
  const storage = new StorageService(context.globalState, context.workspaceState);
  const git = new GitService(workspaceRoot);
  const stackDetector = new StackDetectorService(workspaceRoot);
  const osv = new OSVService();
  const scanner = new ScannerService(longcat, git, osv, workspaceRoot);
  const researchService = new CompetitorResearchService(longcat, tavily);
  const uiAuditor = new UIAuditorService(longcat, tavily, workspaceRoot);

  // Initialize API keys from settings
  const settings = storage.getSettings();
  if (settings.longcatApiKey) {
    longcat.initialize(settings.longcatApiKey);
  }
  if (settings.tavilyApiKey) {
    tavily.initialize(settings.tavilyApiKey);
  }

  // ─── Register Webview Panel ───
  const panelProvider = new DraftAIPanel(context.extensionUri);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      DraftAIPanel.viewType,
      panelProvider,
      { webviewOptions: { retainContextWhenHidden: true } }
    )
  );

  // ─── Handle Webview Messages ───
  panelProvider.onMessage(async (message: WebviewMessage) => {
    try {
      switch (message.type) {
        // ── Profile ──
        case "getProfile": {
          const profile = storage.getProfile();
          panelProvider.postMessage({
            type: "profileLoaded",
            payload: profile ?? null,
          });
          break;
        }

        case "saveProfile": {
          await storage.saveProfile(message.payload);
          panelProvider.postMessage({ type: "profileSaved" });

          // Auto-detect tech stack after profile is saved
          const stack = await stackDetector.detect();
          panelProvider.postMessage({
            type: "techStackDetected",
            payload: stack,
          });
          break;
        }

        // ── Scores ──
        case "getScores": {
          const scores = storage.getScores();
          panelProvider.postMessage({
            type: "scoresUpdated",
            payload: scores,
          });
          break;
        }

        // ── Settings ──
        case "getSettings": {
          const currentSettings = storage.getSettings();
          panelProvider.postMessage({
            type: "settingsLoaded",
            payload: currentSettings,
          });
          break;
        }

        case "saveSettings": {
          const newSettings = message.payload;
          if (!newSettings || typeof newSettings !== "object") {
            console.warn("saveSettings: invalid payload");
            break;
          }
          for (const [key, value] of Object.entries(newSettings)) {
            await storage.saveSetting(key, value);
          }
          // Re-initialize APIs if keys changed
          if (newSettings.longcatApiKey) {
            longcat.initialize(newSettings.longcatApiKey as string);
          }
          if (newSettings.tavilyApiKey) {
            tavily.initialize(newSettings.tavilyApiKey as string);
          }
          break;
        }

        // ── Code Health ──
        case "runScan": {
          // Detect stack and get profile
          const scanTechStack = await stackDetector.detect();
          const scanProfile = storage.getProfile();
          const scanSettings = storage.getSettings();

          try {
            const scanResult = await scanner.runScan(
              scanTechStack,
              scanProfile,
              scanSettings.gitAwareScanning,
              (progress) => {
                panelProvider.postMessage({
                  type: "scanProgress",
                  payload: progress,
                });
              }
            );

            // Apply suppressed issues
            const suppressed = storage.getSuppressedIssues();
            for (const issue of scanResult.issues) {
              if (suppressed.includes(issue.id)) {
                issue.suppressed = true;
              }
            }

            // Save scan result
            await storage.saveScanResult(scanResult);

            // Update health score
            const currentScores = storage.getScores();
            currentScores.codeHealth = scanResult.healthScore;
            await storage.saveScores(currentScores);

            panelProvider.postMessage({
              type: "scanComplete",
              payload: scanResult,
            });
            panelProvider.postMessage({
              type: "scoresUpdated",
              payload: currentScores,
            });

            // VS Code notification
            const critCount = scanResult.issues.filter(
              (i) => i.severity === "critical" && !i.suppressed
            ).length;
            if (critCount > 0) {
              vscode.window.showWarningMessage(
                `Draft AI: Scan found ${critCount} critical issue${critCount > 1 ? "s" : ""}. Health score: ${scanResult.healthScore}/100`
              );
            } else {
              vscode.window.showInformationMessage(
                `Draft AI: Scan complete! Health score: ${scanResult.healthScore}/100`
              );
            }
          } catch (err: any) {
            panelProvider.postMessage({
              type: "scanProgress",
              payload: { status: "error", message: `Scan failed: ${err.message}` },
            });
          }
          break;
        }

        case "getScanResults": {
          const latestScan = storage.getLatestScan();
          panelProvider.postMessage({
            type: "scanComplete",
            payload: latestScan ?? null,
          });
          break;
        }

        case "suppressIssue": {
          const issueId = message.payload?.issueId;
          if (issueId) {
            await storage.suppressIssue(issueId);
          }
          break;
        }

        // ── Competitor Research ──
        case "runResearch": {
          const depth = message.payload?.depth ?? "surface";
          const profile = storage.getProfile();
          const techStack = await stackDetector.detect();
          const scores = storage.getScores();

          if (!profile) {
            panelProvider.postMessage({
              type: "error",
              payload: "Please complete the project profile before running research.",
            });
            break;
          }

          try {
            const result = await researchService.runResearch(
              profile,
              techStack,
              depth,
              scores.codeHealth,
              (progress) => {
                panelProvider.postMessage({
                  type: "researchProgress",
                  payload: progress,
                });
              }
            );

            // Save results
            await storage.saveCompetitorResults(result);

            // Update scores
            scores.competitivePosition = result.competitiveScore;
            await storage.saveScores(scores);

            panelProvider.postMessage({
              type: "researchComplete",
              payload: result,
            });
            panelProvider.postMessage({
              type: "scoresUpdated",
              payload: scores,
            });

            vscode.window.showInformationMessage(
              `Draft AI: Competitor research complete! Score: ${result.competitiveScore}/100`
            );
          } catch (err: any) {
            panelProvider.postMessage({
              type: "researchProgress",
              payload: { status: "error", message: `Research failed: ${err.message}` },
            });
          }
          break;
        }

        case "getResearchResults": {
          const research = storage.getCompetitorResults();
          panelProvider.postMessage({
            type: "researchComplete",
            payload: research ?? null,
          });
          break;
        }

        // ── UI Audit ──
        case "runAudit": {
          const auditProfile = storage.getProfile();
          const auditTechStack = await stackDetector.detect();
          const auditComparisonUrl = message.payload?.comparisonUrl;

          if (!auditProfile) {
            panelProvider.postMessage({
              type: "error",
              payload: "Please complete the project profile before running an audit.",
            });
            break;
          }

          try {
            const auditResult = await uiAuditor.runAudit(
              auditProfile,
              auditTechStack,
              auditComparisonUrl,
              (progress) => {
                panelProvider.postMessage({
                  type: "auditComplete",
                  payload: { ...progress, _isProgress: true },
                });
              }
            );

            // Save results
            await storage.saveAuditResults(auditResult);

            // Update UI consistency score (average of 3 sub-scores)
            const auditScores = storage.getScores();
            auditScores.uiConsistency = Math.round(
              (auditResult.designConsistencyScore +
                auditResult.accessibilityScore +
                auditResult.structureScore) / 3
            );
            await storage.saveScores(auditScores);

            panelProvider.postMessage({
              type: "auditComplete",
              payload: auditResult,
            });
            panelProvider.postMessage({
              type: "scoresUpdated",
              payload: auditScores,
            });

            const avgScore = auditScores.uiConsistency;
            vscode.window.showInformationMessage(
              `Draft AI: UI audit complete! Average score: ${avgScore}/100`
            );
          } catch (err: any) {
            panelProvider.postMessage({
              type: "error",
              payload: `UI audit failed: ${err.message}`,
            });
          }
          break;
        }

        case "getAuditResults": {
          const audit = storage.getAuditResults();
          panelProvider.postMessage({
            type: "auditComplete",
            payload: audit ?? null,
          });
          break;
        }

        // ── Chat ──
        case "sendChatMessage": {
          const userMsg = message.payload as { content: string; context?: string } | undefined;

          if (!userMsg?.content) {
            panelProvider.postMessage({
              type: "error",
              payload: "Invalid chat message.",
            });
            break;
          }

          if (!longcat.isReady()) {
            panelProvider.postMessage({
              type: "error",
              payload: "LongCat API key not set. Go to Settings to add your key.",
            });
            break;
          }

          // Save user message
          const userChatMsg: ChatMessage = {
            id: `msg-${Date.now()}`,
            role: "user",
            content: userMsg.content,
            timestamp: new Date().toISOString(),
            context: userMsg.context,
          };
          await storage.addChatMessage(userChatMsg);

          // Build context for the AI
          const chatTechStack = await stackDetector.detect();
          const systemPrompt = buildChatSystemPrompt({
            profile: storage.getProfile(),
            scan: storage.getLatestScan(),
            competitor: storage.getCompetitorResults(),
            audit: storage.getAuditResults(),
            techStack: chatTechStack,
            activeTab: userMsg.context,
          });

          // Get recent chat history for context
          const chatHistory = storage.getChatHistory().slice(-10);
          const messages = [
            { role: "system" as const, content: systemPrompt },
            ...chatHistory.map((m) => ({
              role: m.role as "user" | "assistant",
              content: m.content,
            })),
          ];

          try {
            // Stream the response
            let fullResponse = "";
            for await (const chunk of longcat.chatStream(messages)) {
              fullResponse += chunk;
              panelProvider.postMessage({
                type: "chatStreamChunk",
                payload: { chunk, fullResponse },
              });
            }

            // Save assistant message
            const assistantMsg: ChatMessage = {
              id: `msg-${Date.now()}`,
              role: "assistant",
              content: fullResponse,
              timestamp: new Date().toISOString(),
            };
            await storage.addChatMessage(assistantMsg);

            panelProvider.postMessage({
              type: "chatResponse",
              payload: assistantMsg,
            });
          } catch (error: any) {
            panelProvider.postMessage({
              type: "error",
              payload: `Chat error: ${error.message}`,
            });
          }
          break;
        }

        case "getChatHistory": {
          const history = storage.getChatHistory();
          panelProvider.postMessage({
            type: "chatResponse",
            payload: history,
          });
          break;
        }

        case "clearChatHistory": {
          await storage.clearChatHistory();
          panelProvider.postMessage({ type: "chatCleared" });
          break;
        }

        // ── Team Mode ──
        case "enableTeamMode": {
          await storage.exportTeamConfig(workspaceRoot);
          panelProvider.postMessage({
            type: "teamModeStatus",
            payload: { enabled: true },
          });
          vscode.window.showInformationMessage(
            "Draft AI: Team Mode enabled! .draftai.json created in your project root."
          );
          break;
        }

        case "disableTeamMode": {
          panelProvider.postMessage({
            type: "teamModeStatus",
            payload: { enabled: false },
          });
          break;
        }

        // ── Tech Stack ──
        case "getTechStack": {
          const detectedStack = await stackDetector.detect();
          panelProvider.postMessage({
            type: "techStackDetected",
            payload: detectedStack,
          });
          break;
        }

        default:
          console.warn(`Unknown message type: ${message.type}`);
      }
    } catch (error: any) {
      console.error("Error handling webview message:", error);
      panelProvider.postMessage({
        type: "error",
        payload: error.message,
      });
    }
  });

  // ─── Register Commands ───
  context.subscriptions.push(
    vscode.commands.registerCommand("draftai.openPanel", () => {
      vscode.commands.executeCommand("draftai.mainView.focus");
    }),
    vscode.commands.registerCommand("draftai.runScan", () => {
      panelProvider.postMessage({ type: "runScan" });
    }),
    vscode.commands.registerCommand("draftai.runResearch", () => {
      panelProvider.postMessage({ type: "runResearch" });
    }),
    vscode.commands.registerCommand("draftai.runAudit", () => {
      panelProvider.postMessage({ type: "runAudit" });
    }),
    vscode.commands.registerCommand("draftai.editProfile", () => {
      panelProvider.postMessage({ type: "getProfile" });
    })
  );

  // ─── Listen for Settings Changes ───
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("draftai")) {
        const updatedSettings = storage.getSettings();
        if (updatedSettings.longcatApiKey) {
          longcat.initialize(updatedSettings.longcatApiKey);
        }
        if (updatedSettings.tavilyApiKey) {
          tavily.initialize(updatedSettings.tavilyApiKey);
        }
      }
    })
  );

  console.log("Draft AI activated successfully! 🐱");
}

export function deactivate() {
  if (scanTimer) {
    clearInterval(scanTimer);
    scanTimer = undefined;
  }
  console.log("Draft AI deactivated.");
}

