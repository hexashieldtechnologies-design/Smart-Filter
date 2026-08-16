import { Router, type IRouter } from "express";

const router: IRouter = Router();

type GeminiField = {
  key: string;
  label: string;
  controlType: string;
  required: boolean;
  confidence: number;
  visibleValue: string;
  pasteInstruction: string;
  sensitive: boolean;
};

type GeminiPlacement = {
  fieldKey: string;
  targetLabel: string;
  controlType: string;
  instruction: string;
  confidence: number;
};

const responseSchema = {
  type: "OBJECT",
  properties: {
    screenSummary: { type: "STRING" },
    formTitle: { type: "STRING" },
    fields: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          key: { type: "STRING" },
          label: { type: "STRING" },
          controlType: { type: "STRING" },
          required: { type: "BOOLEAN" },
          confidence: { type: "NUMBER" },
          visibleValue: { type: "STRING" },
          pasteInstruction: { type: "STRING" },
          sensitive: { type: "BOOLEAN" },
        },
        required: [
          "key",
          "label",
          "controlType",
          "required",
          "confidence",
          "visibleValue",
          "pasteInstruction",
          "sensitive",
        ],
      },
    },
    placements: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          fieldKey: { type: "STRING" },
          targetLabel: { type: "STRING" },
          controlType: { type: "STRING" },
          instruction: { type: "STRING" },
          confidence: { type: "NUMBER" },
        },
        required: [
          "fieldKey",
          "targetLabel",
          "controlType",
          "instruction",
          "confidence",
        ],
      },
    },
    manualActions: {
      type: "ARRAY",
      items: { type: "STRING" },
    },
  },
  required: ["screenSummary", "formTitle", "fields", "placements", "manualActions"],
};

function stringValue(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function numberValue(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.min(100, value))
    : fallback;
}

function booleanValue(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function parseGeminiJson(text: string) {
  const withoutFences = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  const parsed = JSON.parse(withoutFences) as Record<string, unknown>;
  const fields = Array.isArray(parsed.fields) ? parsed.fields : [];
  const placements = Array.isArray(parsed.placements) ? parsed.placements : [];
  const manualActions = Array.isArray(parsed.manualActions)
    ? parsed.manualActions.filter((item): item is string => typeof item === "string")
    : [];

  return {
    screenSummary: stringValue(parsed.screenSummary, "Screen analysis complete."),
    formTitle: stringValue(parsed.formTitle, "Detected form"),
    fields: fields.map((field): GeminiField => {
      const item = field && typeof field === "object" ? field as Record<string, unknown> : {};
      return {
        key: stringValue(item.key, "unknown"),
        label: stringValue(item.label, "Unnamed field"),
        controlType: stringValue(item.controlType, "text"),
        required: booleanValue(item.required),
        confidence: numberValue(item.confidence),
        visibleValue: stringValue(item.visibleValue),
        pasteInstruction: stringValue(item.pasteInstruction, "Review this field before pasting."),
        sensitive: booleanValue(item.sensitive),
      };
    }),
    placements: placements.map((placement): GeminiPlacement => {
      const item = placement && typeof placement === "object"
        ? placement as Record<string, unknown>
        : {};
      return {
        fieldKey: stringValue(item.fieldKey, "unknown"),
        targetLabel: stringValue(item.targetLabel, "Detected field"),
        controlType: stringValue(item.controlType, "text"),
        instruction: stringValue(item.instruction, "Review the target before pasting."),
        confidence: numberValue(item.confidence),
      };
    }),
    manualActions,
  };
}

router.post("/smart-fill/analyze-screenshot", async (req, res) => {
  const apiKey = process.env.GOOGLE_AI_STUDIO_API_KEY;
  if (!apiKey) {
    res.status(503).json({ message: "Screenshot analysis is not configured on the server." });
    return;
  }

  const body = req.body as {
    imageBase64?: unknown;
    mimeType?: unknown;
    context?: unknown;
  };
  const imageBase64 = typeof body.imageBase64 === "string" ? body.imageBase64.trim() : "";
  const mimeType = typeof body.mimeType === "string" ? body.mimeType : "image/jpeg";
  const context = typeof body.context === "string" ? body.context.trim() : "";
  const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

  if (!imageBase64 || imageBase64.length > 10_000_000) {
    res.status(400).json({ message: "Upload a screenshot smaller than 7.5 MB." });
    return;
  }
  if (!allowedMimeTypes.has(mimeType)) {
    res.status(400).json({ message: "Only JPEG, PNG, and WebP screenshots are supported." });
    return;
  }

  const prompt = [
    "Analyze this screenshot as a Smart Fill assistant.",
    "Return only JSON matching the response schema.",
    "Identify every visible form control and explain exactly where an approved value should be pasted.",
    "Use stable semantic keys such as fullName, firstName, lastName, email, phone, dob, address, city, state, pincode, aadhaar, pan, passportNumber, linkedinUrl, resume, employer, consent.",
    "Use an empty visibleValue when the screenshot does not visibly contain a value. Never invent a personal value.",
    "Mark password, government ID, date of birth, address, payment, and other high-impact controls as sensitive.",
    "Never recommend auto-filling CAPTCHA, OTP, security questions, payment fields, consent checkboxes, or final submit buttons.",
    "Include manualActions for anything the user must complete manually.",
    context ? `Additional context from the user: ${context}` : "",
  ].filter(Boolean).join("\n");

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            role: "user",
            parts: [
              { text: prompt },
              { inlineData: { mimeType, data: imageBase64 } },
            ],
          }],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: "application/json",
            responseSchema,
            maxOutputTokens: 8192,
          },
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      req.log.error({ status: response.status, error: errorText.slice(0, 300) }, "Gemini screenshot analysis failed");
      res.status(502).json({ message: "The screenshot analysis service could not process this image." });
      return;
    }

    const payload = await response.json() as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = payload.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? "")
      .join("")
      .trim();
    if (!text) {
      res.status(502).json({ message: "The screenshot analysis service returned no result." });
      return;
    }

    res.json(parseGeminiJson(text));
  } catch (error) {
    req.log.error({ error }, "Screenshot analysis request failed");
    res.status(502).json({ message: "Screenshot analysis failed. Please try another image." });
  }
});

export default router;