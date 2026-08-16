import { customFetch } from '@workspace/api-client-react';

export type ScreenshotAnalysisField = {
  key: string;
  label: string;
  controlType: string;
  required: boolean;
  confidence: number;
  visibleValue: string;
  pasteInstruction: string;
  sensitive: boolean;
};

export type ScreenshotAnalysis = {
  screenSummary: string;
  formTitle: string;
  fields: ScreenshotAnalysisField[];
  placements: Array<{
    fieldKey: string;
    targetLabel: string;
    controlType: string;
    instruction: string;
    confidence: number;
  }>;
  manualActions: string[];
};

export async function analyzeScreenshot(
  imageBase64: string,
  mimeType: string,
  context?: string,
) {
  return customFetch<ScreenshotAnalysis>('/api/smart-fill/analyze-screenshot', {
    method: 'POST',
    responseType: 'json',
    body: JSON.stringify({ imageBase64, mimeType, context }),
  });
}