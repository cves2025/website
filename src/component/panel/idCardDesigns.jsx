// Professional ID card design variants - each category can use its own,
// and users can switch between them.

export const ID_CARD_DESIGNS = [
  {
    id: "classic",
    name: "Classic",
    desc: "Traditional portrait school card with blue band & barcode.",
    swatch: "bg-gradient-to-b from-blue-800 to-blue-600",
    default: true,
  },
  {
    id: "modern",
    name: "Modern",
    desc: "Clean horizontal badge with a bold side strip.",
    swatch: "bg-gradient-to-b from-green-600 to-green-500",
  },
  {
    id: "premium",
    name: "Premium",
    desc: "Elegant dark navy card with gold accents.",
    swatch: "bg-gradient-to-b from-gray-900 to-gray-700",
  },
  {
    id: "vibrant",
    name: "Vibrant",
    desc: "Colorful, playful gradient with rounded shapes.",
    swatch: "bg-gradient-to-br from-pink-500 via-red-500 to-amber-400",
  },
];

export function getDesign(id) {
  return ID_CARD_DESIGNS.find((d) => d.id === id) || ID_CARD_DESIGNS[0];
}

// Simple barcode bars (pure CSS) so cards look realistic.
export function Barcode({ className = "" }) {
  const bars = [
    2, 1, 3, 1, 2, 2, 1, 3, 1, 2, 3, 1, 1, 2, 2, 1, 3, 2, 1, 1, 2, 3, 1, 2, 1,
    3, 2, 2, 1, 1, 3, 1, 2, 2, 1, 3, 1, 2, 1, 3, 2, 1,
  ];
  return (
    <div className={`flex items-stretch gap-[2px] ${className}`}>
      {bars.map((w, i) => (
        <span
          key={i}
          style={{ width: `${w}px` }}
          className="bg-current opacity-80"
        />
      ))}
    </div>
  );
}