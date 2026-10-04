import { describe, expect, it } from "vitest";

import { PALETTE, SPRITES, SPRITE_SIZE } from "./busywork-sprites";

describe("busywork sprites", () => {
  it.each(Object.entries(SPRITES))("%s is a full square grid", (_, rows) => {
    expect(rows).toHaveLength(SPRITE_SIZE);
    for (const row of rows) expect(row).toHaveLength(SPRITE_SIZE);
  });

  it.each(Object.entries(SPRITES))(
    "%s only uses palette colours",
    (_, rows) => {
      for (const char of rows.join("")) expect(PALETTE).toHaveProperty([char]);
    },
  );
});
