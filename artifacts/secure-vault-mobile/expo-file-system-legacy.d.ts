declare module 'expo-file-system/legacy' {
  export const documentDirectory: string | null;

  export function makeDirectoryAsync(
    fileUri: string,
    options?: { intermediates?: boolean },
  ): Promise<void>;

  export function copyAsync(options: { from: string; to: string }): Promise<void>;

  export function writeAsStringAsync(
    fileUri: string,
    contents: string,
    options?: { encoding?: 'utf8' | 'base64' },
  ): Promise<void>;

  export function deleteAsync(
    fileUri: string,
    options?: { idempotent?: boolean },
  ): Promise<void>;
}