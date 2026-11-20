import { useState } from "react";
import { Check } from "lucide-react";
import { STYLE_OPTIONS } from "../data/starterData";
import type { FitPreference, StylePreference, UserProfile } from "../types";

interface ProfileViewProps {
  profile: UserProfile;
  onSaveProfile: (next: UserProfile) => void;
}

const FIT_OPTIONS: FitPreference[] = ["Tailored", "Balanced", "Relaxed", "Oversized"];
const LAYERING_OPTIONS: UserProfile["layeringPreference"][] = [
  "Minimal Layers",
  "Balanced",
  "Structured Layering",
];

export function ProfileView({ profile, onSaveProfile }: ProfileViewProps) {
  const [draft, setDraft] = useState<UserProfile>(profile);
  const [savedToast, setSavedToast] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveProfile(draft);
    setSavedToast(true);
    window.setTimeout(() => setSavedToast(false), 2500);
  };

  return (
    <div className="max-w-[920px] mx-auto px-4 sm:px-8 py-8 sm:py-10 space-y-8">
      <div className="pb-6 border-b border-[#E4E4E7]">
        <p className="text-xs font-medium text-[#52525B] mb-2">
          Personalization Preferences
        </p>
        <h1 className="font-editorial text-3xl sm:text-4xl font-semibold text-[#111113]">
          Style Profile
        </h1>
        <p className="text-sm text-[#52525B] mt-1">
          Define your silhouette, layering, and climate defaults so every generated outfit reflects your personal taste.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white border border-[#E4E4E7] rounded-xl p-6 sm:p-8 space-y-6"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <label className="block">
            <span className="text-xs font-semibold text-[#111113]">
              Default City
            </span>
            <input
              type="text"
              value={draft.defaultCity}
              onChange={(e) =>
                setDraft({ ...draft, defaultCity: e.target.value })
              }
              placeholder="e.g. Tokyo, Paris, New York"
              className="mt-2 w-full px-3.5 py-2.5 text-sm bg-[#FAFAFA] border border-[#D4D4D8] rounded-lg focus:outline-none focus:border-[#111113]"
            />
          </label>

          <div>
            <span className="block text-xs font-semibold text-[#111113]">
              Temperature Scale
            </span>
            <div className="mt-2 grid grid-cols-2 gap-2 p-1 bg-[#F4F4F5] rounded-lg">
              {(["C", "F"] as const).map((unit) => (
                <button
                  key={unit}
                  type="button"
                  onClick={() => setDraft({ ...draft, tempUnit: unit })}
                  className={`py-2 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                    draft.tempUnit === unit
                      ? "bg-white text-[#111113] shadow-xs"
                      : "text-[#52525B] hover:text-[#111113]"
                  }`}
                >
                  {unit === "C" ? "Celsius (°C)" : "Fahrenheit (°F)"}
                </button>
              ))}
            </div>
          </div>
        </div>

        <hr className="border-[#E4E4E7]" />

        <div>
          <span className="block text-xs font-semibold text-[#111113] mb-2.5">
            Default Aesthetic Direction
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {STYLE_OPTIONS.map((style: StylePreference) => {
              const active = draft.defaultStyle === style;
              return (
                <button
                  key={style}
                  type="button"
                  onClick={() => setDraft({ ...draft, defaultStyle: style })}
                  className={`px-3 py-2 text-xs font-medium rounded-lg border text-left transition-colors cursor-pointer ${
                    active
                      ? "bg-[#111113] text-white border-[#111113]"
                      : "bg-[#FAFAFA] text-[#3F3F46] border-[#E4E4E7] hover:border-[#A1A1AA]"
                  }`}
                >
                  {style}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <span className="block text-xs font-semibold text-[#111113] mb-2.5">
              Silhouette & Fit Preference
            </span>
            <div className="grid grid-cols-2 gap-2">
              {FIT_OPTIONS.map((fit) => {
                const active = draft.fitPreference === fit;
                return (
                  <button
                    key={fit}
                    type="button"
                    onClick={() => setDraft({ ...draft, fitPreference: fit })}
                    className={`px-3 py-2 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                      active
                        ? "bg-[#111113] text-white border-[#111113]"
                        : "bg-[#FAFAFA] text-[#3F3F46] border-[#E4E4E7] hover:border-[#A1A1AA]"
                    }`}
                  >
                    {fit}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <span className="block text-xs font-semibold text-[#111113] mb-2.5">
              Layering Approach
            </span>
            <div className="flex flex-col gap-2">
              {LAYERING_OPTIONS.map((layering) => {
                const active = draft.layeringPreference === layering;
                return (
                  <button
                    key={layering}
                    type="button"
                    onClick={() =>
                      setDraft({ ...draft, layeringPreference: layering })
                    }
                    className={`px-3 py-2 text-xs font-medium rounded-lg border text-left transition-colors cursor-pointer ${
                      active
                        ? "bg-[#111113] text-white border-[#111113]"
                        : "bg-[#FAFAFA] text-[#3F3F46] border-[#E4E4E7] hover:border-[#A1A1AA]"
                    }`}
                  >
                    {layering}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <label className="block">
          <span className="text-xs font-semibold text-[#111113]">
            Preferred Color Mood
          </span>
          <input
            type="text"
            value={draft.colorMood}
            onChange={(e) => setDraft({ ...draft, colorMood: e.target.value })}
            placeholder="e.g. Earth tones, charcoal & ivory, muted navy"
            className="mt-2 w-full px-3.5 py-2.5 text-sm bg-[#FAFAFA] border border-[#D4D4D8] rounded-lg focus:outline-none focus:border-[#111113]"
          />
        </label>

        <label className="block">
          <span className="text-xs font-semibold text-[#111113]">
            Ongoing Stylist Notes
          </span>
          <textarea
            rows={3}
            value={draft.styleNotes}
            onChange={(e) => setDraft({ ...draft, styleNotes: e.target.value })}
            placeholder="Share anything important to your daily dressing (e.g., commute on foot, prefer breathable natural fibers, avoid bright logos)..."
            className="mt-2 w-full px-3.5 py-2.5 text-sm bg-[#FAFAFA] border border-[#D4D4D8] rounded-lg focus:outline-none focus:border-[#111113]"
          />
        </label>

        <div className="flex items-center justify-between pt-4 border-t border-[#E4E4E7]">
          <div className="text-xs text-[#15803D] font-medium flex items-center gap-1.5">
            {savedToast && (
              <>
                <Check className="w-4 h-4" aria-hidden="true" />
                <span>Preferences saved</span>
              </>
            )}
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 text-xs sm:text-sm font-medium text-white bg-[#111113] rounded-lg hover:bg-[#27272A] transition-colors cursor-pointer"
          >
            Save Preferences
          </button>
        </div>
      </form>
    </div>
  );
}
