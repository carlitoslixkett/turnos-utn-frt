import Image from "next/image";
import { cn } from "@/lib/utils";

interface UtnBrandProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZES = {
  sm: { logo: 22, text: "text-base" },
  md: { logo: 28, text: "text-lg" },
  lg: { logo: 34, text: "text-xl" },
};

export function UtnBrand({ size = "md", className }: UtnBrandProps) {
  const s = SIZES[size];
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 font-bold text-[#E94A1F]", s.text, className)}
    >
      <span>UTN</span>
      <Image
        src="/utn-logo.svg"
        alt=""
        width={s.logo}
        height={s.logo}
        aria-hidden
        className="shrink-0"
      />
      <span>FRT</span>
    </span>
  );
}
