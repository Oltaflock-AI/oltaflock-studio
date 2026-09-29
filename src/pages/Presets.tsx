import { AppShell } from '@/components/layout/AppShell';
import { StylesTab } from '@/components/presets/StylesTab';

/** Presets: pick a look or a camera move, then write whatever you like in it. */
export default function Presets() {
  return (
    <AppShell>
      <div className="flex w-full flex-col gap-4 px-4 pb-7 pt-5 sm:px-5">
        <header className="flex flex-col gap-0.5">
          <h1 className="font-serif text-[28px] font-medium leading-tight">Presets</h1>
          <p className="text-[13px] text-muted-foreground">Pick a look or a camera move, then write whatever you like. Star the ones you come back to.</p>
        </header>
        <StylesTab />
      </div>
    </AppShell>
  );
}
