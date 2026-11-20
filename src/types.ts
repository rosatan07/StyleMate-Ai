export type GarmentCategory =
  | 'Top'
  | 'Bottom'
  | 'Outerwear'
  | 'Dress'
  | 'Footwear'
  | 'Accessory';

export type Seasonality = 'All-Season' | 'Warm' | 'Cool' | 'Cold';

export type FormalityLevel =
  | 'Casual'
  | 'Smart Casual'
  | 'Business'
  | 'Formal'
  | 'Active';

export interface WardrobeItem {
  id: string;
  name: string;
  category: GarmentCategory;
  colorName: string;
  colorHex: string;
  fabric: string;
  seasonality: Seasonality;
  formality: FormalityLevel;
  styleTags: string[];
  stylingNotes: string;
  imageUrl: string;
  isStarter?: boolean;
  createdAt: string;
}

export type WeatherCondition =
  | 'Sunny'
  | 'Partly Cloudy'
  | 'Cloudy'
  | 'Rainy'
  | 'Windy'
  | 'Snowy'
  | 'Humid';

export interface WeatherContext {
  city: string;
  country?: string;
  temperatureC: number;
  feelsLikeC: number;
  condition: WeatherCondition;
  humidity: number;
  windKph: number;
  isLive: boolean;
  updatedAt?: string;
}

export type StylePreference =
  | 'Minimalist'
  | 'Classic Tailored'
  | 'Smart Casual'
  | 'Streetwear'
  | 'Monochrome'
  | 'Avant-Garde'
  | 'Relaxed Linen'
  | 'Preppy';

export type OccasionType =
  | 'Work & Office'
  | 'Weekend Casual'
  | 'Date Night'
  | 'Formal Event'
  | 'Travel & Transit'
  | 'Creative Studio'
  | 'Dinner & Drinks';

export type FitPreference = 'Tailored' | 'Relaxed' | 'Balanced' | 'Oversized';

export interface UserProfile {
  defaultCity: string;
  tempUnit: 'C' | 'F';
  defaultStyle: StylePreference;
  fitPreference: FitPreference;
  colorMood: string;
  layeringPreference: 'Minimal Layers' | 'Balanced' | 'Structured Layering';
  styleNotes: string;
}

export interface OutfitColorSwatch {
  name: string;
  hex: string;
}

export interface GeneratedOutfit {
  id: string;
  title: string;
  subtitle: string;
  itemIds: string[];
  stylistRationale: string;
  weatherAdaptation: string;
  colorPalette: OutfitColorSwatch[];
  stylingTips: string[];
  missingPieceSuggestion?: string;
  occasion: OccasionType;
  style: StylePreference;
  weatherSnapshot: WeatherContext;
  createdAt: string;
}

export interface SavedLookbookEntry {
  id: string;
  outfit: GeneratedOutfit;
  scheduledDate?: string;
  personalNote?: string;
  savedAt: string;
}
