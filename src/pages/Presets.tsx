import { AppShell } from '@/components/layout/AppShell';
import { StylesTab } from '@/components/presets/StylesTab';

/** Presets: pick a look or a camera move to write with, or a photo edit to run on your own image. */
export default function Presets() {
  return (
    <AppShell>
      <div className="flex w-full flex-col gap-4 px-4 pb-7 pt-5 sm:px-5">
        <header className="flex flex-col gap-0.5">
          <h1 className="font-serif text-[28px] font-medium leading-tight">Presets</h1>
          <p className="text-[13px] text-muted-foreground">PROMUNCH looks and ad moves come first: pick one and every Create prompt follows it. Or bring a photo and pick an edit: remove background, upscale for print, product shots and more.</p>
        </header>
        <StylesTab />
      </div>
    </AppShell>
  );
}
