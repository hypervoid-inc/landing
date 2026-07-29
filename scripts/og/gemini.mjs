import { Buffer } from "node:buffer";
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { costOf } from "./pricing.mjs";

/**
 * A minimal Gemini image-generation client.
 *
 * Deliberately `fetch` against the REST API rather than the SDK: this is the
 * only place the project talks to Gemini, the request is three fields, and a
 * dependency that ships its own auth and retry stack would be more surface than
 * the feature needs.
 */

const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";
const root = fileURLToPath(new URL("../../", import.meta.url));

const MIME_TYPES = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

export function apiKey() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error(
      "GEMINI_API_KEY is not set. Add it to .env (already gitignored) — get one at https://aistudio.google.com/apikey",
    );
  }
  return key;
}

/**
 * Reference images, sent ahead of the prompt with a label before each one.
 *
 * The labels matter as much as the images: unlabelled, the model averages every
 * reference into a single mood and the mascot drifts. Told which image is the
 * logo and which is only the material, it treats them differently.
 *
 * A reference that fails to load is fatal rather than skipped — silently
 * dropping one would quietly produce off-brand art that still looks plausible.
 */
async function referenceParts(references) {
  const parts = [];
  for (const [index, reference] of references.entries()) {
    const { file, note } = reference;
    const mimeType = MIME_TYPES[path.extname(file).toLowerCase()];
    if (!mimeType) throw new Error(`Unsupported reference image: ${file}`);
    parts.push(
      { text: `Reference ${index + 1} — ${note}` },
      {
        inlineData: {
          mimeType,
          data: (await readFile(path.join(root, file))).toString("base64"),
        },
      },
    );
  }
  return parts;
}

function imagePart(candidate) {
  return candidate?.content?.parts?.find((part) => part.inlineData?.data);
}

/**
 * Turns an unsuccessful response into a message worth reading. Gemini signals
 * refusals through `finishReason` and `promptFeedback` rather than HTTP status,
 * so a 200 with no image is the common failure and needs explaining.
 */
function describeFailure(body) {
  const candidate = body.candidates?.[0];
  const reason = candidate?.finishReason;
  const blocked = body.promptFeedback?.blockReason;
  const text = candidate?.content?.parts?.find((part) => part.text)?.text;

  if (blocked) return `prompt blocked (${blocked})`;
  if (reason && reason !== "STOP") return `finishReason ${reason}`;
  if (text)
    return `model returned text instead of an image: ${text.slice(0, 200)}`;
  return "response contained no image";
}

/**
 * Generates one image. Returns its bytes plus the usage and cost of the call.
 *
 * Retries only transient failures — rate limits, server errors, and empty
 * responses, which are usually a one-off. A safety block is deterministic and
 * retrying it just spends money to fail again.
 */
export async function generateImage({
  model,
  prompt,
  references = [],
  aspectRatio = "1:1",
  imageSize = "2K",
  attempts = 3,
}) {
  const parts = [
    {
      text: "The images below are brand references. Study them before reading the instructions that follow, and match them.",
    },
    ...(await referenceParts(references)),
    { text: prompt },
  ];
  const body = {
    contents: [{ role: "user", parts }],
    generationConfig: {
      responseModalities: ["IMAGE"],
      imageConfig: { aspectRatio, imageSize },
    },
  };

  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const response = await fetch(`${ENDPOINT}/${model}:generateContent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey(),
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const detail = await response.text();
      lastError = new Error(
        `Gemini ${response.status}: ${detail.slice(0, 400)}`,
      );
      // 4xx other than rate limiting means the request itself is wrong.
      if (response.status !== 429 && response.status < 500) throw lastError;
    } else {
      const payload = await response.json();
      const image = imagePart(payload.candidates?.[0]);
      if (image) {
        return {
          data: Buffer.from(image.inlineData.data, "base64"),
          mimeType: image.inlineData.mimeType,
          usage: payload.usageMetadata,
          cost: costOf(model, payload.usageMetadata),
        };
      }
      lastError = new Error(describeFailure(payload));
      if (payload.promptFeedback?.blockReason) throw lastError;
    }

    if (attempt < attempts) {
      await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
    }
  }
  throw lastError;
}
