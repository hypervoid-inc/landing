import { ProductHuntConfetti } from "./product-hunt-confetti";

/** Root-only launch confetti. Banner lives in SiteHeader on every page. */
export function ProductHuntChrome() {
  return <ProductHuntConfetti />;
}
