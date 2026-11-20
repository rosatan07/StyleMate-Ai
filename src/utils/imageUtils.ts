export async function compressImageFile(
  file: File,
  maxDimension = 1024,
  quality = 0.84
): Promise<{ dataUrl: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read selected image file."));
    reader.onload = () => {
      const result = reader.result as string;
      const img = new Image();
      img.onerror = () => reject(new Error("Selected file is not a valid image."));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width >= height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve({ dataUrl: result, mimeType: file.type || "image/jpeg" });
          return;
        }
        ctx.fillStyle = "#FAFAFA";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve({ dataUrl, mimeType: "image/jpeg" });
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  });
}

export function formatTemp(tempC: number, unit: "C" | "F"): string {
  if (unit === "F") {
    return `${Math.round((tempC * 9) / 5 + 32)}°F`;
  }
  return `${Math.round(tempC)}°C`;
}

export function celsiusToDisplay(tempC: number, unit: "C" | "F"): number {
  return unit === "F" ? Math.round((tempC * 9) / 5 + 32) : Math.round(tempC);
}

export function displayToCelsius(val: number, unit: "C" | "F"): number {
  return unit === "F" ? Math.round(((val - 32) * 5) / 9) : Math.round(val);
}
