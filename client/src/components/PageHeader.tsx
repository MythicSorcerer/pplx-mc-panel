import { ReactNode } from "react";
interface Props { eyebrow?: string; title: string; children?: ReactNode; }
export function PageHeader({ eyebrow = "Minecraft panel", title, children }: Props) {
  return (
    <header className="border-b border-white/8 px-4 lg:px-8 py-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between flex-shrink-0">
      <div>
        <p className="text-[10px] uppercase tracking-[0.3em] text-moss">{eyebrow}</p>
        <h1 className="text-2xl lg:text-3xl font-extrabold mt-1">{title}</h1>
      </div>
      {children && <div className="flex flex-wrap items-center gap-3">{children}</div>}
    </header>
  );
}
