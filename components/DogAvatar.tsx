import Image from "next/image";
import { dogAlt, dogBlur, getDog } from "@/lib/dogs";
import { cx } from "@/lib/format";
import { InstagramGlyph } from "@/components/icons";

/** Organic egg/blob outline used for the hero toe-beans and other "bubble" photos. */
export const BLOB_RADIUS = "58% 42% 52% 48% / 55% 50% 50% 45%";

const RINGS = {
  gold: "ring-[6px] ring-yellow",
  silver: "ring-[6px] ring-silver",
  bronze: "ring-[6px] ring-bronze-soft",
} as const;

export type DogAvatarProps = {
  dogId: string;
  size: number;
  shape?: "circle" | "blob" | "rounded";
  ring?: keyof typeof RINGS;
  badge?: "instagram";
  /** above-the-fold images load eagerly */
  priority?: boolean;
  /** dim + desaturate eliminated dogs */
  muted?: boolean;
  className?: string;
  imgClassName?: string;
};

export function DogAvatar({
  dogId, size, shape = "circle", ring, badge, priority, muted, className, imgClassName,
}: DogAvatarProps) {
  const dog = getDog(dogId);
  const radius = shape === "circle" ? "50%" : shape === "blob" ? BLOB_RADIUS : "16px";
  return (
    <span className={cx("relative inline-block shrink-0", className)} style={{ width: size, height: size }}>
      <span
        className={cx("group/avatar block size-full overflow-hidden bg-bg-soft", ring && RINGS[ring])}
        style={{ borderRadius: radius }}
      >
        <Image
          src={dog.image}
          alt={dogAlt(dog)}
          width={size}
          height={size}
          sizes={`${size}px`}
          priority={priority}
          placeholder={dogBlur(dogId) ? "blur" : "empty"}
          blurDataURL={dogBlur(dogId)}
          className={cx(
            "size-full object-cover transition-transform duration-250 ease-out-soft group-hover/avatar:scale-105",
            muted && "grayscale-[60%] opacity-90",
            shape !== "circle" && "dog-photo-fill",
            imgClassName,
          )}
        />
      </span>
      {badge === "instagram" && (
        <span
          className="absolute -right-1 -bottom-1 grid place-items-center rounded-[7px] bg-white shadow-soft"
          style={{ width: Math.max(18, size * 0.28), height: Math.max(18, size * 0.28) }}
        >
          <InstagramGlyph variant="color" size={Math.max(12, size * 0.2)} />
        </span>
      )}
    </span>
  );
}
