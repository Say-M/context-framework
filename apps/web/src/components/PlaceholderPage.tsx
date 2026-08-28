export function PlaceholderPage({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="mt-2 text-[var(--bismo-text-muted)]">{description}</p>
      <div className="mt-6 rounded-lg border border-dashed border-[var(--bismo-border)] p-8 text-center text-sm text-[var(--bismo-text-muted)]">
        Coming in a later milestone.
      </div>
    </div>
  );
}
