export default function SettingsLoading() {
  return (
    <div aria-busy="true" aria-label="Carregando configurações" className="flex flex-col gap-5">
      <div className="h-8 w-48 animate-pulse rounded bg-muted" />
      <div className="h-64 max-w-3xl animate-pulse rounded-[12px] bg-muted" />
    </div>
  );
}
