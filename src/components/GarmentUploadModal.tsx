import { useRef, useState } from "react";
import { AlertCircle, Check, Loader2, Trash2, Upload, X } from "lucide-react";
import { CATEGORY_OPTIONS } from "../data/starterData";
import type {
  FormalityLevel,
  GarmentCategory,
  Seasonality,
  WardrobeItem,
} from "../types";
import { compressImageFile } from "../utils/imageUtils";

interface DraftUploadItem {
  tempId: string;
  imageUrl: string;
  status: "analyzing" | "ready" | "error";
  errorMessage?: string;
  name: string;
  category: GarmentCategory;
  colorName: string;
  colorHex: string;
  fabric: string;
  seasonality: Seasonality;
  formality: FormalityLevel;
  styleTags: string[];
  stylingNotes: string;
}

interface GarmentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddItems: (items: WardrobeItem[]) => void;
}

const SEASONALITY_OPTIONS: Seasonality[] = ["All-Season", "Warm", "Cool", "Cold"];
const FORMALITY_OPTIONS: FormalityLevel[] = [
  "Casual",
  "Smart Casual",
  "Business",
  "Formal",
  "Active",
];

export function GarmentUploadModal({
  isOpen,
  onClose,
  onAddItems,
}: GarmentUploadModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [drafts, setDrafts] = useState<DraftUploadItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  if (!isOpen) return null;

  const processFiles = async (files: FileList | File[]) => {
    const fileList = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (fileList.length === 0) return;

    for (const file of fileList) {
      const tempId = `draft_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      try {
        const { dataUrl, mimeType } = await compressImageFile(file, 1024, 0.85);
        const initialDraft: DraftUploadItem = {
          tempId,
          imageUrl: dataUrl,
          status: "analyzing",
          name: file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " "),
          category: "Top",
          colorName: "Neutral",
          colorHex: "#52525B",
          fabric: "Cotton Blend",
          seasonality: "All-Season",
          formality: "Smart Casual",
          styleTags: ["Minimalist"],
          stylingNotes: "",
        };

        setDrafts((prev) => [initialDraft, ...prev]);

        const res = await fetch("/api/wardrobe/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageBase64: dataUrl, mimeType }),
        });

        const payload = (await res.json()) as {
          analysis?: {
            name: string;
            category: GarmentCategory;
            colorName: string;
            colorHex: string;
            fabric: string;
            seasonality: Seasonality;
            formality: FormalityLevel;
            styleTags: string[];
            stylingNotes: string;
          };
          error?: string;
        };

        if (!res.ok || !payload.analysis) {
          throw new Error(payload.error || "Unable to analyze this photo automatically.");
        }

        const a = payload.analysis;
        setDrafts((prev) =>
          prev.map((d) =>
            d.tempId === tempId
              ? {
                  ...d,
                  status: "ready",
                  name: a.name || d.name,
                  category: CATEGORY_OPTIONS.includes(a.category) ? a.category : "Top",
                  colorName: a.colorName || "Neutral",
                  colorHex: /^#[0-9A-Fa-f]{6}$/.test(a.colorHex) ? a.colorHex : "#52525B",
                  fabric: a.fabric || "Woven Fabric",
                  seasonality: SEASONALITY_OPTIONS.includes(a.seasonality)
                    ? a.seasonality
                    : "All-Season",
                  formality: FORMALITY_OPTIONS.includes(a.formality)
                    ? a.formality
                    : "Smart Casual",
                  styleTags: Array.isArray(a.styleTags) ? a.styleTags : ["Minimalist"],
                  stylingNotes: a.stylingNotes || "",
                }
              : d
          )
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : "Photo upload failed.";
        setDrafts((prev) =>
          prev.map((d) =>
            d.tempId === tempId
              ? { ...d, status: "error", errorMessage: message }
              : d
          )
        );
      }
    }
  };

  const updateDraft = <K extends keyof DraftUploadItem>(
    tempId: string,
    key: K,
    value: DraftUploadItem[K]
  ) => {
    setDrafts((prev) =>
      prev.map((d) => (d.tempId === tempId ? { ...d, [key]: value } : d))
    );
  };

  const removeDraft = (tempId: string) => {
    setDrafts((prev) => prev.filter((d) => d.tempId !== tempId));
  };

  const handleSaveAll = () => {
    const savable = drafts.filter((d) => d.status !== "analyzing");
    if (savable.length === 0) return;

    const now = new Date().toISOString();
    const newItems: WardrobeItem[] = savable.map((d, idx) => ({
      id: `item_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 6)}`,
      name: d.name.trim() || "Untitled Garment",
      category: d.category,
      colorName: d.colorName.trim() || "Neutral",
      colorHex: d.colorHex,
      fabric: d.fabric.trim() || "Mixed Fiber",
      seasonality: d.seasonality,
      formality: d.formality,
      styleTags: d.styleTags,
      stylingNotes: d.stylingNotes.trim(),
      imageUrl: d.imageUrl,
      isStarter: false,
      createdAt: now,
    }));

    onAddItems(newItems);
    setDrafts([]);
    onClose();
  };

  const analyzingCount = drafts.filter((d) => d.status === "analyzing").length;
  const readyCount = drafts.filter((d) => d.status !== "analyzing").length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-[2px] p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="upload-modal-title"
    >
      <div className="w-full max-w-3xl max-h-[90vh] flex flex-col bg-white border border-[#E4E4E7] rounded-xl shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E4E4E7]">
          <div>
            <h2
              id="upload-modal-title"
              className="font-editorial text-2xl font-semibold text-[#111113]"
            >
              Add Garments to Wardrobe
            </h2>
            <p className="text-xs text-[#52525B] mt-0.5">
              Upload photos of your clothes. Gemini Vision automatically catalogs fabric, color, and formality.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close upload dialog"
            className="w-10 h-10 inline-flex items-center justify-center rounded-lg text-[#52525B] hover:bg-[#F4F4F5] hover:text-[#111113] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              if (e.dataTransfer.files) {
                void processFiles(e.dataTransfer.files);
              }
            }}
            className={`border border-dashed rounded-xl p-8 text-center transition-colors ${
              isDragging
                ? "border-[#1D4ED8] bg-[#EFF6FF]"
                : "border-[#D4D4D8] bg-[#FAFAFA] hover:border-[#A1A1AA]"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => {
                if (e.target.files) {
                  void processFiles(e.target.files);
                  e.target.value = "";
                }
              }}
              className="hidden"
            />
            <div className="mx-auto w-11 h-11 rounded-lg bg-white border border-[#E4E4E7] flex items-center justify-center mb-3">
              <Upload className="w-5 h-5 text-[#111113]" aria-hidden="true" />
            </div>
            <p className="text-sm font-medium text-[#111113]">
              Drop clothing photos here, or select files from your device
            </p>
            <p className="text-xs text-[#71717A] mt-1 mb-4">
              Supports JPG, PNG, and WEBP. Multiple items can be cataloged together.
            </p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 text-xs font-medium text-[#111113] bg-white border border-[#D4D4D8] rounded-lg hover:bg-[#F4F4F5] transition-colors cursor-pointer"
            >
              Choose Photos
            </button>
          </div>

          {drafts.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-[#52525B]">
                <span className="font-medium text-[#111113]">
                  Catalog Queue ({drafts.length})
                </span>
                {analyzingCount > 0 && (
                  <span className="inline-flex items-center gap-1.5 text-[#1D4ED8]">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Analyzing {analyzingCount} garment{analyzingCount > 1 ? "s" : ""}...
                  </span>
                )}
              </div>

              {drafts.map((draft) => (
                <div
                  key={draft.tempId}
                  className="grid grid-cols-1 sm:grid-cols-[120px_minmax(0,1fr)] gap-4 p-4 rounded-xl border border-[#E4E4E7] bg-[#FAFAFA]"
                >
                  <div className="relative aspect-[3/4] rounded-lg overflow-hidden bg-white border border-[#E4E4E7]">
                    <img
                      src={draft.imageUrl}
                      alt={draft.name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 text-xs">
                        {draft.status === "analyzing" && (
                          <span className="inline-flex items-center gap-1.5 text-[#1D4ED8] font-medium">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            Identifying garment attributes...
                          </span>
                        )}
                        {draft.status === "ready" && (
                          <span className="inline-flex items-center gap-1.5 text-[#15803D] font-medium">
                            <Check className="w-3.5 h-3.5" />
                            AI cataloged — review or edit below
                          </span>
                        )}
                        {draft.status === "error" && (
                          <span className="inline-flex items-center gap-1.5 text-[#B91C1C] font-medium">
                            <AlertCircle className="w-3.5 h-3.5" />
                            {draft.errorMessage || "Auto-analysis failed — fill details manually"}
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => removeDraft(draft.tempId)}
                        aria-label={`Remove ${draft.name}`}
                        className="p-1.5 text-[#71717A] hover:text-[#B91C1C] rounded-md transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <label className="block">
                        <span className="text-[11px] font-medium text-[#52525B]">
                          Garment Name
                        </span>
                        <input
                          type="text"
                          value={draft.name}
                          onChange={(e) => updateDraft(draft.tempId, "name", e.target.value)}
                          className="mt-1 w-full px-3 py-1.5 text-sm bg-white border border-[#D4D4D8] rounded-lg focus:outline-none focus:border-[#111113]"
                        />
                      </label>

                      <label className="block">
                        <span className="text-[11px] font-medium text-[#52525B]">
                          Category
                        </span>
                        <select
                          value={draft.category}
                          onChange={(e) =>
                            updateDraft(
                              draft.tempId,
                              "category",
                              e.target.value as GarmentCategory
                            )
                          }
                          className="mt-1 w-full px-3 py-1.5 text-sm bg-white border border-[#D4D4D8] rounded-lg focus:outline-none focus:border-[#111113]"
                        >
                          {CATEGORY_OPTIONS.map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="block">
                        <span className="text-[11px] font-medium text-[#52525B]">
                          Color & Swatch
                        </span>
                        <div className="mt-1 flex items-center gap-2">
                          <input
                            type="color"
                            value={draft.colorHex}
                            onChange={(e) =>
                              updateDraft(draft.tempId, "colorHex", e.target.value)
                            }
                            aria-label="Color swatch"
                            className="w-8 h-8 rounded border border-[#D4D4D8] bg-white p-0.5 cursor-pointer shrink-0"
                          />
                          <input
                            type="text"
                            value={draft.colorName}
                            onChange={(e) =>
                              updateDraft(draft.tempId, "colorName", e.target.value)
                            }
                            className="w-full px-3 py-1.5 text-sm bg-white border border-[#D4D4D8] rounded-lg focus:outline-none focus:border-[#111113]"
                          />
                        </div>
                      </label>

                      <label className="block">
                        <span className="text-[11px] font-medium text-[#52525B]">
                          Fabric / Material
                        </span>
                        <input
                          type="text"
                          value={draft.fabric}
                          onChange={(e) => updateDraft(draft.tempId, "fabric", e.target.value)}
                          className="mt-1 w-full px-3 py-1.5 text-sm bg-white border border-[#D4D4D8] rounded-lg focus:outline-none focus:border-[#111113]"
                        />
                      </label>

                      <label className="block">
                        <span className="text-[11px] font-medium text-[#52525B]">
                          Seasonality
                        </span>
                        <select
                          value={draft.seasonality}
                          onChange={(e) =>
                            updateDraft(
                              draft.tempId,
                              "seasonality",
                              e.target.value as Seasonality
                            )
                          }
                          className="mt-1 w-full px-3 py-1.5 text-sm bg-white border border-[#D4D4D8] rounded-lg focus:outline-none focus:border-[#111113]"
                        >
                          {SEASONALITY_OPTIONS.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="block">
                        <span className="text-[11px] font-medium text-[#52525B]">
                          Formality
                        </span>
                        <select
                          value={draft.formality}
                          onChange={(e) =>
                            updateDraft(
                              draft.tempId,
                              "formality",
                              e.target.value as FormalityLevel
                            )
                          }
                          className="mt-1 w-full px-3 py-1.5 text-sm bg-white border border-[#D4D4D8] rounded-lg focus:outline-none focus:border-[#111113]"
                        >
                          {FORMALITY_OPTIONS.map((f) => (
                            <option key={f} value={f}>
                              {f}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>

                    <label className="block">
                      <span className="text-[11px] font-medium text-[#52525B]">
                        Styling Notes
                      </span>
                      <input
                        type="text"
                        value={draft.stylingNotes}
                        onChange={(e) =>
                          updateDraft(draft.tempId, "stylingNotes", e.target.value)
                        }
                        placeholder="Fit, drape, or pairing notes..."
                        className="mt-1 w-full px-3 py-1.5 text-sm bg-white border border-[#D4D4D8] rounded-lg focus:outline-none focus:border-[#111113]"
                      />
                    </label>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-4 px-6 py-4 border-t border-[#E4E4E7] bg-[#FAFAFA]">
          <span className="text-xs text-[#52525B]">
            {readyCount > 0
              ? `${readyCount} garment${readyCount > 1 ? "s" : ""} ready to add`
              : "Upload at least one photo to continue"}
          </span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs sm:text-sm font-medium text-[#52525B] bg-white border border-[#D4D4D8] rounded-lg hover:text-[#111113] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={readyCount === 0 || analyzingCount > 0}
              onClick={handleSaveAll}
              className="px-5 py-2 text-xs sm:text-sm font-medium text-white bg-[#111113] rounded-lg hover:bg-[#27272A] disabled:opacity-45 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              Save to Wardrobe
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
