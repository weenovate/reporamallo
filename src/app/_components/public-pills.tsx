import Link from 'next/link';
import { X } from 'lucide-react';

type Pill = { label: string; count: number; removeUrl: string };

export function Pills({ items }: { items: Pill[] }) {
  if (items.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {items.map((p, i) => (
        <span
          key={`${p.label}-${i}`}
          className="inline-flex items-center gap-1.5 rounded-full border bg-card pl-3 pr-1 py-1 text-sm shadow-sm"
        >
          <span className="font-medium">{p.label}</span>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{p.count}</span>
          <Link
            href={p.removeUrl}
            aria-label="Quitar filtro"
            className="ml-1 rounded-full p-1 hover:bg-muted text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </Link>
        </span>
      ))}
    </div>
  );
}
