import { useState } from "react";
import { Menu, Plus, X } from "lucide-react";

export type AppTab = "studio" | "wardrobe" | "lookbook" | "profile";

interface HeaderProps {
  activeTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
  onOpenUpload: () => void;
  wardrobeCount: number;
  lookbookCount: number;
}

export function Header({
  activeTab,
  onSelectTab,
  onOpenUpload,
  wardrobeCount,
  lookbookCount,
}: HeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems: Array<{ id: AppTab; label: string; count?: number }> = [
    { id: "studio", label: "Studio" },
    { id: "wardrobe", label: "Wardrobe", count: wardrobeCount },
    { id: "lookbook", label: "Lookbook", count: lookbookCount },
    { id: "profile", label: "Style Profile" },
  ];

  const handleNav = (id: AppTab) => {
    onSelectTab(id);
    setMobileOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-[#FAFAFA]/95 backdrop-blur-sm border-b border-[#E4E4E7]">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single text element wordmark */}
        <button
          type="button"
          onClick={() => handleNav("studio")}
          className="font-editorial text-2xl font-semibold tracking-tight text-[#111113] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1D4ED8] cursor-pointer"
        >
          STYLEMATE AI
        </button>

        {/* Zone 2: 4 clean single-line text navigation links */}
        <nav className="hidden md:flex items-center gap-7" aria-label="Primary navigation">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNav(item.id)}
                className={`relative py-5 text-sm font-medium transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D4ED8] ${
                  isActive
                    ? "text-[#111113]"
                    : "text-[#52525B] hover:text-[#111113]"
                }`}
              >
                <span>{item.label}</span>
                {typeof item.count === "number" && (
                  <span className="ml-1.5 text-xs font-mono tabular-nums text-[#71717A]">
                    {item.count}
                  </span>
                )}
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 bottom-0 h-[2px] bg-[#111113]"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: 1 primary action (plus mobile menu toggle) */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onOpenUpload}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-medium text-white bg-[#111113] rounded-lg hover:bg-[#27272A] transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D4ED8]"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span>Add Garment</span>
          </button>

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={mobileOpen}
            className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-lg border border-[#E4E4E7] bg-white text-[#111113] cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D4ED8]"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav
          className="md:hidden border-t border-[#E4E4E7] bg-white px-4 py-3 flex flex-col gap-1"
          aria-label="Mobile navigation"
        >
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNav(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-left transition-colors ${
                  isActive
                    ? "bg-[#F4F4F5] text-[#111113]"
                    : "text-[#52525B] hover:bg-[#FAFAFA] hover:text-[#111113]"
                }`}
              >
                <span>{item.label}</span>
                {typeof item.count === "number" && (
                  <span className="text-xs font-mono tabular-nums text-[#71717A]">
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      )}
    </header>
  );
}
