import { useState } from "react";
import { ArrowUpRight, Calendar, Search, Trash2 } from "lucide-react";
import { OCCASION_OPTIONS } from "../data/starterData";
import type {
  GeneratedOutfit,
  OccasionType,
  SavedLookbookEntry,
  UserProfile,
  WardrobeItem,
} from "../types";
import { formatTemp } from "../utils/imageUtils";
import { GarmentImage } from "./GarmentImage";

interface LookbookViewProps {
  entries: SavedLookbookEntry[];
  wardrobe: WardrobeItem[];
  userProfile: UserProfile;
  onUpdateEntry: (id: string, patch: Partial<SavedLookbookEntry>) => void;
  onRemoveEntry: (id: string) => void;
  onOpenInStudio: (outfit: GeneratedOutfit) => void;
  onGoToStudio: () => void;
}

export function LookbookView({
  entries,
  wardrobe,
  userProfile,
  onUpdateEntry,
  onRemoveEntry,
  onOpenInStudio,
  onGoToStudio,
}: LookbookViewProps) {
  const [occasionFilter, setOccasionFilter] = useState<OccasionType | "All">("All");
  const [searchQuery, setSearchQuery] = useState("");

  const wardrobeById = new Map(wardrobe.map((w) => [w.id, w]));

  const filtered = entries.filter((entry) => {
    const matchesOccasion =
      occasionFilter === "All" || entry.outfit.occasion === occasionFilter;
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      entry.outfit.title.toLowerCase().includes(q) ||
      entry.outfit.style.toLowerCase().includes(q) ||
      (entry.personalNote || "").toLowerCase().includes(q);
    return matchesOccasion && matchesSearch;
  });

  return (
    <div className="max-w-[1360px] mx-auto px-4 sm:px-8 py-8 sm:py-10 space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-[#E4E4E7]">
        <div>
          <p className="text-xs font-medium text-[#52525B] mb-2">
            Saved Curations & Calendar
          </p>
          <h1 className="font-editorial text-3xl sm:text-4xl font-semibold text-[#111113]">
            Personal Lookbook
          </h1>
          <p className="text-sm text-[#52525B] mt-1">
            Review your saved outfit combinations, assign wear dates, and keep personal styling notes.
          </p>
        </div>
        <button
          type="button"
          onClick={onGoToStudio}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-[#111113] rounded-lg hover:bg-[#27272A] transition-colors shrink-0 cursor-pointer"
        >
          <span>Create New Looks</span>
        </button>
      </div>

      {entries.length > 0 && (
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-1 p-1 bg-[#F4F4F5] rounded-lg overflow-x-auto">
            {(["All", ...OCCASION_OPTIONS] as const).map((occ) => {
              const active = occasionFilter === occ;
              return (
                <button
                  key={occ}
                  type="button"
                  onClick={() => setOccasionFilter(occ)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? "bg-white text-[#111113] shadow-xs"
                      : "text-[#52525B] hover:text-[#111113]"
                  }`}
                >
                  {occ}
                </button>
              );
            })}
          </div>

          <div className="relative w-full lg:w-72">
            <Search
              className="w-4 h-4 text-[#71717A] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search saved looks..."
              aria-label="Search lookbook"
              className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-[#D4D4D8] rounded-lg focus:outline-none focus:border-[#111113]"
            />
          </div>
        </div>
      )}

      {entries.length === 0 ? (
        <div className="bg-white border border-[#E4E4E7] rounded-xl p-12 text-center">
          <h2 className="font-editorial text-2xl font-semibold text-[#111113]">
            Your lookbook is waiting for its first curation
          </h2>
          <p className="text-sm text-[#52525B] max-w-md mx-auto mt-2 mb-6">
            Generate outfit ideas in the Studio and save your favorites here to plan upcoming days or trips.
          </p>
          <button
            type="button"
            onClick={onGoToStudio}
            className="px-5 py-2.5 text-xs font-medium text-white bg-[#111113] rounded-lg hover:bg-[#27272A] cursor-pointer"
          >
            Go to Styling Studio
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-[#E4E4E7] rounded-xl p-10 text-center">
          <p className="text-sm text-[#52525B]">
            No saved looks match the current filter.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filtered.map((entry) => {
            const items = entry.outfit.itemIds
              .map((id) => wardrobeById.get(id))
              .filter((x): x is WardrobeItem => Boolean(x));

            return (
              <article
                key={entry.id}
                className="bg-white border border-[#E4E4E7] rounded-xl p-6 flex flex-col justify-between gap-5"
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 text-xs text-[#71717A]">
                        <span>{entry.outfit.style}</span>
                        <span aria-hidden="true">·</span>
                        <span>{entry.outfit.occasion}</span>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums">
                          {formatTemp(
                            entry.outfit.weatherSnapshot.temperatureC,
                            userProfile.tempUnit
                          )}{" "}
                          {entry.outfit.weatherSnapshot.city}
                        </span>
                      </div>
                      <h2 className="font-editorial text-2xl font-semibold text-[#111113] mt-1">
                        {entry.outfit.title}
                      </h2>
                    </div>

                    <button
                      type="button"
                      onClick={() => onRemoveEntry(entry.id)}
                      aria-label={`Remove ${entry.outfit.title} from Lookbook`}
                      className="p-2 text-[#71717A] hover:text-[#B91C1C] hover:bg-[#FEF2F2] rounded-lg transition-colors shrink-0 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-4 gap-3">
                    {items.map((item) => (
                      <div key={item.id}>
                        <div className="aspect-[3/4] rounded-lg overflow-hidden border border-[#E4E4E7] bg-[#F4F4F5]">
                          <GarmentImage
                            src={item.imageUrl}
                            alt={item.name}
                            colorHex={item.colorHex}
                            label={item.name}
                            className="w-full h-full"
                          />
                        </div>
                        <p className="mt-1.5 text-[11px] font-medium text-[#111113] truncate">
                          {item.name}
                        </p>
                      </div>
                    ))}
                  </div>

                  <p className="text-xs text-[#3F3F46] leading-relaxed">
                    {entry.outfit.stylistRationale}
                  </p>
                </div>

                <div className="pt-4 border-t border-[#E4E4E7] space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="block">
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#52525B]">
                        <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Planned Date</span>
                      </span>
                      <input
                        type="date"
                        value={entry.scheduledDate || ""}
                        onChange={(e) =>
                          onUpdateEntry(entry.id, { scheduledDate: e.target.value })
                        }
                        className="mt-1 w-full px-3 py-1.5 text-xs bg-[#FAFAFA] border border-[#D4D4D8] rounded-lg focus:outline-none focus:border-[#111113]"
                      />
                    </label>

                    <label className="block">
                      <span className="text-[11px] font-medium text-[#52525B]">
                        Personal Note
                      </span>
                      <input
                        type="text"
                        value={entry.personalNote || ""}
                        onChange={(e) =>
                          onUpdateEntry(entry.id, { personalNote: e.target.value })
                        }
                        placeholder="Add reminder or accessory note..."
                        className="mt-1 w-full px-3 py-1.5 text-xs bg-[#FAFAFA] border border-[#D4D4D8] rounded-lg focus:outline-none focus:border-[#111113]"
                      />
                    </label>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => onOpenInStudio(entry.outfit)}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-[#111113] hover:text-[#1D4ED8] transition-colors cursor-pointer"
                    >
                      <span>Open in Studio to Refine</span>
                      <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
