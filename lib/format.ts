const intl = new Intl.NumberFormat("en-IN");

/** 2822 → "2,822" */
export const fmt = (n: number) => intl.format(n);

/** 39.7 → "39.7%", 4 → "4%" (matches the source, which drops a trailing .0) */
export const pct = (n: number) => `${Number.isInteger(n) ? n : n.toFixed(1)}%`;

export const stripAt = (s: string) => s.trim().replace(/^@+/, "").toLowerCase();

export const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(" ");
