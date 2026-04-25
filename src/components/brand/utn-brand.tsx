import { cn } from "@/lib/utils";

interface UtnBrandProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZES = {
  sm: { h: 22, text: "text-base" },
  md: { h: 28, text: "text-xl" },
  lg: { h: 38, text: "text-3xl" },
};

function UtnSymbol({ height }: { height: number }) {
  const w = Math.round(height * (60 / 84));
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 60 84"
      width={w}
      height={height}
      fill="none"
      aria-hidden
    >
      <g stroke="currentColor" strokeWidth="7" strokeLinecap="round">
        <line x1="30" y1="5" x2="30" y2="79" />
        <line x1="10" y1="13" x2="50" y2="13" />
        <circle cx="30" cy="46" r="17" />
        <line x1="4" y1="46" x2="56" y2="46" />
      </g>
    </svg>
  );
}

export function UtnBrand({ size = "md", className }: UtnBrandProps) {
  const s = SIZES[size];
  return (
    <span
      className={cn("inline-flex items-center gap-2 font-bold text-[#E94A1F]", s.text, className)}
    >
      <span>UTN</span>
      <UtnSymbol height={s.h} />
      <span>FRT</span>
    </span>
  );
}
