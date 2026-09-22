import { AppShell } from '@/components/layout/AppShell';

// TODO(redesign): chat UI calling the `model-assistant` edge function
// (Claude, system-prompted with the real MODEL_FAMILIES registry + pricing),
// plus a static model cheat-sheet sidebar built from src/config/models.ts.
export default function Assistant() {
  return (
    <AppShell>
      <div className="p-8 text-muted-foreground">Assistant — coming soon</div>
    </AppShell>
  );
}
