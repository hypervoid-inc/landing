/** Types for `logos.mjs`, which stays plain JS so build scripts can run it directly. */

export declare const LOGOS: Record<string, readonly string[]>;
export declare function brandsIn(text: string): string[];
export declare function logoFor(text: string): string | undefined;
export declare function logoFile(key: string): string;
