import React, { useRef, useState } from 'react';
import { Check, ImageIcon, Loader2, Palette, Upload, X, RotateCcw } from 'lucide-react';
import { projectsApi, Project } from '../../api/client';
import { cn } from '../../utils/cn';
import { COVER_COLORS, STOCK_COVERS } from '../../utils/projectStyle';
import { ProjectCover } from './ProjectCover';

// Uploads are stored inline with the project, so they are cropped to the cover's
// 2:1 shape and compressed here, keeping the request under the server's JSON limit.
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // what we accept from disk before resizing
const MAX_DATA_URL_CHARS = 90_000; // must match the backend check

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('That file could not be read as an image')); };
    img.src = url;
  });
}

async function fileToCover(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Please choose an image file (PNG, JPG, WebP or GIF)');
  if (file.size > MAX_UPLOAD_BYTES) throw new Error('That image is over 8 MB. Please pick a smaller one.');

  const img = await loadImage(file);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Your browser could not process the image');

  // Try progressively smaller sizes and qualities until it fits
  for (const width of [960, 720, 560, 420]) {
    const height = width / 2;
    canvas.width = width;
    canvas.height = height;
    // "object-fit: cover" crop from the centre
    const scale = Math.max(width / img.naturalWidth, height / img.naturalHeight);
    const w = img.naturalWidth * scale;
    const h = img.naturalHeight * scale;
    ctx.fillStyle = '#151713';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, (width - w) / 2, (height - h) / 2, w, h);

    for (const quality of [0.85, 0.75, 0.65, 0.55]) {
      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      if (dataUrl.length <= MAX_DATA_URL_CHARS) return dataUrl;
    }
  }
  throw new Error('That image is too detailed to use as a cover. Try a simpler one.');
}

type Tab = 'images' | 'colors' | 'upload';

interface CoverPickerModalProps {
  project: Project;
  onClose: () => void;
  onSaved: (project: Project) => void;
}

export function CoverPickerModal({ project, onClose, onSaved }: CoverPickerModalProps) {
  const initial = project.cover ?? null;
  const [draft, setDraft] = useState<string | null>(initial);
  const [tab, setTab] = useState<Tab>(
    initial?.startsWith('color:') ? 'colors' : initial?.startsWith('data:') ? 'upload' : 'images'
  );
  const [saving, setSaving] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setError('');
    setProcessing(true);
    try {
      setDraft(await fileToCover(file));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not use that image');
    } finally {
      setProcessing(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      // PATCH /api/projects/:projectId { cover }
      const updated = await projectsApi.update(project.id, { cover: draft });
      onSaved(updated);
    } catch (e: any) {
      setError(e?.message || 'Failed to save the cover');
      setSaving(false);
    }
  };

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'images', label: 'Images', icon: ImageIcon },
    { id: 'colors', label: 'Colors', icon: Palette },
    { id: 'upload', label: 'Upload', icon: Upload },
  ];

  const uploaded = draft?.startsWith('data:') ? draft : null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={() => !saving && onClose()} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Change project cover"
        className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto custom-scrollbar bg-[#151713] border border-[#D0E36A]/15 rounded-[28px] shadow-2xl shadow-black/60 p-5 sm:p-6 animate-rise"
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h3 className="text-xl font-semibold text-[#F4F5EF]">Change cover</h3>
            <p className="text-sm text-[#A1A69B] mt-0.5 truncate">{project.name}</p>
          </div>
          <button
            onClick={onClose}
            disabled={saving}
            className="w-9 h-9 rounded-full flex items-center justify-center text-[#A1A69B] hover:text-white hover:bg-white/5 transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Live preview */}
        <ProjectCover
          projectId={project.id}
          name={project.name}
          cover={draft}
          className="h-36 sm:h-40 rounded-[20px] border border-white/5"
          monogramClassName="left-5 bottom-4 text-4xl"
        >
          {processing && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <Loader2 size={24} className="animate-spin text-[#D0E36A]" />
            </div>
          )}
        </ProjectCover>

        {/* Tabs */}
        <div className="mt-5 flex items-center gap-1 p-1 rounded-full bg-[#0B0C0A] border border-white/5">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-full text-sm font-medium transition-colors',
                tab === t.id ? 'bg-[#D0E36A] text-[#0B0C0A]' : 'text-[#A1A69B] hover:text-white'
              )}
            >
              <t.icon size={14} /> {t.label}
            </button>
          ))}
        </div>

        <div className="mt-4 min-h-[180px]">
          {tab === 'images' && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {STOCK_COVERS.map(s => {
                const value = `stock:${s.id}`;
                const selected = draft === value;
                return (
                  <button
                    key={s.id}
                    onClick={() => setDraft(value)}
                    className={cn(
                      'group relative h-20 rounded-2xl overflow-hidden border-2 transition-all',
                      selected ? 'border-[#D0E36A] shadow-[0_0_20px_rgba(208,227,106,0.3)]' : 'border-transparent hover:border-white/20'
                    )}
                    title={s.label}
                  >
                    <img src={`/covers/${s.id}.svg`} alt="" className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                    <span className="absolute left-2 bottom-1.5 text-[11px] font-semibold text-white drop-shadow">{s.label}</span>
                    {selected && (
                      <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-[#D0E36A] text-[#0B0C0A] flex items-center justify-center">
                        <Check size={12} strokeWidth={3} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {tab === 'colors' && (
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2.5">
              {COVER_COLORS.map(c => {
                const value = `color:${c.hex}`;
                const selected = draft?.toLowerCase() === value.toLowerCase();
                return (
                  <button
                    key={c.hex}
                    onClick={() => setDraft(value)}
                    className={cn(
                      'relative h-14 rounded-2xl border-2 transition-all hover:scale-105',
                      selected ? 'border-[#F4F5EF] shadow-[0_0_18px_rgba(208,227,106,0.3)]' : 'border-white/5'
                    )}
                    style={{ backgroundColor: c.hex }}
                    title={c.label}
                    aria-label={c.label}
                  >
                    {selected && (
                      <span className="absolute inset-0 flex items-center justify-center">
                        <span className="w-6 h-6 rounded-full bg-[#0B0C0A]/70 text-white flex items-center justify-center">
                          <Check size={13} strokeWidth={3} />
                        </span>
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {tab === 'upload' && (
            <div>
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="hidden"
                onChange={e => { handleFile(e.target.files?.[0]); e.target.value = ''; }}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files?.[0]); }}
                className={cn(
                  'w-full h-40 rounded-[20px] border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-all',
                  dragOver ? 'border-[#D0E36A] bg-[#D0E36A]/5' : 'border-white/10 hover:border-[#D0E36A]/40 hover:bg-[#D0E36A]/[0.03]'
                )}
              >
                <span className="w-11 h-11 rounded-full bg-[#D0E36A]/10 text-[#D0E36A] flex items-center justify-center">
                  {processing ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
                </span>
                <span className="text-sm font-semibold text-[#F4F5EF]">
                  {uploaded ? 'Choose a different image' : 'Click to upload or drag an image here'}
                </span>
                <span className="text-xs text-[#6E7268]">PNG, JPG, WebP or GIF up to 8 MB. It is cropped to a wide banner.</span>
              </button>
            </div>
          )}
        </div>

        {error && (
          <div className="mt-3 p-3 text-sm text-red-400 bg-red-950/30 border border-red-900/50 rounded-xl">{error}</div>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setDraft(null)}
            disabled={saving || draft === null}
            className="inline-flex items-center gap-1.5 text-sm text-[#A1A69B] hover:text-white disabled:opacity-40 transition-colors mr-auto"
          >
            <RotateCcw size={14} /> Use default
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-5 py-2 rounded-full border border-white/10 text-sm font-medium text-[#A1A69B] hover:text-[#F4F5EF] hover:border-white/25 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || processing || draft === initial}
            className="inline-flex items-center gap-2 px-5 py-2 bg-[#D0E36A] text-[#0B0C0A] text-sm font-bold rounded-full hover:bg-[#BED158] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            {saving ? 'Saving…' : 'Save cover'}
          </button>
        </div>
      </div>
    </div>
  );
}
