import { useEffect, useState } from "react";
import { GarmentUploadModal } from "./components/GarmentUploadModal";
import { Header, type AppTab } from "./components/Header";
import { LookbookView } from "./components/LookbookView";
import { ProfileView } from "./components/ProfileView";
import { StudioView } from "./components/StudioView";
import { WardrobeView } from "./components/WardrobeView";
import { STARTER_WARDROBE } from "./data/starterData";
import type {
  GeneratedOutfit,
  OccasionType,
  SavedLookbookEntry,
  StylePreference,
  UserProfile,
  WardrobeItem,
  WeatherContext,
} from "./types";
import {
  loadLastOutfits,
  loadLookbook,
  loadUserProfile,
  loadWardrobe,
  loadWeather,
  saveLastOutfits,
  saveLookbook,
  saveUserProfile,
  saveWardrobe,
  saveWeather,
} from "./utils/storage";

export default function App() {
  const [activeTab, setActiveTab] = useState<AppTab>("studio");
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  const [wardrobe, setWardrobe] = useState<WardrobeItem[]>(() => loadWardrobe());
  const [lookbook, setLookbook] = useState<SavedLookbookEntry[]>(() => loadLookbook());
  const [userProfile, setUserProfile] = useState<UserProfile>(() => loadUserProfile());
  const [weather, setWeather] = useState<WeatherContext>(() => loadWeather());
  const [outfits, setOutfits] = useState<GeneratedOutfit[]>(() => loadLastOutfits());

  const [selectedStyle, setSelectedStyle] = useState<StylePreference>(
    userProfile.defaultStyle
  );
  const [selectedOccasion, setSelectedOccasion] =
    useState<OccasionType>("Work & Office");
  const [anchorItemIds, setAnchorItemIds] = useState<string[]>([]);

  useEffect(() => {
    saveWardrobe(wardrobe);
  }, [wardrobe]);

  useEffect(() => {
    saveLookbook(lookbook);
  }, [lookbook]);

  useEffect(() => {
    saveUserProfile(userProfile);
  }, [userProfile]);

  useEffect(() => {
    saveWeather(weather);
  }, [weather]);

  useEffect(() => {
    saveLastOutfits(outfits);
  }, [outfits]);

  const handleAddWardrobeItems = (newItems: WardrobeItem[]) => {
    setWardrobe((prev) => [...newItems, ...prev]);
  };

  const handleUpdateWardrobeItem = (updated: WardrobeItem) => {
    setWardrobe((prev) =>
      prev.map((item) => (item.id === updated.id ? updated : item))
    );
  };

  const handleDeleteWardrobeItem = (itemId: string) => {
    setWardrobe((prev) => prev.filter((item) => item.id !== itemId));
    setAnchorItemIds((prev) => prev.filter((id) => id !== itemId));
  };

  const handleRestoreStarter = () => {
    setWardrobe((prev) => {
      const existingIds = new Set(prev.map((p) => p.id));
      const missingStarter = STARTER_WARDROBE.filter((s) => !existingIds.has(s.id));
      return [...prev, ...missingStarter];
    });
  };

  const handleToggleAnchor = (itemId: string) => {
    setAnchorItemIds((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]
    );
  };

  const handleStyleWithItem = (itemId: string) => {
    setAnchorItemIds((prev) =>
      prev.includes(itemId) ? prev : [...prev, itemId]
    );
    setActiveTab("studio");
  };

  const handleSaveToLookbook = (outfit: GeneratedOutfit) => {
    setLookbook((prev) => {
      if (prev.some((e) => e.outfit.id === outfit.id)) return prev;
      const entry: SavedLookbookEntry = {
        id: `look_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        outfit,
        savedAt: new Date().toISOString(),
      };
      return [entry, ...prev];
    });
  };

  const handleUpdateLookbookEntry = (
    id: string,
    patch: Partial<SavedLookbookEntry>
  ) => {
    setLookbook((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ...patch } : e))
    );
  };

  const handleRemoveLookbookEntry = (id: string) => {
    setLookbook((prev) => prev.filter((e) => e.id !== id));
  };

  const handleOpenInStudio = (outfit: GeneratedOutfit) => {
    setSelectedStyle(outfit.style);
    setSelectedOccasion(outfit.occasion);
    setOutfits((prev) => {
      const others = prev.filter((o) => o.id !== outfit.id);
      return [outfit, ...others];
    });
    setActiveTab("studio");
  };

  const handleSaveProfile = (next: UserProfile) => {
    setUserProfile(next);
    setSelectedStyle(next.defaultStyle);
  };

  const savedOutfitIds = new Set(lookbook.map((e) => e.outfit.id));

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAFA] text-[#111113]">
      <Header
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenUpload={() => setIsUploadOpen(true)}
        wardrobeCount={wardrobe.length}
        lookbookCount={lookbook.length}
      />

      <div className="flex-1">
        {activeTab === "studio" && (
          <StudioView
            wardrobe={wardrobe}
            userProfile={userProfile}
            weather={weather}
            onUpdateWeather={setWeather}
            selectedStyle={selectedStyle}
            onSelectStyle={setSelectedStyle}
            selectedOccasion={selectedOccasion}
            onSelectOccasion={setSelectedOccasion}
            anchorItemIds={anchorItemIds}
            onToggleAnchor={handleToggleAnchor}
            onClearAnchors={() => setAnchorItemIds([])}
            outfits={outfits}
            onSetOutfits={setOutfits}
            savedOutfitIds={savedOutfitIds}
            onSaveToLookbook={handleSaveToLookbook}
            onOpenUpload={() => setIsUploadOpen(true)}
            onGoToWardrobe={() => setActiveTab("wardrobe")}
          />
        )}

        {activeTab === "wardrobe" && (
          <WardrobeView
            wardrobe={wardrobe}
            anchorItemIds={anchorItemIds}
            onStyleWithItem={handleStyleWithItem}
            onUpdateItem={handleUpdateWardrobeItem}
            onDeleteItem={handleDeleteWardrobeItem}
            onRestoreStarter={handleRestoreStarter}
            onOpenUpload={() => setIsUploadOpen(true)}
          />
        )}

        {activeTab === "lookbook" && (
          <LookbookView
            entries={lookbook}
            wardrobe={wardrobe}
            userProfile={userProfile}
            onUpdateEntry={handleUpdateLookbookEntry}
            onRemoveEntry={handleRemoveLookbookEntry}
            onOpenInStudio={handleOpenInStudio}
            onGoToStudio={() => setActiveTab("studio")}
          />
        )}

        {activeTab === "profile" && (
          <ProfileView profile={userProfile} onSaveProfile={handleSaveProfile} />
        )}
      </div>

      <footer className="border-t border-[#E4E4E7] bg-white">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#71717A]">
          <span className="font-editorial text-sm font-semibold text-[#111113]">
            STYLEMATE AI
          </span>
          <span>
            Personal wardrobe archival and outfit curation · Saved locally in your browser
          </span>
        </div>
      </footer>

      <GarmentUploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onAddItems={handleAddWardrobeItems}
      />
    </div>
  );
}
