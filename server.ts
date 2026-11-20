import "dotenv/config";
import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import type {
  WardrobeItem,
  WeatherCondition,
  WeatherContext,
  StylePreference,
  OccasionType,
  UserProfile,
  GeneratedOutfit,
} from "./src/types.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    throw new Error(
      "GEMINI_API_KEY is not configured. Please add your Gemini API key in Settings > Secrets."
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

async function withRetry<T>(fn: () => Promise<T>, retries = 2): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      lastError = err;
      const msg = err instanceof Error ? err.message : String(err);
      const isTransient =
        msg.includes("503") ||
        msg.includes("UNAVAILABLE") ||
        msg.includes("ECONNRESET") ||
        msg.includes("429");
      if (!isTransient || attempt === retries) {
        throw err;
      }
      await new Promise((r) => setTimeout(r, 600 * Math.pow(2, attempt)));
    }
  }
  throw lastError;
}

function formatGeminiError(err: unknown): { status: number; message: string } {
  const raw = err instanceof Error ? err.message : String(err);
  if (raw.includes("GEMINI_API_KEY is not configured")) {
    return { status: 400, message: raw };
  }
  if (raw.includes("API_KEY_INVALID") || raw.includes("PERMISSION_DENIED") || raw.includes("403")) {
    return {
      status: 403,
      message:
        "Gemini API key was rejected or lacks permission. Please verify your key in Settings > Secrets.",
    };
  }
  if (raw.includes("RESOURCE_EXHAUSTED") || raw.includes("429")) {
    return {
      status: 429,
      message:
        "Gemini API quota temporarily reached. Please wait a moment and try again, or check your billing tier in Settings > Secrets.",
    };
  }
  return {
    status: 500,
    message: raw || "An unexpected error occurred while contacting the AI stylist.",
  };
}

function mapWmoCodeToCondition(code: number, windKph: number, humidity: number): WeatherCondition {
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "Snowy";
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99].includes(code)) {
    return "Rainy";
  }
  if (windKph >= 28) return "Windy";
  if ([45, 48, 3].includes(code)) return "Cloudy";
  if ([1, 2].includes(code)) return "Partly Cloudy";
  if (humidity >= 80 && code === 0) return "Humid";
  return "Sunny";
}

function resolveImageToInlinePart(imageUrl: string): { mimeType: string; data: string } | null {
  try {
    if (imageUrl.startsWith("data:")) {
      const match = imageUrl.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
      if (!match) return null;
      return { mimeType: match[1], data: match[2] };
    }
    if (imageUrl.startsWith("/src/assets/")) {
      const safeRel = imageUrl.replace(/^\/+/, "");
      const absPath = path.resolve(__dirname, safeRel);
      if (absPath.startsWith(path.resolve(__dirname, "src/assets")) && fs.existsSync(absPath)) {
        const buf = fs.readFileSync(absPath);
        const ext = path.extname(absPath).toLowerCase();
        const mimeType = ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";
        return { mimeType, data: buf.toString("base64") };
      }
    }
  } catch {
    return null;
  }
  return null;
}

function stripDataUrlPrefix(input: string, fallbackMime = "image/jpeg"): { mimeType: string; data: string } {
  const match = input.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
  if (match) {
    return { mimeType: match[1], data: match[2] };
  }
  return { mimeType: fallbackMime, data: input };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: "25mb" }));

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.get("/api/weather", async (req, res) => {
    try {
      const cityQuery = typeof req.query.city === "string" ? req.query.city.trim() : "";
      const latParam = typeof req.query.lat === "string" ? Number(req.query.lat) : NaN;
      const lonParam = typeof req.query.lon === "string" ? Number(req.query.lon) : NaN;

      let latitude: number;
      let longitude: number;
      let resolvedCity = cityQuery || "Current Location";
      let resolvedCountry: string | undefined;

      if (!Number.isNaN(latParam) && !Number.isNaN(lonParam)) {
        latitude = latParam;
        longitude = lonParam;
        try {
          const revRes = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
          );
          if (revRes.ok) {
            const revData = (await revRes.json()) as {
              city?: string;
              locality?: string;
              countryName?: string;
            };
            resolvedCity = revData.city || revData.locality || "Current Location";
            resolvedCountry = revData.countryName;
          }
        } catch {
          // Keep fallback label if reverse geocoding is unavailable
        }
      } else if (cityQuery) {
        const geoRes = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
            cityQuery
          )}&count=1&language=en&format=json`
        );
        if (!geoRes.ok) {
          return res.status(502).json({ error: "Unable to reach location geocoding service." });
        }
        const geoJson = (await geoRes.json()) as {
          results?: Array<{
            name: string;
            country?: string;
            latitude: number;
            longitude: number;
          }>;
        };
        const match = geoJson.results?.[0];
        if (!match) {
          return res.status(404).json({
            error: `Could not find "${cityQuery}". Try a major city name or adjust weather manually.`,
          });
        }
        latitude = match.latitude;
        longitude = match.longitude;
        resolvedCity = match.name;
        resolvedCountry = match.country;
      } else {
        return res.status(400).json({ error: "Provide a city name or coordinates." });
      }

      const forecastUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&timezone=auto`;
      const wxRes = await fetch(forecastUrl);
      if (!wxRes.ok) {
        return res.status(502).json({ error: "Unable to fetch live weather forecast." });
      }
      const wxData = (await wxRes.json()) as {
        current?: {
          temperature_2m: number;
          apparent_temperature: number;
          relative_humidity_2m: number;
          weather_code: number;
          wind_speed_10m: number;
        };
      };

      if (!wxData.current) {
        return res.status(502).json({ error: "Weather service returned an incomplete forecast." });
      }

      const current = wxData.current;
      const weather: WeatherContext = {
        city: resolvedCity,
        country: resolvedCountry,
        temperatureC: Math.round(current.temperature_2m),
        feelsLikeC: Math.round(current.apparent_temperature),
        humidity: Math.round(current.relative_humidity_2m),
        windKph: Math.round(current.wind_speed_10m),
        condition: mapWmoCodeToCondition(
          current.weather_code,
          current.wind_speed_10m,
          current.relative_humidity_2m
        ),
        isLive: true,
        updatedAt: new Date().toISOString(),
      };

      res.json({ weather });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to look up weather.";
      res.status(500).json({ error: msg });
    }
  });

  app.post("/api/wardrobe/analyze", async (req, res) => {
    try {
      const { imageBase64, mimeType } = req.body as {
        imageBase64?: string;
        mimeType?: string;
      };

      if (!imageBase64) {
        return res.status(400).json({ error: "An image is required for garment analysis." });
      }

      const ai = getGeminiClient();
      const parsed = stripDataUrlPrefix(imageBase64, mimeType || "image/jpeg");

      const response = await withRetry(() =>
        ai.models.generateContent({
          model: "gemini-4-hydrogen",
          contents: {
            parts: [
              {
                inlineData: {
                  mimeType: parsed.mimeType,
                  data: parsed.data,
                },
              },
              {
                text: `Analyze this clothing or fashion item photograph as an experienced luxury fashion archivist and stylist.
Identify the exact garment clearly and concisely.
Categories allowed: "Top", "Bottom", "Outerwear", "Dress", "Footwear", "Accessory".
Seasonality allowed: "All-Season", "Warm", "Cool", "Cold".
Formality allowed: "Casual", "Smart Casual", "Business", "Formal", "Active".
Provide a clean, natural garment title (e.g., "Relaxed Charcoal Wool Blazer", "Washed Indigo Wide-Leg Jeans", "Ivory Silk Button-Down").
Also identify the primary color name and accurate 6-digit hex code, likely fabric/material, 2 to 3 style tags, and one crisp styling note about silhouette or pairing.`,
              },
            ],
          },
          config: {
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                category: {
                  type: Type.STRING,
                  enum: ["Top", "Bottom", "Outerwear", "Dress", "Footwear", "Accessory"],
                },
                colorName: { type: Type.STRING },
                colorHex: { type: Type.STRING },
                fabric: { type: Type.STRING },
                seasonality: {
                  type: Type.STRING,
                  enum: ["All-Season", "Warm", "Cool", "Cold"],
                },
                formality: {
                  type: Type.STRING,
                  enum: ["Casual", "Smart Casual", "Business", "Formal", "Active"],
                },
                styleTags: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                stylingNotes: { type: Type.STRING },
              },
              required: [
                "name",
                "category",
                "colorName",
                "colorHex",
                "fabric",
                "seasonality",
                "formality",
                "styleTags",
                "stylingNotes",
              ],
            },
          },
        })
      );

      const text = (response.text ?? "{}").trim();
      const analyzed = JSON.parse(text);
      res.json({ analysis: analyzed });
    } catch (err) {
      const formatted = formatGeminiError(err);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  app.post("/api/outfits/generate", async (req, res) => {
    try {
      const {
        wardrobe,
        style,
        occasion,
        weather,
        anchorItemIds = [],
        userProfile,
        customNotes = "",
      } = req.body as {
        wardrobe: WardrobeItem[];
        style: StylePreference;
        occasion: OccasionType;
        weather: WeatherContext;
        anchorItemIds?: string[];
        userProfile?: UserProfile;
        customNotes?: string;
      };

      if (!Array.isArray(wardrobe) || wardrobe.length < 2) {
        return res.status(400).json({
          error: "Please have at least 2 garments in your wardrobe before generating outfits.",
        });
      }

      const ai = getGeminiClient();

      const parts: Array<
        { text: string } | { inlineData: { mimeType: string; data: string } }
      > = [];

      // Attach visual thumbnails for up to 14 garments so Gemini sees real colors, cuts, and textures
      const visualItems = wardrobe.slice(0, 14);
      for (const item of visualItems) {
        const inline = resolveImageToInlinePart(item.imageUrl);
        if (inline) {
          parts.push({
            text: `Garment Photo -> ID: "${item.id}" | Name: "${item.name}" | Category: ${item.category} | Color: ${item.colorName} (${item.colorHex}) | Fabric: ${item.fabric}`,
          });
          parts.push({ inlineData: inline });
        }
      }

      const inventoryCatalog = wardrobe.map((item) => ({
        id: item.id,
        name: item.name,
        category: item.category,
        colorName: item.colorName,
        colorHex: item.colorHex,
        fabric: item.fabric,
        seasonality: item.seasonality,
        formality: item.formality,
        styleTags: item.styleTags,
        stylingNotes: item.stylingNotes,
      }));

      const anchorNames = wardrobe
        .filter((w) => anchorItemIds.includes(w.id))
        .map((w) => `${w.name} (${w.id})`);

      const promptText = `You are STYLEMATE AI, an editorial personal fashion stylist with deep expertise in color theory, silhouette balance, fabric drape, and climate-smart layering.

CLIENT BRIEF:
- Target Style Aesthetic: ${style}
- Occasion: ${occasion}
- Location & Weather: ${weather.city}${weather.country ? `, ${weather.country}` : ""} — ${weather.temperatureC}°C (feels like ${weather.feelsLikeC}°C), Condition: ${weather.condition}, Humidity: ${weather.humidity}%, Wind: ${weather.windKph} km/h
- Fit Preference: ${userProfile?.fitPreference || "Balanced"}
- Layering Preference: ${userProfile?.layeringPreference || "Balanced"}
- Color Mood Preference: ${userProfile?.colorMood || "Open to balanced pairings"}
- Client Style Notes: ${[userProfile?.styleNotes, customNotes].filter(Boolean).join(" | ") || "None"}
- Must-Include Anchor Piece(s): ${anchorNames.length > 0 ? anchorNames.join(", ") : "None specified — curate freely across the wardrobe"}

AVAILABLE WARDROBE INVENTORY (JSON):
${JSON.stringify(inventoryCatalog, null, 2)}

INSTRUCTIONS:
1. Create exactly 3 distinct, wearable, stylish outfit combinations built strictly from the IDs in the AVAILABLE WARDROBE INVENTORY above.
2. Every outfit MUST include any Must-Include Anchor Piece(s) if specified.
3. Each outfit should feel noticeably different in silhouette, layering, or mood (e.g., one sharp/structured, one relaxed/effortless, one tonal/elevated).
4. NEVER invent itemIds that do not exist in the inventory. Only select valid IDs from the provided wardrobe.
5. Make sure each outfit makes practical sense (e.g., pair a Top + Bottom or Dress, add Outerwear when weather is cool/windy/rainy or when tailored layering elevates the occasion, include Footwear/Accessories if present in the wardrobe).
6. If the wardrobe is missing a natural finishing piece (e.g. no rain shell for Rainy weather, or no sneakers/boots), note one tasteful optional addition in "missingPieceSuggestion"; otherwise keep it empty string "".
7. Write refined, authoritative editorial prose—never robotic or generic.`;

      parts.push({ text: promptText });

      const response = await withRetry(() =>
        ai.models.generateContent({
          model: "gemini-4-hydrogen",
          contents: { parts },
          config: {
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                outfits: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      title: { type: Type.STRING },
                      subtitle: { type: Type.STRING },
                      itemIds: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                      },
                      stylistRationale: { type: Type.STRING },
                      weatherAdaptation: { type: Type.STRING },
                      colorPalette: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            name: { type: Type.STRING },
                            hex: { type: Type.STRING },
                          },
                          required: ["name", "hex"],
                        },
                      },
                      stylingTips: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                      },
                      missingPieceSuggestion: { type: Type.STRING },
                    },
                    required: [
                      "title",
                      "subtitle",
                      "itemIds",
                      "stylistRationale",
                      "weatherAdaptation",
                      "colorPalette",
                      "stylingTips",
                    ],
                  },
                },
              },
              required: ["outfits"],
            },
          },
        })
      );

      const validIds = new Set(wardrobe.map((w) => w.id));
      const parsed = JSON.parse((response.text ?? '{"outfits":[]}').trim()) as {
        outfits: Array<{
          title: string;
          subtitle: string;
          itemIds: string[];
          stylistRationale: string;
          weatherAdaptation: string;
          colorPalette: Array<{ name: string; hex: string }>;
          stylingTips: string[];
          missingPieceSuggestion?: string;
        }>;
      };

      const now = new Date().toISOString();
      const outfits: GeneratedOutfit[] = (parsed.outfits || [])
        .map((o, idx) => {
          const filteredIds = Array.from(new Set(o.itemIds.filter((id) => validIds.has(id))));
          return {
            id: `outfit_${Date.now()}_${idx}`,
            title: o.title,
            subtitle: o.subtitle,
            itemIds: filteredIds,
            stylistRationale: o.stylistRationale,
            weatherAdaptation: o.weatherAdaptation,
            colorPalette: (o.colorPalette || []).slice(0, 4),
            stylingTips: (o.stylingTips || []).slice(0, 4),
            missingPieceSuggestion: o.missingPieceSuggestion?.trim() || undefined,
            occasion,
            style,
            weatherSnapshot: weather,
            createdAt: now,
          };
        })
        .filter((o) => o.itemIds.length > 0);

      if (outfits.length === 0) {
        return res.status(502).json({
          error: "The stylist could not assemble valid outfits from your current wardrobe items. Try adding one more top or bottom.",
        });
      }

      res.json({ outfits });
    } catch (err) {
      const formatted = formatGeminiError(err);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  app.post("/api/outfits/refine", async (req, res) => {
    try {
      const { outfit, wardrobe, refinementRequest, weather } = req.body as {
        outfit: GeneratedOutfit;
        wardrobe: WardrobeItem[];
        refinementRequest: string;
        weather: WeatherContext;
      };

      if (!outfit || !refinementRequest?.trim()) {
        return res.status(400).json({ error: "Outfit and refinement instructions are required." });
      }

      const ai = getGeminiClient();
      const inventoryCatalog = wardrobe.map((item) => ({
        id: item.id,
        name: item.name,
        category: item.category,
        colorName: item.colorName,
        colorHex: item.colorHex,
        fabric: item.fabric,
        seasonality: item.seasonality,
        formality: item.formality,
      }));

      const response = await withRetry(() =>
        ai.models.generateContent({
          model: "gemini-4-hydrogen",
          contents: `You are STYLEMATE AI, refining an existing curated outfit for a client.

CURRENT OUTFIT:
${JSON.stringify(
  {
    title: outfit.title,
    subtitle: outfit.subtitle,
    itemIds: outfit.itemIds,
    stylistRationale: outfit.stylistRationale,
    occasion: outfit.occasion,
    style: outfit.style,
  },
  null,
  2
)}

WEATHER CONTEXT:
${weather.city} — ${weather.temperatureC}°C, ${weather.condition}

CLIENT REFINEMENT REQUEST:
"${refinementRequest.trim()}"

AVAILABLE WARDROBE INVENTORY:
${JSON.stringify(inventoryCatalog, null, 2)}

Update the outfit using ONLY valid itemIds from the inventory to satisfy the client's refinement request. Explain the updated pairing and styling adjustments concisely.`,
          config: {
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                subtitle: { type: Type.STRING },
                itemIds: { type: Type.ARRAY, items: { type: Type.STRING } },
                stylistRationale: { type: Type.STRING },
                weatherAdaptation: { type: Type.STRING },
                colorPalette: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING },
                      hex: { type: Type.STRING },
                    },
                    required: ["name", "hex"],
                  },
                },
                stylingTips: { type: Type.ARRAY, items: { type: Type.STRING } },
                missingPieceSuggestion: { type: Type.STRING },
              },
              required: [
                "title",
                "subtitle",
                "itemIds",
                "stylistRationale",
                "weatherAdaptation",
                "colorPalette",
                "stylingTips",
              ],
            },
          },
        })
      );

      const validIds = new Set(wardrobe.map((w) => w.id));
      const parsed = JSON.parse((response.text ?? "{}").trim()) as {
        title: string;
        subtitle: string;
        itemIds: string[];
        stylistRationale: string;
        weatherAdaptation: string;
        colorPalette: Array<{ name: string; hex: string }>;
        stylingTips: string[];
        missingPieceSuggestion?: string;
      };

      const filteredIds = Array.from(new Set((parsed.itemIds || []).filter((id) => validIds.has(id))));
      const refined: GeneratedOutfit = {
        ...outfit,
        title: parsed.title || outfit.title,
        subtitle: parsed.subtitle || outfit.subtitle,
        itemIds: filteredIds.length > 0 ? filteredIds : outfit.itemIds,
        stylistRationale: parsed.stylistRationale || outfit.stylistRationale,
        weatherAdaptation: parsed.weatherAdaptation || outfit.weatherAdaptation,
        colorPalette: (parsed.colorPalette || outfit.colorPalette).slice(0, 4),
        stylingTips: (parsed.stylingTips || outfit.stylingTips).slice(0, 4),
        missingPieceSuggestion: parsed.missingPieceSuggestion?.trim() || undefined,
      };

      res.json({ outfit: refined });
    } catch (err) {
      const formatted = formatGeminiError(err);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("/{*path}", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`STYLEMATE AI server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
