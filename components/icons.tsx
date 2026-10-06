import { useId, type SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

/** Four toe beans + a pad. Decorative by default. */
export function Paw({ size = 16, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <ellipse cx="5.2" cy="10.2" rx="2.3" ry="2.9" transform="rotate(-18 5.2 10.2)" />
      <ellipse cx="9.4" cy="5.6" rx="2.4" ry="3.1" transform="rotate(-6 9.4 5.6)" />
      <ellipse cx="14.6" cy="5.6" rx="2.4" ry="3.1" transform="rotate(6 14.6 5.6)" />
      <ellipse cx="18.8" cy="10.2" rx="2.3" ry="2.9" transform="rotate(18 18.8 10.2)" />
      <path d="M12 11.2c-2.9 0-6.3 3.4-6.3 6.3 0 2.1 1.6 3.3 3.4 3.3 1.2 0 1.9-.5 2.9-.5s1.7.5 2.9.5c1.8 0 3.4-1.2 3.4-3.3 0-2.9-3.4-6.3-6.3-6.3Z" />
    </svg>
  );
}

/** Instagram glyph. `color` uses the brand gradient (--ig-gradient); `mono` inherits currentColor. */
export function InstagramGlyph({ size = 20, variant = "mono", ...props }: IconProps & { variant?: "mono" | "color" }) {
  const id = useId();
  const stroke = variant === "color" ? `url(#${id})` : "currentColor";
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      {variant === "color" && (
        <defs>
          <linearGradient id={id} x1="2" y1="22" x2="22" y2="2" gradientUnits="userSpaceOnUse">
            <stop stopColor="#F58529" />
            <stop offset="0.5" stopColor="#DD2A7B" />
            <stop offset="1" stopColor="#8134AF" />
          </linearGradient>
        </defs>
      )}
      <rect x="2.75" y="2.75" width="18.5" height="18.5" rx="5.5" stroke={stroke} strokeWidth="2.2" />
      <circle cx="12" cy="12" r="4.2" stroke={stroke} strokeWidth="2.2" />
      <circle cx="17.4" cy="6.6" r="1.35" fill={stroke} />
    </svg>
  );
}

export function XGlyph({ size = 20, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M17.75 2.5h3.07l-6.7 7.66L22 21.5h-6.17l-4.83-6.32-5.53 6.32H2.4l7.17-8.2L2 2.5h6.33l4.37 5.77 5.05-5.77Zm-1.08 17.15h1.7L7.4 4.25H5.58l11.09 15.4Z" />
    </svg>
  );
}

export function SocialGlyph({ platform, size, variant }: { platform: "instagram" | "x"; size?: number; variant?: "mono" | "color" }) {
  return platform === "x" ? <XGlyph size={size} /> : <InstagramGlyph size={size} variant={variant} />;
}
