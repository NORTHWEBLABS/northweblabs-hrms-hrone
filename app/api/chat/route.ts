// Route: app/api/chat/route.ts
// Google Gemini — FREE API key from aistudio.google.com/apikey
// Install: npm install ai @ai-sdk/google
import { streamText } from "ai";
import { google } from "@ai-sdk/google";

export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: google("gemini-2.0-flash"),
    system: `You are NorthBot, AI HR assistant for NorthWebLabs HRMS (India). Help with salary/CTC/PF/ESIC/TDS, leave policies, compliance, onboarding, HR letters, attendance, approvals. Concise, Indian context (INR ₹), friendly.`,
    messages,
  });

  return result.toDataStreamResponse();
}