/** Types for `manifest.mjs`, which stays plain JS so build scripts can run it directly. */

export declare const sourceDirectory: string;
export declare const artDirectory: string;
export declare const fullDirectory: string;
export declare const outputDirectory: string;
export declare const manifestPath: string;
export declare const promptsPath: string;

export declare function readSources(
  name: string,
  stem?: string,
): Promise<{ custom: Buffer | null; full: Buffer | null }>;

export declare function signature(input: {
  title: string;
  kind: string;
  stem: string;
  custom: Buffer | null;
  full: Buffer | null;
}): string;

export declare function readManifest(): Promise<Record<string, string>>;
