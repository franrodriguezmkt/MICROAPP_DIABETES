export type AppIconName =
  | "week"
  | "shopping"
  | "recipes"
  | "resources"
  | "account";

type AppIconProps = {
  name: AppIconName;
  className?: string;
};

const paths: Record<AppIconName, React.ReactNode> = {
  week: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M8 3v4M16 3v4M3 10h18M8 14l2 2 5-5" />
    </>
  ),
  shopping: (
    <>
      <path d="M8 4h13M8 12h13M8 20h13" />
      <path d="m3 4 1.25 1.25L6.5 3M3 12l1.25 1.25L6.5 11M3 20l1.25 1.25L6.5 19" />
    </>
  ),
  recipes: (
    <>
      <path d="M7 3v8M4.5 3v4a2.5 2.5 0 0 0 5 0V3M7 11v10" />
      <path d="M16.5 3v18M16.5 3c3.2 1.6 4.5 4.3 4.5 7.5h-4.5" />
    </>
  ),
  resources: (
    <>
      <path d="M4 5.5A3.5 3.5 0 0 1 7.5 2H12v18H7.5A3.5 3.5 0 0 0 4 23.5z" />
      <path d="M20 5.5A3.5 3.5 0 0 0 16.5 2H12v18h4.5a3.5 3.5 0 0 1 3.5 3.5z" />
    </>
  ),
  account: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 21a7.5 7.5 0 0 1 15 0" />
    </>
  ),
};

export function AppIcon({ name, className }: AppIconProps) {
  return (
    <svg
      className={className}
      data-app-icon={name}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {paths[name]}
    </svg>
  );
}
