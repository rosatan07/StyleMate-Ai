import { useState } from "react";
import { Shirt } from "lucide-react";

interface GarmentImageProps {
  src: string;
  alt: string;
  className?: string;
  colorHex?: string;
  label?: string;
}

export function GarmentImage({
  src,
  alt,
  className = "",
  colorHex = "#E4E4E7",
  label,
}: GarmentImageProps) {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-[#F4F4F5] text-[#71717A] p-4 text-center ${className}`}
        style={{
          backgroundImage: `radial-gradient(circle at 50% 35%, ${colorHex}22, transparent 70%)`,
        }}
      >
        <Shirt className="w-7 h-7 stroke-[1.5] mb-2 text-[#52525B]" aria-hidden="true" />
        <span className="text-xs font-medium text-[#3F3F46] line-clamp-2">
          {label || alt}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
      className={`bg-[#F4F4F5] object-cover ${className}`}
    />
  );
}
