import { useParams } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';

// TODO(redesign): full-page generation detail — big media pane, prompt +
// params, download/regenerate/add-to-collection/delete, and a variations
// strip of sibling generations sharing this record's job_id.
export default function GenerationDetail() {
  const { id } = useParams<{ id: string }>();
  return (
    <AppShell>
      <div className="p-8 text-muted-foreground">Generation {id} — coming soon</div>
    </AppShell>
  );
}
