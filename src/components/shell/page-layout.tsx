import type { ReactNode } from "react";
import { cn } from "../ui/primitives";

/**
 * Main column + right-hand Schedule panel (≥1280px); panel drops below main under 1280px.
 * `asideHidden` slides the panel off to the right and lets the main column take the
 * full width (used while the big calendar is open).
 */
export function PageWithAside({
  children,
  aside,
  asideClassName,
  asideHidden = false,
}: {
  children: ReactNode;
  aside?: ReactNode;
  asideClassName?: string;
  asideHidden?: boolean;
}) {
  return (
    <div
      className={cn(
        "overflow-x-clip px-4 pb-10 md:px-8 xl:grid xl:px-9 xl:transition-[grid-template-columns,column-gap] xl:duration-500 xl:ease-out",
        asideHidden
          ? "xl:grid-cols-[minmax(0,1fr)_0px] xl:gap-x-0"
          : "xl:grid-cols-[minmax(0,1fr)_340px] xl:gap-x-6 2xl:grid-cols-[minmax(0,1fr)_380px]",
      )}
    >
      <div className="flex min-w-0 flex-col gap-5">{children}</div>
      {aside && (
        <aside
          aria-label="Schedule"
          inert={asideHidden}
          className={cn(
            "mt-5 transition-[translate,opacity] duration-500 ease-out xl:sticky xl:top-6 xl:mt-0 xl:w-[340px] xl:self-start 2xl:w-[380px]",
            asideClassName,
            asideHidden && "max-xl:hidden xl:translate-x-[120%] xl:opacity-0",
          )}
        >
          {aside}
        </aside>
      )}
    </div>
  );
}

export function PageBody({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-5 px-4 pb-10 md:px-8 xl:px-9">{children}</div>;
}
