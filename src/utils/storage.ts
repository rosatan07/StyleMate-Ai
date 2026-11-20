import {
  DEFAULT_USER_PROFILE,
  DEFAULT_WEATHER,
  STARTER_WARDROBE,
} from "../data/starterData";
import type {
  GeneratedOutfit,
  SavedLookbookEntry,
  UserProfile,
  WardrobeItem,
  WeatherContext,
} from "../types";

const KEYS = {
  WARDROBE: "stylemate_wardrobe_v1",
  LOOKBOOK: "stylemate_lookbook_v1",
  PROFILE: "stylemate_profile_v1",
  WEATHER: "stylemate_weather_v1",
  LAST_OUTFITS: "stylemate_last_outfits_v1",
};

function safeGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function safeSet<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Handle storage quota gracefully without crashing UI
  }
}

export function loadWardrobe(): WardrobeItem[] {
  const stored = safeGet<WardrobeItem[] | null>(KEYS.WARDROBE, null);
  if (stored === null) {
    return STARTER_WARDROBE;
  }
  return stored;
}

export function saveWardrobe(items: WardrobeItem[]): void {
  safeSet(KEYS.WARDROBE, items);
}

export function loadLookbook(): SavedLookbookEntry[] {
  return safeGet<SavedLookbookEntry[]>(KEYS.LOOKBOOK, []);
}

export function saveLookbook(entries: SavedLookbookEntry[]): void {
  safeSet(KEYS.LOOKBOOK, entries);
}

export function loadUserProfile(): UserProfile {
  return { ...DEFAULT_USER_PROFILE, ...safeGet<Partial<UserProfile>>(KEYS.PROFILE, {}) };
}

export function saveUserProfile(profile: UserProfile): void {
  safeSet(KEYS.PROFILE, profile);
}

export function loadWeather(): WeatherContext {
  return { ...DEFAULT_WEATHER, ...safeGet<Partial<WeatherContext>>(KEYS.WEATHER, {}) };
}

export function saveWeather(weather: WeatherContext): void {
  safeSet(KEYS.WEATHER, weather);
}

export function loadLastOutfits(): GeneratedOutfit[] {
  return safeGet<GeneratedOutfit[]>(KEYS.LAST_OUTFITS, []);
}

export function saveLastOutfits(outfits: GeneratedOutfit[]): void {
  safeSet(KEYS.LAST_OUTFITS, outfits);
}
