import Link from "next/link";
import { ArrowRight, Camera } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { cx } from "@/lib/format";

/**
 * The single solid yellow CTA: one element, one fill, one radius —
 * the icon sits directly on the yellow. No inner pill, border or icon chip.
 */
type Common = {
  variant?: "primary" | "primary-stacked" | "outline";
  size?: "md" | "nav";
  /** primary-stacked only */
  subLabel?: ReactNode;
  /** icon-only (mobile navbar); `children` becomes the accessible label */
  iconOnly?: boolean;
  className?: string;
  children: ReactNode;
};
type AsLink = Common & { href: string } & Omit<ComponentProps<typeof Link>, "href" | "className" | "children">;
type AsButton = Common & { href?: undefined } & Omit<ComponentProps<"button">, "className" | "children">;

export function CTAButton(props: AsLink | AsButton) {
  const { variant = "primary", size = "md", subLabel, iconOnly, className, children, ...rest } = props;
  const stacked = variant === "primary-stacked";

  const classes = cx(
    "group/cta relative inline-flex select-none items-center justify-center whitespace-nowrap rounded-full font-semibold text-ink",
    "transition-[background-color,transform,box-shadow] duration-150 ease-out-soft",
    "hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]",
    "aria-disabled:pointer-events-none aria-disabled:opacity-50 disabled:pointer-events-none disabled:opacity-50",
    variant === "outline"
      ? "border border-ink/15 bg-surface hover:bg-bg-soft hover:shadow-soft"
      : "bg-yellow shadow-soft hover:bg-yellow-hover hover:shadow-lift",
    iconOnly
      ? size === "nav" ? "size-12" : "size-14"
      : stacked
        ? cx("gap-4 text-left", size === "nav" ? "h-14 px-6" : "h-[72px] px-8")
        : cx("gap-3 text-[17px]", size === "nav" ? "h-12 px-7" : "h-14 px-7"),
    className,
  );

  const body = stacked ? (
    <>
      <Camera
        aria-hidden
        strokeWidth={1.9}
        className={cx(size === "nav" ? "size-7" : "size-9", "shrink-0 group-hover/cta:animate-[shutter_220ms_ease-out]")}
      />
      {!iconOnly && (
        <span className="flex flex-col leading-tight">
          <span className={size === "nav" ? "text-[17px] font-bold" : "text-[22px] font-bold tracking-[-0.01em]"}>
            {children}
          </span>
          {subLabel && (
            <span className={cx("font-normal text-ink-2", size === "nav" ? "text-[13px]" : "text-[15px]")}>{subLabel}</span>
          )}
        </span>
      )}
      {iconOnly && <span className="sr-only">{children}</span>}
    </>
  ) : (
    <>
      {iconOnly ? <span className="sr-only">{children}</span> : <span>{children}</span>}
      <ArrowRight
        aria-hidden
        strokeWidth={2.2}
        className="size-5 shrink-0 transition-transform duration-150 ease-out-soft group-hover/cta:translate-x-1"
      />
    </>
  );

  if (props.href !== undefined) {
    const { href, ...linkRest } = rest as Omit<AsLink, keyof Common>;
    return (
      <Link href={href} className={classes} {...linkRest}>
        {body}
      </Link>
    );
  }
  const buttonRest = rest as Omit<AsButton, keyof Common>;
  return (
    <button type="button" className={classes} {...buttonRest}>
      {body}
    </button>
  );
}
