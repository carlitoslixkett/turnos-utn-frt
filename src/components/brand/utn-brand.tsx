import Image from "next/image";
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

export function UtnBrand({ size = "md", className }: UtnBrandProps) {
  const s = SIZES[size];
  const w = Math.round(s.h * (946 / 1111));
  return (
    <span
      className={cn("inline-flex items-center gap-2 font-bold text-[#E94A1F]", s.text, className)}
    >
      <span>UTN</span>
      <Image
        src="/utn-logo.gif"
        alt="Logo UTN"
        width={w}
        height={s.h}
        className="object-contain"
        unoptimized
      />
      <span>FRT</span>
    </span>
  );
}
