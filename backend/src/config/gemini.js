const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs   = require("fs");
const path = require("path");
const https = require("https");
const http  = require("http");

const GEMINI_KEY = process.env.GEMINI_API_KEY || "";

// Models tried in order — first one that succeeds wins
const MODEL_CHAIN = [
  "gemini-2.0-flash",
  "gemini-1.5-flash",
  "gemini-1.5-pro",
];

// Fetch an image from URL and return { base64, mimeType }
function fetchImageAsBase64(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith("https") ? https : http;
    mod.get(url, res => {
      const chunks = [];
      res.on("data", c => chunks.push(c));
      res.on("end", () => {
        const buf = Buffer.concat(chunks);
        const contentType = res.headers["content-type"] || "image/jpeg";
        resolve({ base64: buf.toString("base64"), mimeType: contentType.split(";")[0] });
      });
    }).on("error", reject);
  });
}

// Read a local upload file and return { base64, mimeType }
function readFileAsBase64(filePath) {
  const buf = fs.readFileSync(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const mime = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" }[ext] || "image/jpeg";
  return { base64: buf.toString("base64"), mimeType: mime };
}

// Try each model in MODEL_CHAIN until one works
async function callGeminiWithFallback(prompt, imageParts) {
  if (!GEMINI_KEY || !GEMINI_KEY.startsWith("AIzaSy")) {
    console.warn("⚠️ Valid Gemini API Key (AIzaSy...) not detected in .env. Falling back to built-in AI engine.");
    return null;
  }
  const genAI = new GoogleGenerativeAI(GEMINI_KEY);

  for (const modelName of MODEL_CHAIN) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });

      const parts = [];
      for (const img of imageParts) {
        parts.push({ inlineData: { mimeType: img.mimeType, data: img.base64 } });
      }
      parts.push({ text: prompt });

      const result = await model.generateContent({ contents: [{ role: "user", parts }] });
      const text = result.response.text();
      console.log(`✅ Gemini model used: ${modelName}`);
      return text;
    } catch (e) {
      const msg = e.message || "";
      const isQuotaError = msg.includes("quota") || msg.includes("RESOURCE_EXHAUSTED") || msg.includes("429");
      const isModelError = msg.includes("not found") || msg.includes("not supported") || msg.includes("deprecated") || msg.includes("404");
      console.warn(`⚠️ ${modelName} failed: ${msg.slice(0, 120)}`);
      // Quota exhausted — stop immediately, all models share the same key quota
      if (isQuotaError) throw new Error("QUOTA_EXHAUSTED");
      // Model unavailable — try next model in chain
      if (isModelError) continue;
      // Any other error — stop
      throw e;
    }
  }
  throw new Error("All Gemini models exhausted");
}

// Main: analyse a construction site photo
async function analyseConstructionPhoto({ photoUrl, localFilePath, blueprintClass, currentCompletion, projectName }) {
  let imageParts = [];
  try {
    if (localFilePath && fs.existsSync(localFilePath)) {
      imageParts.push(readFileAsBase64(localFilePath));
    } else if (photoUrl && photoUrl.startsWith("http")) {
      imageParts.push(await fetchImageAsBase64(photoUrl));
    }
  } catch (e) {
    console.warn("Image fetch failed:", e.message);
  }

  if (imageParts.length === 0) {
    return null;
  }

  const prompt = `You are an expert construction site inspector AI for BuildCore ERP.

FIRST — determine if this image is actually a construction site photo.
A valid construction site photo shows: buildings under construction, scaffolding, foundation work, structural frames, roofing, interior fit-outs, construction materials, heavy machinery on site, or similar construction/civil engineering subjects.

If the image is NOT a construction site photo (e.g. people, sports, food, nature, vehicles, selfies, random objects), respond ONLY with this JSON:
{"not_construction": true, "reason": "<one short sentence describing what the image actually shows>"}

If it IS a construction site photo, respond ONLY with valid JSON (no markdown, no extra text):

{
  "stage_detected": "<specific construction stage name e.g. Foundation Pouring, Structural Steel Erection, Roofing, Interior Fit-outs>",
  "estimated_completion": <integer 0-100 representing estimated % completion of the project>,
  "delay_risk": "<Low|Medium|High>",
  "structural_integrity": "<Normal|Attention Required|Critical>",
  "progress_change": "<e.g. +5% progress | On Schedule | 2 weeks behind>",
  "safety_findings": "<specific safety observations e.g. workers without helmets, no safety nets, or 'All safety standards met'>",
  "stage_details": "<2 sentence description of what you can see in the photo and what work is underway>"
}

Context:
- Project: ${projectName || "Construction Site"}
- Blueprint Type: ${blueprintClass || "Standard Warehouse"}
- Current logged completion: ${currentCompletion || 0}%

Be specific and accurate. Base estimated_completion on visual evidence in the photo.`;

  try {
    const text = await callGeminiWithFallback(prompt, imageParts);
    if (!text) return null;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");
    return JSON.parse(jsonMatch[0]);
  } catch (e) {
    console.error("Gemini parse error:", e.message);
    return null;
  }
}

module.exports = { analyseConstructionPhoto };
