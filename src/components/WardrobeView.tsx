import { useState } from "react";
import { Pencil, Pin, Plus, RotateCcw, Search, Trash2, X } from "lucide-react";
import { CATEGORY_OPTIONS } from "../data/starterData";
import type {
  FormalityLevel,
  GarmentCategory,
  Seasonality,
  WardrobeItem,
} from "../types";
import { GarmentImage } from "./GarmentImage";

interface WardrobeViewProps {
  wardrobe: WardrobeItem[];
  anchorItemIds: string[];
  onStyleWithItem: (itemId: string) => void;
  onUpdateItem: (updated: WardrobeItem) => void;
  onDeleteItem: (itemId: string) => void;
  onRestoreStarter: () => void;
  onOpenUpload: () => void;
}

const SEASONALITY_OPTIONS: Seasonality[] = ["All-Season", "Warm", "Cool", "Cold"];
const FORMALITY_OPTIONS: FormalityLevel[] = [
  "Casual",
  "Smart Casual",
  "Business",
  "Formal",
  "Active",
];

export function WardrobeView({
  wardrobe,
  anchorItemIds,
  onStyleWithItem,
  onUpdateItem,
  onDeleteItem,
  onRestoreStarter,
  onOpenUpload,
}: WardrobeViewProps) {
  const [categoryFilter, setCategoryFilter] = useState<GarmentCategory | "All">("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [editingItem, setEditingItem] = useState<WardrobeItem | null>(null);

  const filtered = wardrobe.filter((item) => {
    const matchesCategory =
      categoryFilter === "All" || item.category === categoryFilter;
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      item.name.toLowerCase().includes(q) ||
      item.colorName.toLowerCase().includes(q) ||
      item.fabric.toLowerCase().includes(q) ||
      item.styleTags.some((t) => t.toLowerCase().includes(q));
    return matchesCategory && matchesSearch;
  });

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    onUpdateItem(editingItem);
    setEditingItem(null);
  };

  return (
    <div className="max-w-[1360px] mx-auto px-4 sm:px-8 py-8 sm:py-10 space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-[#E4E4E7]">
        <div>
          <p className="text-xs font-medium text-[#52525B] mb-2">
            Digital Closet Archive
          </p>
          <h1 className="font-editorial text-3xl sm:text-4xl font-semibold text-[#111113]">
            Your Wardrobe
          </h1>
          <p className="text-sm text-[#52525B] mt-1">
            Upload your own garments, inspect AI-cataloged fabrics, or pin pieces to style around.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onRestoreStarter}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-[#52525B] bg-white border border-[#D4D4D8] rounded-lg hover:text-[#111113] hover:bg-[#F4F4F5] transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Restore Starter Capsule</span>
          </button>
          <button
            type="button"
            onClick={onOpenUpload}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-[#111113] rounded-lg hover:bg-[#27272A] transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span>Upload Clothes</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-1 p-1 bg-[#F4F4F5] rounded-lg overflow-x-auto">
          {(["All", ...CATEGORY_OPTIONS] as const).map((cat) => {
            const count =
              cat === "All"
                ? wardrobe.length
                : wardrobe.filter((w) => w.category === cat).length;
            const active = categoryFilter === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? "bg-white text-[#111113] shadow-xs"
                    : "text-[#52525B] hover:text-[#111113]"
                }`}
              >
                <span>{cat}</span>
                <span className="ml-1.5 font-mono tabular-nums text-[11px] text-[#71717A]">
                  {count}
                </span>
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
            placeholder="Search color, fabric, or piece..."
            aria-label="Search wardrobe"
            className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-[#D4D4D8] rounded-lg focus:outline-none focus:border-[#111113]"
          />
        </div>
      </div>

      {/* Wardrobe Grid */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-[#E4E4E7] rounded-xl p-12 text-center">
          <h2 className="font-editorial text-2xl font-semibold text-[#111113]">
            No garments match your view
          </h2>
          <p className="text-sm text-[#52525B] mt-1.5 mb-5">
            {wardrobe.length === 0
              ? "Upload photos of your clothes to start building your digital wardrobe."
              : "Try clearing your search or switching category filters."}
          </p>
          <button
            type="button"
            onClick={() => {
              if (wardrobe.length === 0) {
                onOpenUpload();
              } else {
                setCategoryFilter("All");
                setSearchQuery("");
              }
            }}
            className="px-4 py-2 text-xs font-medium text-white bg-[#111113] rounded-lg hover:bg-[#27272A] cursor-pointer"
          >
            {wardrobe.length === 0 ? "Upload First Garment" : "Reset Filters"}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filtered.map((item) => {
            const isAnchored = anchorItemIds.includes(item.id);
            return (
              <article
                key={item.id}
                className="bg-white border border-[#E4E4E7] rounded-xl overflow-hidden flex flex-col transition-transform duration-150 hover:-translate-y-0.5"
              >
                <div className="relative aspect-[3/4] bg-[#F4F4F5] border-b border-[#E4E4E7]">
                  <GarmentImage
                    src={item.imageUrl}
                    alt={item.name}
                    colorHex={item.colorHex}
                    label={item.name}
                    className="w-full h-full"
                  />
                </div>

                <div className="p-4 flex-1 flex flex-col justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-1.5 text-[11px] text-[#71717A]">
                      <span>{item.category}</span>
                      <span aria-hidden="true">·</span>
                      <span>{item.seasonality}</span>
                      <span aria-hidden="true">·</span>
                      <span>{item.formality}</span>
                    </div>

                    <h2 className="text-base font-semibold text-[#111113] mt-1 leading-snug">
                      {item.name}
                    </h2>

                    <div className="flex items-center gap-2 mt-2 text-xs text-[#52525B]">
                      <span
                        className="w-3 h-3 rounded-full border border-black/15 shrink-0"
                        style={{ backgroundColor: item.colorHex }}
                      />
                      <span className="truncate">
                        {item.colorName} · {item.fabric}
                      </span>
                    </div>

                    {item.stylingNotes && (
                      <p className="text-xs text-[#71717A] mt-2 line-clamp-2">
                        {item.stylingNotes}
                      </p>
                    )}
                  </div>

                  <div className="pt-3 border-t border-[#E4E4E7] flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => onStyleWithItem(item.id)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                        isAnchored
                          ? "bg-[#1D4ED8] text-white border-[#1D4ED8]"
                          : "bg-[#FAFAFA] text-[#111113] border-[#D4D4D8] hover:bg-[#111113] hover:text-white hover:border-[#111113]"
                      }`}
                    >
                      <Pin className="w-3 h-3" aria-hidden="true" />
                      <span>{isAnchored ? "Pinned in Studio" : "Style with this"}</span>
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setEditingItem({ ...item })}
                        aria-label={`Edit ${item.name}`}
                        className="p-2 text-[#52525B] hover:text-[#111113] hover:bg-[#F4F4F5] rounded-lg transition-colors cursor-pointer"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteItem(item.id)}
                        aria-label={`Delete ${item.name}`}
                        className="p-2 text-[#52525B] hover:text-[#B91C1C] hover:bg-[#FEF2F2] rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Edit Garment Modal */}
      {editingItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-garment-title"
        >
          <form
            onSubmit={handleSaveEdit}
            className="w-full max-w-lg bg-white border border-[#E4E4E7] rounded-xl shadow-xl overflow-hidden"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E4E4E7]">
              <h2
                id="edit-garment-title"
                className="font-editorial text-2xl font-semibold text-[#111113]"
              >
                Edit Garment Details
              </h2>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="p-2 text-[#52525B] hover:text-[#111113] rounded-lg cursor-pointer"
                aria-label="Close edit dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <label className="block">
                <span className="text-xs font-medium text-[#52525B]">Name</span>
                <input
                  type="text"
                  required
                  value={editingItem.name}
                  onChange={(e) =>
                    setEditingItem({ ...editingItem, name: e.target.value })
                  }
                  className="mt-1 w-full px-3 py-2 text-sm border border-[#D4D4D8] rounded-lg focus:outline-none focus:border-[#111113]"
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs font-medium text-[#52525B]">
                    Category
                  </span>
                  <select
                    value={editingItem.category}
                    onChange={(e) =>
                      setEditingItem({
                        ...editingItem,
                        category: e.target.value as GarmentCategory,
                      })
                    }
                    className="mt-1 w-full px-3 py-2 text-sm border border-[#D4D4D8] rounded-lg bg-white"
                  >
                    {CATEGORY_OPTIONS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="text-xs font-medium text-[#52525B]">
                    Fabric
                  </span>
                  <input
                    type="text"
                    value={editingItem.fabric}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, fabric: e.target.value })
                    }
                    className="mt-1 w-full px-3 py-2 text-sm border border-[#D4D4D8] rounded-lg"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-medium text-[#52525B]">
                    Color Name & Swatch
                  </span>
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      type="color"
                      value={editingItem.colorHex}
                      onChange={(e) =>
                        setEditingItem({
                          ...editingItem,
                          colorHex: e.target.value,
                        })
                      }
                      className="w-9 h-9 rounded border border-[#D4D4D8] p-0.5 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={editingItem.colorName}
                      onChange={(e) =>
                        setEditingItem({
                          ...editingItem,
                          colorName: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 text-sm border border-[#D4D4D8] rounded-lg"
                    />
                  </div>
                </label>

                <label className="block">
                  <span className="text-xs font-medium text-[#52525B]">
                    Seasonality
                  </span>
                  <select
                    value={editingItem.seasonality}
                    onChange={(e) =>
                      setEditingItem({
                        ...editingItem,
                        seasonality: e.target.value as Seasonality,
                      })
                    }
                    className="mt-1 w-full px-3 py-2 text-sm border border-[#D4D4D8] rounded-lg bg-white"
                  >
                    {SEASONALITY_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="block">
                <span className="text-xs font-medium text-[#52525B]">
                  Formality
                </span>
                <select
                  value={editingItem.formality}
                  onChange={(e) =>
                    setEditingItem({
                      ...editingItem,
                      formality: e.target.value as FormalityLevel,
                    })
                  }
                  className="mt-1 w-full px-3 py-2 text-sm border border-[#D4D4D8] rounded-lg bg-white"
                >
                  {FORMALITY_OPTIONS.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-xs font-medium text-[#52525B]">
                  Styling Notes
                </span>
                <textarea
                  rows={2}
                  value={editingItem.stylingNotes}
                  onChange={(e) =>
                    setEditingItem({
                      ...editingItem,
                      stylingNotes: e.target.value,
                    })
                  }
                  className="mt-1 w-full px-3 py-2 text-sm border border-[#D4D4D8] rounded-lg"
                />
              </label>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#E4E4E7] bg-[#FAFAFA]">
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="px-4 py-2 text-xs font-medium text-[#52525B] bg-white border border-[#D4D4D8] rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-medium text-white bg-[#111113] rounded-lg hover:bg-[#27272A] cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
