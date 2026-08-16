export type ChromeStorageArea = {
  get: (keys?: string | string[] | null) => Promise<Record<string, unknown>>;
  set: (items: Record<string, unknown>) => Promise<void>;
  remove: (keys: string | string[]) => Promise<void>;
  clear: () => Promise<void>;
};

export type ChromeLike = {
  storage?: {
    local?: ChromeStorageArea;
    session?: ChromeStorageArea;
  };
  runtime?: {
    onMessage?: {
      addListener: (
        listener: (
          message: unknown,
          sender: { tab?: { id?: number; url?: string } },
          sendResponse: (response: unknown) => void,
        ) => boolean | void,
      ) => void;
    };
    sendMessage?: (message: unknown) => Promise<unknown>;
    lastError?: { message?: string };
  };
  tabs?: {
    query: (queryInfo: { active?: boolean; currentWindow?: boolean }) => Promise<Array<{ id?: number; url?: string; title?: string }>>;
    get: (tabId: number) => Promise<{ id?: number; url?: string; title?: string }>;
    sendMessage: (tabId: number, message: unknown) => Promise<unknown>;
    onUpdated?: { addListener: (listener: (tabId: number, changeInfo: { url?: string }, tab: { url?: string }) => void) => void };
  };
  scripting?: {
    executeScript: (options: { target: { tabId: number }; files: string[] }) => Promise<unknown>;
  };
};

export const chromeApi = (globalThis as unknown as { chrome?: ChromeLike }).chrome;

export function hasChromeRuntime(): boolean {
  return Boolean(chromeApi?.runtime?.sendMessage);
}