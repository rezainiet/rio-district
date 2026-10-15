export default function AdminLoading() {
  return (
    <div aria-busy="true" aria-label="Chargement">
      <div className="h-10 w-56 animate-pulse rounded bg-paper-2" />
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-[var(--radius-md)] bg-paper-2" />
        ))}
      </div>
      <div className="mt-6 h-72 animate-pulse rounded-[var(--radius-md)] bg-paper-2" />
    </div>
  );
}
