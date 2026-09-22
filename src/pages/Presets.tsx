import { AppShell } from '@/components/layout/AppShell';

// TODO(redesign): curated + saved prompt_library_items, grouped by category,
// with a featured banner and hover-to-use cards. Reuses usePromptLibrary —
// this is a restyle of existing data, not a new backend feature.
export default function Presets() {
  return (
    <AppShell>
      <div className="p-8 text-muted-foreground">Presets — coming soon</div>
    </AppShell>
  );
}
