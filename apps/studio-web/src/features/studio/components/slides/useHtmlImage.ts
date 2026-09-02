import { useEffect, useState } from "react";

/**
 * Konva.Image needs a loaded CanvasImageSource, not a URL string — this
 * loads one from `src` (an http(s) URL, a resolved asset endpoint, or a
 * data: URL from a manual upload) and returns it once decoded, undefined
 * while pending/on error. No caching beyond React's own re-render — decks
 * are small enough (a handful of images per slide) that this is fine.
 */
export function useHtmlImage(src: string | undefined): HTMLImageElement | undefined {
  const [image, setImage] = useState<HTMLImageElement | undefined>(undefined);

  useEffect(() => {
    if (!src) {
      setImage(undefined);
      return;
    }
    let cancelled = false;
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (!cancelled) setImage(img);
    };
    img.onerror = () => {
      if (!cancelled) setImage(undefined);
    };
    img.src = src;
    return () => {
      cancelled = true;
    };
  }, [src]);

  return image;
}
