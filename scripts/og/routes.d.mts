/** Types for `routes.mjs`, which stays plain JS so build scripts can run it directly. */

export type Card = {
  name: string;
  kind: string;
  title: string;
  eyebrow: string;
  headline: readonly string[];
  scene: string;
  fullFrame: boolean;
  stem: string;
};

export declare function loadCards(): Promise<Card[]>;
