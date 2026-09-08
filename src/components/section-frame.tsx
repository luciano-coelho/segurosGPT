import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

interface SectionFrameProps {
  icon?: LucideIcon;
  title?: string;
  subtitle?: string;
  badge?: ReactNode;
  children: ReactNode;
}

/**
 * The double-layer composition: a neutral "mega frame" (--frame, one step
 * lighter than the page --background) wrapping each main section, with the
 * actual content sitting in its own white --surface card inside. Depth from
 * a light->lighter->lightest staircase, not from heavy shadow. Section
 * heading (icon/title/subtitle/badge) lives inside the frame, above the
 * content - not a separate element outside it.
 */
export function SectionFrame({ icon: Icon, title, subtitle, badge, children }: SectionFrameProps) {
  return (
    <div className="rounded-[28px] bg-frame p-3 sm:p-4">
      {title && (
        <div className="mb-3 flex items-start justify-between gap-3 px-1 pt-1">
          <div className="flex items-start gap-2.5">
            {Icon && (
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-accent-soft text-accent shadow-sm">
                <Icon className="h-4 w-4" strokeWidth={2.25} />
              </span>
            )}
            <div>
              <h2 className="text-sm font-semibold text-foreground">{title}</h2>
              {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
            </div>
          </div>
          {badge}
        </div>
      )}
      {children}
    </div>
  );
}
