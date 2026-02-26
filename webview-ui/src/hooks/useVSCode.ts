import { useCallback } from "react";

// Acquire the VS Code API
interface VSCodeAPI {
  postMessage(message: any): void;
  getState(): any;
  setState(state: any): void;
}

declare function acquireVsCodeApi(): VSCodeAPI;

let vscodeApi: VSCodeAPI | null = null;

function getVSCodeAPI(): VSCodeAPI | null {
  if (vscodeApi) return vscodeApi;
  try {
    vscodeApi = acquireVsCodeApi();
    return vscodeApi;
  } catch {
    // Running outside VS Code (e.g., in browser dev mode)
    console.warn("VS Code API not available — running in standalone mode");
    return null;
  }
}

/**
 * Hook to communicate with the VS Code extension host.
 */
export function useVSCode() {
  const api = getVSCodeAPI();

  const postMessage = useCallback(
    (type: string, payload?: any) => {
      if (api) {
        api.postMessage({ type, payload });
      } else {
        console.log("[Mock] postMessage:", type, payload);
      }
    },
    [api]
  );

  return { postMessage, isVSCode: api !== null };
}
