/**
 * Bowties — a person's emblem in place of a photo: a face (an emoji or an
 * uploaded image), a backdrop colour and a one-line caption.
 *
 * Plain data and validation only, so the shape can move to a backend
 * unchanged. Rendering is src/components/Bowtie.jsx.
 *
 *   Bowtie { emoji: string, image: dataURL | null, backdrop: "#rrggbb", caption: string }
 *
 * When `image` is set it is the face; `emoji` is kept as the fallback.
 */

export const BACKDROPS = [
  { id: "brass", hex: "#c6a03c", label: "Brass" },
  { id: "claret", hex: "#8e1f2b", label: "Claret" },
  { id: "rose", hex: "#d98e8a", label: "Rose" },
  { id: "amber", hex: "#d5813b", label: "Amber" },
  { id: "jade", hex: "#3f8f6b", label: "Jade" },
  { id: "slate", hex: "#4f7896", label: "Slate" },
  { id: "plum", hex: "#6e4c8a", label: "Plum" },
  { id: "ivory", hex: "#f3eee2", label: "Ivory" },
];

export const EMOJI_PICKS = [
  "🙂", "🌙", "🔥", "🌿", "🎻", "🐝", "🧭", "🍋",
  "🦊", "🌊", "🎲", "🪐", "🍷", "📚", "🐈", "⛰️",
  "🎨", "☕", "🌻", "🦉", "⚓", "🧵", "🎧", "🕯️",
];

export const CAPTION_MAX = 60;

// Uploaded faces are cropped square and scaled down before they are held in
// memory. The knot is under 80px across at its largest, so more is waste.
const IMAGE_SIZE = 256;

export const DEFAULT_BOWTIE = {
  emoji: "🙂", image: null, backdrop: BACKDROPS[0].hex, caption: "",
};

/** A seeded bowtie, by backdrop id. */
export function tie(emoji, backdrop, caption) {
  return { emoji, image: null, backdrop: BACKDROPS.find((b) => b.id === backdrop).hex, caption };
}

/** The first grapheme of `text` if it is an emoji, otherwise null. */
export function firstEmoji(text) {
  const s = (text || "").trim();
  if (!s) return null;
  const g = Intl.Segmenter
    ? [...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(s)][0].segment
    : Array.from(s)[0];
  return /\p{Extended_Pictographic}|\p{Regional_Indicator}/u.test(g) ? g : null;
}

/** Reads an image file into a square, downscaled PNG data URL. */
export function readFaceImage(file) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith("image/")) {
      reject(new Error("That file is not an image."));
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const side = Math.min(img.naturalWidth, img.naturalHeight);
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = IMAGE_SIZE;
      canvas.getContext("2d").drawImage(img,
        (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side,
        0, 0, IMAGE_SIZE, IMAGE_SIZE);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("That image could not be read."));
    };
    img.src = url;
  });
}
