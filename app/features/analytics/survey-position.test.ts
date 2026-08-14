import { describe, expect, it } from "vitest";

import {
  POSTHOG_SURVEY_POPUP_POSITION,
  SURVEY_POPUP_LEFT_CSS,
  pinPopoverSurveyAppearance,
} from "./survey-position";

type SurveyFixture = {
  type: string;
  appearance?: { position?: string };
};

describe("pinPopoverSurveyAppearance", () => {
  it("pins a popover with the default (right) position to the bottom left", () => {
    const surveys: SurveyFixture[] = [{ type: "popover", appearance: {} }];

    pinPopoverSurveyAppearance(surveys);

    expect(surveys[0]?.appearance?.position).toBe(
      POSTHOG_SURVEY_POPUP_POSITION,
    );
  });

  it("pins a popover that explicitly asked for the right corner", () => {
    const surveys: SurveyFixture[] = [
      { type: "popover", appearance: { position: "right" } },
    ];

    pinPopoverSurveyAppearance(surveys);

    expect(surveys[0]?.appearance?.position).toBe("left");
  });

  it("creates appearance when a popover has none", () => {
    const surveys: SurveyFixture[] = [{ type: "popover" }];

    pinPopoverSurveyAppearance(surveys);

    expect(surveys[0]?.appearance?.position).toBe("left");
  });

  it("leaves next-to-trigger, top, and middle placements alone", () => {
    const surveys: SurveyFixture[] = [
      { type: "popover", appearance: { position: "next_to_trigger" } },
      { type: "popover", appearance: { position: "top_right" } },
      { type: "popover", appearance: { position: "middle_center" } },
    ];

    pinPopoverSurveyAppearance(surveys);

    expect(surveys.map((survey) => survey.appearance?.position)).toEqual([
      "next_to_trigger",
      "top_right",
      "middle_center",
    ]);
  });

  it("does not move widget tabs or API surveys", () => {
    const surveys: SurveyFixture[] = [
      { type: "widget", appearance: { position: "right" } },
      { type: "api", appearance: { position: "right" } },
    ];

    pinPopoverSurveyAppearance(surveys);

    expect(surveys[0]?.appearance?.position).toBe("right");
    expect(surveys[1]?.appearance?.position).toBe("right");
  });
});

describe("SURVEY_POPUP_LEFT_CSS", () => {
  it("overrides the default bottom-right inline position without touching top-placed surveys", () => {
    expect(POSTHOG_SURVEY_POPUP_POSITION).toBe("left");
    expect(SURVEY_POPUP_LEFT_CSS).toContain("left: 30px !important");
    expect(SURVEY_POPUP_LEFT_CSS).toContain("right: auto !important");
    expect(SURVEY_POPUP_LEFT_CSS).toContain('.ph-survey:not([style*="top"])');
  });
});
