import { useState } from "react";
import {
  ArrowLeftRight,
  Bookmark,
  BookmarkCheck,
  Check,
  Cloud,
  CloudRain,
  CloudSnow,
  Compass,
  Loader2,
  MapPin,
  Pin,
  Plus,
  RefreshCw,
  SlidersHorizontal,
  Sun,
  Wind,
} from "lucide-react";
import {
  OCCASION_OPTIONS,
  STYLE_OPTIONS,
  WEATHER_CONDITION_OPTIONS,
} from "../data/starterData";
import type {
  GeneratedOutfit,
  OccasionType,
  StylePreference,
  UserProfile,
  WardrobeItem,
  WeatherCondition,
  WeatherContext,
} from "../types";
import {
  celsiusToDisplay,
  displayToCelsius,
  formatTemp,
} from "../utils/imageUtils";
import { GarmentImage } from "./GarmentImage";

interface StudioViewProps {
  wardrobe: WardrobeItem[];
  userProfile: UserProfile;
  weather: WeatherContext;
  onUpdateWeather: (wx: WeatherContext) => void;
  selectedStyle: StylePreference;
  onSelectStyle: (style: StylePreference) => void;
  selectedOccasion: OccasionType;
  onSelectOccasion: (occasion: OccasionType) => void;
  anchorItemIds: string[];
  onToggleAnchor: (id: string) => void;
  onClearAnchors: () => void;
  outfits: GeneratedOutfit[];
  onSetOutfits: (outfits: GeneratedOutfit[]) => void;
  savedOutfitIds: Set<string>;
  onSaveToLookbook: (outfit: GeneratedOutfit) => void;
  onOpenUpload: () => void;
  onGoToWardrobe: () => void;
}

function WeatherIcon({ condition }: { condition: WeatherCondition }) {
  switch (condition) {
    case "Sunny":
      return <Sun className="w-4 h-4 text-[#B45309]" aria-hidden="true" />;
    case "Rainy":
      return <CloudRain className="w-4 h-4 text-[#1D4ED8]" aria-hidden="true" />;
    case "Snowy":
      return <CloudSnow className="w-4 h-4 text-[#0284C7]" aria-hidden="true" />;
    case "Windy":
      return <Wind className="w-4 h-4 text-[#52525B]" aria-hidden="true" />;
    default:
      return <Cloud className="w-4 h-4 text-[#52525B]" aria-hidden="true" />;
  }
}

export function StudioView({
  wardrobe,
  userProfile,
  weather,
  onUpdateWeather,
  selectedStyle,
  onSelectStyle,
  selectedOccasion,
  onSelectOccasion,
  anchorItemIds,
  onToggleAnchor,
  onClearAnchors,
  outfits,
  onSetOutfits,
  savedOutfitIds,
  onSaveToLookbook,
  onOpenUpload,
  onGoToWardrobe,
}: StudioViewProps) {
  const [cityInput, setCityInput] = useState(weather.city);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [showWeatherOverride, setShowWeatherOverride] = useState(false);

  const [customNotes, setCustomNotes] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const [refiningOutfitId, setRefiningOutfitId] = useState<string | null>(null);
  const [refineInputs, setRefineInputs] = useState<Record<string, string>>({});
  const [refineErrors, setRefineErrors] = useState<Record<string, string>>({});

  const [swapTarget, setSwapTarget] = useState<{
    outfitId: string;
    itemId: string;
  } | null>(null);

  const wardrobeById = new Map(wardrobe.map((item) => [item.id, item]));

  const handleCityLookup = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = cityInput.trim();
    if (!trimmed) return;
    setWeatherLoading(true);
    setWeatherError(null);
    try {
      const res = await fetch(`/api/weather?city=${encodeURIComponent(trimmed)}`);
      const data = (await res.json()) as { weather?: WeatherContext; error?: string };
      if (!res.ok || !data.weather) {
        throw new Error(data.error || "Could not look up weather for that city.");
      }
      onUpdateWeather(data.weather);
      setCityInput(data.weather.city);
    } catch (err) {
      setWeatherError(err instanceof Error ? err.message : "Weather lookup failed.");
    } finally {
      setWeatherLoading(false);
    }
  };

  const handleUseGeolocation = () => {
    if (!navigator.geolocation) {
      setWeatherError("Browser location is unavailable. Enter a city name instead.");
      return;
    }
    setWeatherLoading(true);
    setWeatherError(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(`/api/weather?lat=${latitude}&lon=${longitude}`);
          const data = (await res.json()) as {
            weather?: WeatherContext;
            error?: string;
          };
          if (!res.ok || !data.weather) {
            throw new Error(data.error || "Could not fetch weather for your coordinates.");
          }
          onUpdateWeather(data.weather);
          setCityInput(data.weather.city);
        } catch (err) {
          setWeatherError(err instanceof Error ? err.message : "Location weather failed.");
        } finally {
          setWeatherLoading(false);
        }
      },
      () => {
        setWeatherLoading(false);
        setWeatherError("Location permission denied. Enter a city name or adjust weather manually.");
      },
      { timeout: 8000 }
    );
  };

  const handleGenerate = async () => {
    if (wardrobe.length < 2) {
      setGenerateError("Add at least 2 garments to your wardrobe to generate outfit pairings.");
      return;
    }
    setGenerating(true);
    setGenerateError(null);
    try {
      const res = await fetch("/api/outfits/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wardrobe,
          style: selectedStyle,
          occasion: selectedOccasion,
          weather,
          anchorItemIds,
          userProfile,
          customNotes,
        }),
      });
      const data = (await res.json()) as {
        outfits?: GeneratedOutfit[];
        error?: string;
      };
      if (!res.ok || !data.outfits) {
        throw new Error(data.error || "Unable to generate outfit ideas.");
      }
      onSetOutfits(data.outfits);
      setSwapTarget(null);
    } catch (err) {
      setGenerateError(
        err instanceof Error ? err.message : "Failed to generate outfit combinations."
      );
    } finally {
      setGenerating(false);
    }
  };

  const handleRefineOutfit = async (outfit: GeneratedOutfit) => {
    const requestText = (refineInputs[outfit.id] || "").trim();
    if (!requestText) return;
    setRefiningOutfitId(outfit.id);
    setRefineErrors((prev) => ({ ...prev, [outfit.id]: "" }));
    try {
      const res = await fetch("/api/outfits/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outfit,
          wardrobe,
          refinementRequest: requestText,
          weather,
        }),
      });
      const data = (await res.json()) as {
        outfit?: GeneratedOutfit;
        error?: string;
      };
      if (!res.ok || !data.outfit) {
        throw new Error(data.error || "Could not refine this outfit.");
      }
      onSetOutfits(
        outfits.map((o) => (o.id === outfit.id ? data.outfit! : o))
      );
      setRefineInputs((prev) => ({ ...prev, [outfit.id]: "" }));
    } catch (err) {
      setRefineErrors((prev) => ({
        ...prev,
        [outfit.id]: err instanceof Error ? err.message : "Refinement failed.",
      }));
    } finally {
      setRefiningOutfitId(null);
    }
  };

  const handleSwapPiece = (outfitId: string, oldItemId: string, newItemId: string) => {
    onSetOutfits(
      outfits.map((o) => {
        if (o.id !== outfitId) return o;
        const nextIds = o.itemIds.map((id) => (id === oldItemId ? newItemId : id));
        return {
          ...o,
          itemIds: Array.from(new Set(nextIds)),
        };
      })
    );
    setSwapTarget(null);
  };

  const displayTemp = celsiusToDisplay(weather.temperatureC, userProfile.tempUnit);
  const minTemp = userProfile.tempUnit === "F" ? 10 : -12;
  const maxTemp = userProfile.tempUnit === "F" ? 105 : 40;

  return (
    <div className="max-w-[1360px] mx-auto px-4 sm:px-8 py-8 sm:py-10">
      {/* Compact Editorial Introduction */}
      <div className="mb-8 pb-6 border-b border-[#E4E4E7] flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div className="max-w-2xl">
          <p className="text-xs font-medium tracking-wide text-[#52525B] mb-2">
            Personal Styling Atelier
          </p>
          <h1 className="font-editorial text-3xl sm:text-5xl font-semibold tracking-tight text-[#111113] text-balance leading-[1.08]">
            Curated outfits composed from your own wardrobe
          </h1>
        </div>
        <div className="flex items-center gap-4 text-xs text-[#52525B] shrink-0">
          <span className="tabular-nums">{wardrobe.length} garments cataloged</span>
          <span aria-hidden="true">·</span>
          <button
            type="button"
            onClick={onGoToWardrobe}
            className="text-[#111113] font-medium underline underline-offset-4 hover:text-[#1D4ED8] transition-colors cursor-pointer"
          >
            Manage wardrobe
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[380px_minmax(0,1fr)] gap-8 items-start">
        {/* Left Configuration Rail */}
        <aside className="bg-white border border-[#E4E4E7] rounded-xl p-6 space-y-6">
          {/* 1. Preferred Fashion Style */}
          <section aria-labelledby="style-heading">
            <div className="flex items-center justify-between mb-2.5">
              <h2
                id="style-heading"
                className="font-sans text-xs font-semibold tracking-wide text-[#111113]"
              >
                01. Fashion Style
              </h2>
              <span className="text-xs text-[#71717A]">{selectedStyle}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {STYLE_OPTIONS.map((style) => {
                const active = selectedStyle === style;
                return (
                  <button
                    key={style}
                    type="button"
                    onClick={() => onSelectStyle(style)}
                    className={`px-3 py-2 text-xs font-medium rounded-lg border text-left transition-colors duration-150 truncate cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D4ED8] ${
                      active
                        ? "bg-[#111113] text-white border-[#111113]"
                        : "bg-[#FAFAFA] text-[#3F3F46] border-[#E4E4E7] hover:border-[#A1A1AA] hover:text-[#111113]"
                    }`}
                  >
                    {style}
                  </button>
                );
              })}
            </div>
          </section>

          <hr className="border-[#E4E4E7]" />

          {/* 2. Occasion */}
          <section aria-labelledby="occasion-heading">
            <div className="flex items-center justify-between mb-2.5">
              <h2
                id="occasion-heading"
                className="font-sans text-xs font-semibold tracking-wide text-[#111113]"
              >
                02. Occasion
              </h2>
              <span className="text-xs text-[#71717A]">{selectedOccasion}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {OCCASION_OPTIONS.map((occasion) => {
                const active = selectedOccasion === occasion;
                return (
                  <button
                    key={occasion}
                    type="button"
                    onClick={() => onSelectOccasion(occasion)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D4ED8] ${
                      active
                        ? "bg-[#111113] text-white border-[#111113]"
                        : "bg-[#FAFAFA] text-[#3F3F46] border-[#E4E4E7] hover:border-[#A1A1AA] hover:text-[#111113]"
                    }`}
                  >
                    {occasion}
                  </button>
                );
              })}
            </div>
          </section>

          <hr className="border-[#E4E4E7]" />

          {/* 3. Location & Weather */}
          <section aria-labelledby="weather-heading" className="space-y-3">
            <div className="flex items-center justify-between">
              <h2
                id="weather-heading"
                className="font-sans text-xs font-semibold tracking-wide text-[#111113]"
              >
                03. Location & Weather
              </h2>
              <button
                type="button"
                onClick={() => setShowWeatherOverride((v) => !v)}
                className="inline-flex items-center gap-1 text-xs font-medium text-[#52525B] hover:text-[#111113] cursor-pointer"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{showWeatherOverride ? "Hide adjust" : "Adjust"}</span>
              </button>
            </div>

            <form onSubmit={handleCityLookup} className="flex items-center gap-2">
              <div className="relative flex-1 min-w-0">
                <MapPin
                  className="w-3.5 h-3.5 text-[#71717A] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  type="text"
                  value={cityInput}
                  onChange={(e) => setCityInput(e.target.value)}
                  placeholder="Enter city (e.g. Tokyo)"
                  aria-label="City name"
                  className="w-full pl-8 pr-3 py-2 text-xs bg-[#FAFAFA] border border-[#D4D4D8] rounded-lg focus:outline-none focus:border-[#111113]"
                />
              </div>
              <button
                type="submit"
                disabled={weatherLoading}
                className="px-3 py-2 text-xs font-medium text-[#111113] bg-white border border-[#D4D4D8] rounded-lg hover:bg-[#F4F4F5] disabled:opacity-50 transition-colors shrink-0 cursor-pointer"
              >
                {weatherLoading ? "..." : "Set"}
              </button>
              <button
                type="button"
                onClick={handleUseGeolocation}
                disabled={weatherLoading}
                title="Use current GPS location"
                aria-label="Use current GPS location"
                className="p-2 text-[#52525B] bg-white border border-[#D4D4D8] rounded-lg hover:bg-[#F4F4F5] hover:text-[#111113] disabled:opacity-50 transition-colors shrink-0 cursor-pointer"
              >
                <Compass className="w-4 h-4" />
              </button>
            </form>

            {weatherError && (
              <p className="text-xs text-[#B91C1C]" role="alert">
                {weatherError}
              </p>
            )}

            <div className="p-3.5 rounded-lg bg-[#FAFAFA] border border-[#E4E4E7] flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-sm font-semibold text-[#111113] truncate">
                  <WeatherIcon condition={weather.condition} />
                  <span className="truncate">
                    {weather.city}
                    {weather.country ? `, ${weather.country}` : ""}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-[#52525B] mt-1">
                  <span>{weather.condition}</span>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums">{weather.humidity}% humidity</span>
                  <span aria-hidden="true">·</span>
                  <span>{weather.isLive ? "Live" : "Custom"}</span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className="font-mono text-xl font-medium tabular-nums text-[#111113]">
                  {formatTemp(weather.temperatureC, userProfile.tempUnit)}
                </span>
              </div>
            </div>

            {showWeatherOverride && (
              <div className="p-3.5 rounded-lg border border-[#E4E4E7] bg-white space-y-3">
                <div>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-[#52525B]">Temperature</span>
                    <span className="font-mono tabular-nums font-medium text-[#111113]">
                      {displayTemp}°{userProfile.tempUnit}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={minTemp}
                    max={maxTemp}
                    value={displayTemp}
                    onChange={(e) => {
                      const nextC = displayToCelsius(
                        Number(e.target.value),
                        userProfile.tempUnit
                      );
                      onUpdateWeather({
                        ...weather,
                        temperatureC: nextC,
                        feelsLikeC: nextC,
                        isLive: false,
                      });
                    }}
                    className="w-full accent-[#111113] cursor-pointer"
                  />
                </div>

                <div>
                  <span className="block text-xs text-[#52525B] mb-1.5">
                    Condition
                  </span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {WEATHER_CONDITION_OPTIONS.map((cond) => (
                      <button
                        key={cond}
                        type="button"
                        onClick={() =>
                          onUpdateWeather({
                            ...weather,
                            condition: cond,
                            isLive: false,
                          })
                        }
                        className={`px-2 py-1.5 text-[11px] font-medium rounded-md border truncate cursor-pointer ${
                          weather.condition === cond
                            ? "bg-[#111113] text-white border-[#111113]"
                            : "bg-[#FAFAFA] text-[#52525B] border-[#E4E4E7] hover:text-[#111113]"
                        }`}
                      >
                        {cond}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </section>

          <hr className="border-[#E4E4E7]" />

          {/* 4. Anchor Garments (Optional Must-Include) */}
          <section aria-labelledby="anchor-heading" className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h2
                id="anchor-heading"
                className="font-sans text-xs font-semibold tracking-wide text-[#111113]"
              >
                04. Pin Anchor Pieces (Optional)
              </h2>
              {anchorItemIds.length > 0 && (
                <button
                  type="button"
                  onClick={onClearAnchors}
                  className="text-xs text-[#52525B] hover:text-[#111113] underline underline-offset-2 cursor-pointer"
                >
                  Clear ({anchorItemIds.length})
                </button>
              )}
            </div>

            {wardrobe.length === 0 ? (
              <p className="text-xs text-[#71717A]">
                Upload garments to pin anchor pieces.
              </p>
            ) : (
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {wardrobe.map((item) => {
                  const pinned = anchorItemIds.includes(item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onToggleAnchor(item.id)}
                      title={`${pinned ? "Unpin" : "Pin"} ${item.name}`}
                      className={`group relative w-14 shrink-0 rounded-lg overflow-hidden border transition-all cursor-pointer ${
                        pinned
                          ? "border-[#1D4ED8] ring-2 ring-[#1D4ED8]/25"
                          : "border-[#E4E4E7] hover:border-[#A1A1AA]"
                      }`}
                    >
                      <GarmentImage
                        src={item.imageUrl}
                        alt={item.name}
                        colorHex={item.colorHex}
                        className="w-14 h-[72px]"
                      />
                      {pinned && (
                        <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[#1D4ED8] text-white flex items-center justify-center">
                          <Pin className="w-2.5 h-2.5" aria-hidden="true" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {/* 5. Custom Notes */}
          <label className="block">
            <span className="font-sans text-xs font-semibold tracking-wide text-[#111113]">
              05. Stylist Direction (Optional)
            </span>
            <input
              type="text"
              value={customNotes}
              onChange={(e) => setCustomNotes(e.target.value)}
              placeholder="e.g., Walking a lot, prefer tonal layering"
              className="mt-2 w-full px-3 py-2 text-xs bg-[#FAFAFA] border border-[#D4D4D8] rounded-lg focus:outline-none focus:border-[#111113]"
            />
          </label>

          {generateError && (
            <div
              className="p-3 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-xs text-[#991B1B]"
              role="alert"
            >
              {generateError}
            </div>
          )}

          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating || wardrobe.length < 2}
            className="w-full py-3 px-4 rounded-lg bg-[#111113] text-white text-sm font-medium hover:bg-[#27272A] disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D4ED8]"
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                <span>Curating your outfits...</span>
              </>
            ) : (
              <span>Generate Outfit Ideas</span>
            )}
          </button>
        </aside>

        {/* Right Editorial Output Canvas */}
        <main className="space-y-8 min-w-0">
          {wardrobe.length < 2 ? (
            <div className="bg-white border border-[#E4E4E7] rounded-xl p-10 text-center">
              <h2 className="font-editorial text-3xl font-semibold text-[#111113]">
                Your wardrobe needs at least two garments
              </h2>
              <p className="text-sm text-[#52525B] max-w-md mx-auto mt-2 mb-6">
                Upload photos of your tops, trousers, outerwear, or footwear so STYLEMATE AI can compose tailored outfits for your day.
              </p>
              <button
                type="button"
                onClick={onOpenUpload}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-[#111113] rounded-lg hover:bg-[#27272A] cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Upload Clothing Photos</span>
              </button>
            </div>
          ) : generating ? (
            <div className="space-y-6" aria-busy="true" aria-label="Generating outfits">
              {[0, 1].map((idx) => (
                <div
                  key={idx}
                  className="bg-white border border-[#E4E4E7] rounded-xl p-6 sm:p-8 animate-pulse space-y-6"
                >
                  <div className="space-y-2">
                    <div className="h-3 w-32 bg-[#E4E4E7] rounded" />
                    <div className="h-8 w-72 bg-[#E4E4E7] rounded" />
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[0, 1, 2, 3].map((slot) => (
                      <div
                        key={slot}
                        className="aspect-[3/4] bg-[#F4F4F5] rounded-lg"
                      />
                    ))}
                  </div>
                  <div className="h-16 w-full bg-[#F4F4F5] rounded-lg" />
                </div>
              ))}
            </div>
          ) : outfits.length === 0 ? (
            <div className="bg-white border border-[#E4E4E7] rounded-xl p-6 sm:p-8 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E4E4E7]">
                <div>
                  <p className="text-xs font-medium text-[#52525B]">
                    Ready to Style
                  </p>
                  <h2 className="font-editorial text-2xl sm:text-3xl font-semibold text-[#111113] mt-1">
                    Preview your active wardrobe capsule
                  </h2>
                  <p className="text-sm text-[#52525B] mt-1.5 max-w-xl">
                    Select your preferred style, occasion, and weather on the left, or upload additional pieces from your closet, then generate three personalized outfit combinations.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onOpenUpload}
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-medium text-[#111113] bg-[#FAFAFA] border border-[#D4D4D8] rounded-lg hover:bg-[#F4F4F5] shrink-0 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Upload Your Clothes</span>
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {wardrobe.slice(0, 8).map((item) => (
                  <div key={item.id} className="group">
                    <div className="aspect-[3/4] rounded-lg overflow-hidden border border-[#E4E4E7] bg-[#F4F4F5]">
                      <GarmentImage
                        src={item.imageUrl}
                        alt={item.name}
                        colorHex={item.colorHex}
                        label={item.name}
                        className="w-full h-full"
                      />
                    </div>
                    <p className="mt-2 text-xs font-medium text-[#111113] truncate">
                      {item.name}
                    </p>
                    <p className="text-[11px] text-[#71717A] truncate">
                      {item.category} · {item.colorName}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs text-[#52525B] flex items-center gap-2">
                  <span className="font-semibold text-[#111113]">
                    {outfits.length} Curated Looks
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{selectedStyle}</span>
                  <span aria-hidden="true">·</span>
                  <span>{selectedOccasion}</span>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums">
                    {formatTemp(weather.temperatureC, userProfile.tempUnit)} {weather.condition}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleGenerate}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-[#111113] hover:text-[#1D4ED8] transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Regenerate looks</span>
                </button>
              </div>

              {outfits.map((outfit, index) => {
                const outfitItems = outfit.itemIds
                  .map((id) => wardrobeById.get(id))
                  .filter((x): x is WardrobeItem => Boolean(x));
                const isSaved = savedOutfitIds.has(outfit.id);
                const isRefining = refiningOutfitId === outfit.id;

                return (
                  <article
                    key={outfit.id}
                    className="bg-white border border-[#E4E4E7] rounded-xl p-6 sm:p-8 space-y-6"
                  >
                    {/* Outfit Header */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-5 border-b border-[#E4E4E7]">
                      <div>
                        <div className="flex items-center gap-2 text-xs text-[#52525B]">
                          <span className="font-mono tabular-nums">
                            0{index + 1}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{outfit.style}</span>
                          <span aria-hidden="true">·</span>
                          <span>{outfit.occasion}</span>
                          <span aria-hidden="true">·</span>
                          <span className="tabular-nums">
                            {formatTemp(
                              outfit.weatherSnapshot.temperatureC,
                              userProfile.tempUnit
                            )}{" "}
                            {outfit.weatherSnapshot.city}
                          </span>
                        </div>
                        <h2 className="font-editorial text-2xl sm:text-3xl font-semibold text-[#111113] mt-1.5">
                          {outfit.title}
                        </h2>
                        <p className="text-sm text-[#52525B] mt-1">
                          {outfit.subtitle}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => onSaveToLookbook(outfit)}
                        disabled={isSaved}
                        className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg border transition-colors shrink-0 cursor-pointer ${
                          isSaved
                            ? "bg-[#F4F4F5] text-[#111113] border-[#D4D4D8] cursor-default"
                            : "bg-white text-[#111113] border-[#D4D4D8] hover:bg-[#111113] hover:text-white hover:border-[#111113]"
                        }`}
                      >
                        {isSaved ? (
                          <>
                            <BookmarkCheck className="w-4 h-4 text-[#15803D]" aria-hidden="true" />
                            <span>Saved to Lookbook</span>
                          </>
                        ) : (
                          <>
                            <Bookmark className="w-4 h-4" aria-hidden="true" />
                            <span>Save to Lookbook</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Garment Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {outfitItems.map((item) => {
                        const isSwappingThis =
                          swapTarget?.outfitId === outfit.id &&
                          swapTarget?.itemId === item.id;
                        const alternatives = wardrobe.filter(
                          (w) =>
                            w.id !== item.id &&
                            (w.category === item.category || wardrobe.length <= 8)
                        );

                        return (
                          <div key={item.id} className="space-y-2">
                            <div className="relative aspect-[3/4] rounded-lg overflow-hidden border border-[#E4E4E7] bg-[#F4F4F5]">
                              <GarmentImage
                                src={item.imageUrl}
                                alt={item.name}
                                colorHex={item.colorHex}
                                label={item.name}
                                className="w-full h-full"
                              />
                              {alternatives.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setSwapTarget(
                                      isSwappingThis
                                        ? null
                                        : { outfitId: outfit.id, itemId: item.id }
                                    )
                                  }
                                  className="absolute bottom-2 right-2 inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium bg-white/95 text-[#111113] border border-[#E4E4E7] rounded-md shadow-xs hover:bg-[#111113] hover:text-white transition-colors cursor-pointer"
                                >
                                  <ArrowLeftRight className="w-3 h-3" aria-hidden="true" />
                                  <span>Swap</span>
                                </button>
                              )}
                            </div>

                            <div>
                              <p className="text-xs font-semibold text-[#111113] leading-snug">
                                {item.name}
                              </p>
                              <p className="text-[11px] text-[#71717A] mt-0.5">
                                {item.category} · {item.fabric}
                              </p>
                            </div>

                            {isSwappingThis && (
                              <div className="p-2.5 rounded-lg border border-[#D4D4D8] bg-[#FAFAFA] space-y-1.5">
                                <p className="text-[11px] font-medium text-[#52525B]">
                                  Replace with:
                                </p>
                                <div className="max-h-36 overflow-y-auto space-y-1">
                                  {alternatives.map((alt) => (
                                    <button
                                      key={alt.id}
                                      type="button"
                                      onClick={() =>
                                        handleSwapPiece(outfit.id, item.id, alt.id)
                                      }
                                      className="w-full flex items-center gap-2 p-1.5 rounded-md hover:bg-white text-left transition-colors cursor-pointer"
                                    >
                                      <img
                                        src={alt.imageUrl}
                                        alt={alt.name}
                                        className="w-7 h-9 object-cover rounded border border-[#E4E4E7] shrink-0"
                                      />
                                      <div className="min-w-0">
                                        <p className="text-[11px] font-medium text-[#111113] truncate">
                                          {alt.name}
                                        </p>
                                        <p className="text-[10px] text-[#71717A] truncate">
                                          {alt.category}
                                        </p>
                                      </div>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Stylist Analysis & Color Palette */}
                    <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_280px] gap-6 pt-2">
                      <div className="space-y-4">
                        <div>
                          <h3 className="text-xs font-semibold text-[#111113] mb-1.5">
                            Stylist Rationale
                          </h3>
                          <p className="text-sm text-[#3F3F46] leading-relaxed">
                            {outfit.stylistRationale}
                          </p>
                        </div>

                        <div>
                          <h3 className="text-xs font-semibold text-[#111113] mb-1.5">
                            Weather & Layering Fit
                          </h3>
                          <p className="text-sm text-[#3F3F46] leading-relaxed">
                            {outfit.weatherAdaptation}
                          </p>
                        </div>

                        {outfit.missingPieceSuggestion && (
                          <p className="text-xs text-[#52525B] pt-1">
                            <span className="font-semibold text-[#111113]">
                              Wardrobe note:
                            </span>{" "}
                            {outfit.missingPieceSuggestion}
                          </p>
                        )}
                      </div>

                      <div className="space-y-5 md:border-l md:border-[#E4E4E7] md:pl-6">
                        <div>
                          <h3 className="text-xs font-semibold text-[#111113] mb-2.5">
                            Color Harmony
                          </h3>
                          <div className="space-y-2">
                            {outfit.colorPalette.map((swatch, sIdx) => (
                              <div
                                key={`${swatch.hex}_${sIdx}`}
                                className="flex items-center justify-between gap-2 text-xs"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <span
                                    className="w-4 h-4 rounded border border-black/10 shrink-0"
                                    style={{ backgroundColor: swatch.hex }}
                                  />
                                  <span className="text-[#111113] truncate">
                                    {swatch.name}
                                  </span>
                                </div>
                                <span className="font-mono text-[11px] tabular-nums text-[#71717A] shrink-0">
                                  {swatch.hex}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div>
                          <h3 className="text-xs font-semibold text-[#111113] mb-2">
                            Styling Adjustments
                          </h3>
                          <ol className="space-y-1.5">
                            {outfit.stylingTips.map((tip, tIdx) => (
                              <li
                                key={tIdx}
                                className="text-xs text-[#3F3F46] leading-relaxed flex items-start gap-2"
                              >
                                <span className="font-mono text-[11px] tabular-nums text-[#71717A] mt-0.5 shrink-0">
                                  0{tIdx + 1}.
                                </span>
                                <span>{tip}</span>
                              </li>
                            ))}
                          </ol>
                        </div>
                      </div>
                    </div>

                    {/* Refine Outfit Bar */}
                    <div className="pt-4 border-t border-[#E4E4E7]">
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          void handleRefineOutfit(outfit);
                        }}
                        className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5"
                      >
                        <input
                          type="text"
                          value={refineInputs[outfit.id] || ""}
                          onChange={(e) =>
                            setRefineInputs((prev) => ({
                              ...prev,
                              [outfit.id]: e.target.value,
                            }))
                          }
                          placeholder="Refine this look (e.g., Make it warmer for evening, swap to jeans)"
                          aria-label={`Refine ${outfit.title}`}
                          className="flex-1 px-3.5 py-2 text-xs bg-[#FAFAFA] border border-[#D4D4D8] rounded-lg focus:outline-none focus:border-[#111113]"
                        />
                        <button
                          type="submit"
                          disabled={
                            isRefining || !(refineInputs[outfit.id] || "").trim()
                          }
                          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-medium text-[#111113] bg-white border border-[#D4D4D8] rounded-lg hover:bg-[#111113] hover:text-white hover:border-[#111113] disabled:opacity-45 disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          {isRefining ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Refining...</span>
                            </>
                          ) : (
                            <>
                              <Check className="w-3.5 h-3.5" aria-hidden="true" />
                              <span>Refine Look</span>
                            </>
                          )}
                        </button>
                      </form>
                      {refineErrors[outfit.id] && (
                        <p className="text-xs text-[#B91C1C] mt-2" role="alert">
                          {refineErrors[outfit.id]}
                        </p>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
