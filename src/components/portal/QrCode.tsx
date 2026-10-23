interface QrCodeProps {
  value: string;
  size?: number;
  className?: string;
}

/** Deterministic pseudo-QR SVG (finder rings + seeded module grid). */
export function QrCode({ value, size = 21, className }: QrCodeProps) {
  let seed = 2166136261;
  for (let i = 0; i < value.length; i++) {
    seed ^= value.charCodeAt(i);
    seed = Math.imul(seed, 16777619);
  }
  const rand = () => {
    seed = (Math.imul(seed, 1103515245) + 12345) % 2147483648;
    return seed / 2147483648;
  };

  const grid: boolean[][] = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => false)
  );
  const placeFinder = (row: number, col: number) => {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const rr = row + r;
        const cc = col + c;
        if (rr < 0 || cc < 0 || rr >= size || cc >= size) continue;
        const inRing = r >= 0 && r <= 6 && c >= 0 && c <= 6;
        const border =
          inRing && (r === 0 || r === 6 || c === 0 || c === 6);
        const core = inRing && r >= 2 && r <= 4 && c >= 2 && c <= 4;
        grid[rr]![cc]! = inRing ? border || core : false;
      }
    }
  };
  placeFinder(0, 0);
  placeFinder(0, size - 7);
  placeFinder(size - 7, 0);
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const inFinderZone =
        (r < 8 && c < 8) || (r < 8 && c >= size - 8) || (r >= size - 8 && c < 8);
      if (!inFinderZone) grid[r]![c]! = rand() < 0.44;
    }
  }

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={`QR code for ${value}`}
      className={className}
      shapeRendering="crispEdges"
    >
      <rect width={size} height={size} fill="white" rx="1" />
      {grid.map((row, r) =>
        row.map((on, c) =>
          on ? <rect key={`${r}-${c}`} x={c} y={r} width={1} height={1} fill="currentColor" /> : null
        )
      )}
    </svg>
  );
}
