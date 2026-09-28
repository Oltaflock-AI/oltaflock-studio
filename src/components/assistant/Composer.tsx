import { useRef, useState, type KeyboardEvent } from 'react';
import { ArrowUp, Paperclip, Square, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { uploadFile } from '@/lib/storage';
import { useAuth } from '@/hooks/useAuth';
import type { Attachment } from '@/hooks/useAssistant';
import { cn } from '@/lib/utils';

interface ComposerProps {
  onSend: (text: string, attachments: Attachment[]) => void;
  onStop: () => void;
  isStreaming: boolean;
  /** One-click refinements shown once there is a draft. */
  quickActions: string[];
  placeholder: string;
}

export function Composer({ onSend, onStop, isStreaming, quickActions, placeholder }: ComposerProps) {
  const { user } = useAuth();
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const areaRef = useRef<HTMLTextAreaElement>(null);

  const submit = (value = text) => {
    const v = value.trim();
    if ((!v && !attachments.length) || isStreaming || uploading) return;
    onSend(v, attachments);
    setText('');
    setAttachments([]);
    requestAnimationFrame(() => areaRef.current?.focus());
  };

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  };

  const upload = async (files: FileList | null) => {
    if (!files?.length || !user) return;
    setUploading(true);
    try {
      const added: Attachment[] = [];
      for (const file of Array.from(files).slice(0, 6 - attachments.length)) {
        const kind = file.type.startsWith('video') ? 'video' : file.type.startsWith('audio') ? 'audio' : 'image';
        const ext = file.name.split('.').pop() || 'bin';
        const url = await uploadFile('uploads', user.id, `${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${ext}`, file);
        added.push({ url, kind });
      }
      setAttachments((a) => [...a, ...added]);
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[760px] px-6 pb-5">
      {quickActions.length > 0 && !isStreaming && (
        <div className="mb-2.5 flex flex-wrap gap-1.5">
          {quickActions.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => submit(q)}
              className="h-8 px-3 rounded-full border border-border bg-card text-[12.5px] text-foreground/80 hover:border-foreground/30 hover:text-foreground transition-smooth dark:bg-transparent"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      <div className="rounded-[16px] border border-border bg-card shadow-[0_1px_2px_hsl(240_10%_10%/0.04),0_12px_32px_-16px_hsl(240_10%_10%/0.18)] focus-within:border-primary/60 focus-within:ring-[3px] focus-within:ring-primary/15 transition-smooth dark:bg-secondary/40 dark:shadow-none">
        {(attachments.length > 0 || uploading) && (
          <div className="flex flex-wrap gap-2 px-3 pt-3">
            {attachments.map((a) => (
              <div key={a.url} className="relative h-16 w-16 rounded-[9px] overflow-hidden border border-border bg-secondary">
                {a.kind === 'image' ? <img src={a.url} alt="" className="h-full w-full object-cover" /> : <video src={a.url} muted className="h-full w-full object-cover" />}
                <button type="button" onClick={() => setAttachments((l) => l.filter((x) => x.url !== a.url))} aria-label="Remove attachment" className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/60 text-white flex items-center justify-center">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            {uploading && <div className="h-16 w-16 rounded-[9px] border border-dashed border-border flex items-center justify-center"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>}
          </div>
        )}
        <textarea
          ref={areaRef}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            e.target.style.height = 'auto';
            e.target.style.height = `${Math.min(e.target.scrollHeight, 220)}px`;
          }}
          onKeyDown={onKey}
          rows={1}
          placeholder={placeholder}
          aria-label="Message"
          className="block w-full resize-none bg-transparent px-4 pt-3.5 pb-2 text-[15px] leading-relaxed outline-none placeholder:text-muted-foreground/70"
        />
        <div className="flex items-center justify-between px-2.5 pb-2.5">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading || attachments.length >= 6}
            className="h-8 px-2.5 inline-flex items-center gap-1.5 rounded-[8px] text-[13px] text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-50 transition-smooth"
            title="Attach reference images or video"
          >
            <Paperclip className="h-4 w-4" /> Reference
          </button>
          <input ref={fileRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={(e) => { upload(e.target.files); e.target.value = ''; }} />
          {isStreaming ? (
            <button type="button" onClick={onStop} aria-label="Stop" className="h-9 w-9 rounded-full bg-foreground text-background flex items-center justify-center">
              <Square className="h-3.5 w-3.5 fill-current" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => submit()}
              disabled={(!text.trim() && !attachments.length) || uploading}
              aria-label="Send"
              className={cn(
                'h-9 w-9 rounded-full flex items-center justify-center transition-smooth',
                'bg-foreground text-background hover:bg-foreground/90 disabled:bg-secondary disabled:text-muted-foreground',
              )}
            >
              <ArrowUp className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
      <p className="mt-2 text-center text-[11.5px] text-muted-foreground">Enter to send · Shift+Enter for a new line</p>
    </div>
  );
}
