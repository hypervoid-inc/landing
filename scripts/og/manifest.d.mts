/** Types for `manifest.mjs`, which stays plain JS so build scripts can run it directly. */

export declare const sourceDirectory: string;
export declare const posterDirectory: string;
export declare const styleDirectory: string;
export declare const outputDirectory: string;
export declare const manifestPath: string;
export declare const promptsPath: string;

export declare function readSources(
  name: string,
  stem?: string,
): Promise<{ custom: Buffer | null; poster: Buffer | null }>;

export declare function signature(input: {
  stem: string;
  eyebrow: string;
  headline: readonly string[];
  fullFrame?: boolean;
  custom: Buffer | null;
  poster: Buffer | null;
}): string;

export declare function readManifest(): Promise<Record<string, string>>;
