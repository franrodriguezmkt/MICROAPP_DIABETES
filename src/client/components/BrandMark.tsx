type BrandMarkProps = {
  className?: string;
};

export function BrandMark({ className }: BrandMarkProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 48 48"
      aria-hidden="true"
      focusable="false"
    >
      <rect className="brand-mark__tile" x="3" y="3" width="42" height="42" rx="14" />
      <path className="brand-mark__calendar" d="M15 11v6M33 11v6M11 20h26" />
      <circle className="brand-mark__plate" cx="23" cy="28" r="9.25" />
      <path
        className="brand-mark__leaf"
        d="M29.25 23.25c5.35-5.15 9.85-3.7 10.55-3.45-.15 4.6-2.85 8.35-9.8 8.7"
      />
    </svg>
  );
}
