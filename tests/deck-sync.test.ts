import { describe, expect, it } from "vitest";

import { deckSlides } from "../app/features/deck/slides";
import {
  altText,
  compareDecks,
  labelOf,
  raiseOf,
  slidesFromFile,
  wordDiff,
  youtubeIdsOf,
} from "../scripts/deck/figma.mjs";

/** A Figma Slides file as the REST API returns it, cut to three slides. */
const file = {
  editorType: "slides",
  document: {
    id: "0:0",
    type: "DOCUMENT",
    children: [
      {
        id: "0:1",
        type: "CANVAS",
        children: [
          {
            id: "grid",
            type: "SLIDE_GRID",
            children: [
              {
                id: "row",
                type: "SLIDE_ROW",
                children: [
                  {
                    id: "1:1",
                    type: "SLIDE",
                    absoluteBoundingBox: { x: 240, y: 240, width: 1920, height: 1080 },
                    children: [
                      { id: "1:2", type: "TEXT", characters: "Construct", absoluteBoundingBox: { x: 300, y: 300, width: 100, height: 30 } },
                      { id: "1:3", type: "TEXT", characters: "A squad of AI employees\nfor your Team.", absoluteBoundingBox: { x: 360, y: 620, width: 1000, height: 200 } },
                      { id: "1:4", type: "TEXT", characters: "Draft note", visible: false, absoluteBoundingBox: { x: 360, y: 900, width: 100, height: 30 } },
                    ],
                  },
                  {
                    id: "2:1",
                    type: "SLIDE",
                    absoluteBoundingBox: { x: 2400, y: 240, width: 1920, height: 1080 },
                    children: [
                      {
                        id: "2:9",
                        type: "FRAME",
                        absoluteBoundingBox: { x: 2400, y: 240, width: 1920, height: 1080 },
                        children: [
                          { id: "2:2", type: "INTERACTIVE_SLIDE_ELEMENT", absoluteBoundingBox: { x: 3425, y: 651, width: 800, height: 450 } },
                          { id: "2:3", type: "INTERACTIVE_SLIDE_ELEMENT", absoluteBoundingBox: { x: 2538, y: 651, width: 800, height: 450 } },
                        ],
                      },
                      { id: "2:4", type: "TEXT", characters: "03", absoluteBoundingBox: { x: 4114, y: 318, width: 72, height: 24 } },
                      { id: "2:5", type: "TEXT", characters: "SOLUTION", absoluteBoundingBox: { x: 2530, y: 377, width: 115, height: 27 } },
                      {
                        id: "2:6",
                        type: "TEXT",
                        characters: "Watch Demo on Youtube",
                        style: { hyperlink: { type: "URL", url: "https://www.youtube.com/watch?v=0lQWyT4PAA8" } },
                        absoluteBoundingBox: { x: 2812, y: 1174, width: 252, height: 29 },
                      },
                    ],
                  },
                  {
                    id: "3:1",
                    type: "SLIDE",
                    absoluteBoundingBox: { x: 4560, y: 240, width: 1920, height: 1080 },
                    children: [
                      { id: "3:2", type: "TEXT", characters: "The Ask", absoluteBoundingBox: { x: 5293, y: 412, width: 449, height: 86 } },
                      { id: "3:3", type: "TEXT", characters: "$190K", absoluteBoundingBox: { x: 4969, y: 748, width: 209, height: 36 } },
                      { id: "3:4", type: "TEXT", characters: "We are raising pre-seed round of", absoluteBoundingBox: { x: 5225, y: 852, width: 585, height: 35 } },
                      { id: "3:5", type: "TEXT", characters: "$450K", absoluteBoundingBox: { x: 5268, y: 927, width: 504, height: 95 } },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
};

describe("slidesFromFile", () => {
  const slides = slidesFromFile(file);

  it("reads the slides in deck order, sized, with hidden layers left out", () => {
    expect(slides.map((slide) => slide.id)).toEqual(["1:1", "2:1", "3:1"]);
    expect(slides[0]).toMatchObject({ width: 1920, height: 1080 });
    expect(slides[0]!.texts.map((t) => t.text)).toEqual(["Construct", "A squad of AI employees\nfor your Team."]);
  });

  it("places text and videos relative to their slide, videos left to right", () => {
    expect(slides[1]!.embeds.map((e) => e.box)).toEqual([
      { x: 138, y: 411, w: 800, h: 450 },
      { x: 1025, y: 411, w: 800, h: 450 },
    ]);
    expect(slides[1]!.texts.find((t) => t.url)).toMatchObject({
      text: "Watch Demo on Youtube",
      box: { x: 412, y: 934, w: 252, h: 29 },
    });
  });

  it("refuses a file with no slides", () => {
    expect(() => slidesFromFile({ editorType: "figma", document: { type: "DOCUMENT", children: [] } })).toThrow(
      /No slides in this file \(a figma file\)/,
    );
  });
});

describe("what a slide says", () => {
  const [cover, solution, ask] = slidesFromFile(file);

  it("reads the words aloud without the page number or the logo", () => {
    expect(altText(cover!.texts)).toBe("A squad of AI employees for your Team.");
    expect(altText(solution!.texts)).toBe("SOLUTION. Watch Demo on Youtube.");
  });

  it("titles a slide from its section label", () => {
    expect(labelOf(solution!.texts)).toBe("Solution");
    expect(labelOf(cover!.texts)).toBeNull();
  });

  it("finds the round on the slide that says raising, the largest amount there", () => {
    expect(raiseOf([cover!, solution!, ask!])).toBe("$450K");
    expect(raiseOf([cover!, solution!])).toBeNull();
  });

  it("finds the YouTube videos a slide links to", () => {
    expect(youtubeIdsOf(solution!.texts)).toEqual(["0lQWyT4PAA8"]);
  });
});

describe("compareDecks", () => {
  const deck = [
    { id: "a", text: "one" },
    { id: "b", text: "two" },
    { id: "c", text: "three" },
  ];

  it("sees nothing when nothing changed", () => {
    expect(compareDecks(deck, deck)).toEqual({ added: [], removed: [], reordered: false, textChanged: [] });
  });

  it("sees new, gone, moved and reworded slides", () => {
    const next = [
      { id: "c", text: "three" },
      { id: "a", text: "one, revised" },
      { id: "d", text: "four" },
    ];
    expect(compareDecks(deck, next)).toEqual({ added: ["d"], removed: ["b"], reordered: true, textChanged: ["a"] });
  });
});

describe("wordDiff", () => {
  it("marks what went and what came, with a little context", () => {
    expect(wordDiff("We are raising a round of $300K in funds", "We are raising a round of $450K in funds")).toBe(
      "... a round of [-$300K-] {+$450K+} in funds",
    );
  });
});

describe("deckSlides", () => {
  it("keeps titles and videos with their slide wherever it moves, and labels a new one", () => {
    const merged = deckSlides([
      { id: "13:21", label: "Solution", text: "SOLUTION." },
      { id: "99:1", label: "Appendix", text: "APPENDIX." },
      { id: "9:3", label: null, text: "Cover words." },
    ]);
    expect(merged.map((slide) => slide.title)).toEqual(["Solution", "Appendix", "Cover"]);
    expect(merged[0]!.videos?.map((video) => video.youtubeId)).toEqual(["0lQWyT4PAA8", "G2p-gNXlyKE"]);
    expect(merged[2]!.alt).toBe("Cover words.");
  });
});
