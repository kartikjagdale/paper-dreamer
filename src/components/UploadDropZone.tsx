import { FileText, UploadCloud, X } from 'lucide-react';
import { useRef, useState } from 'react';

interface UploadDropZoneProps {
  pdfFile: File | null;
  onChange: (file: File | null) => void;
}

export function UploadDropZone({ pdfFile, onChange }: UploadDropZoneProps) {
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (pdfFile) {
    return (
      <div className="flex-grow flex flex-col items-center justify-center gap-3 border border-steel/30 bg-steel-light rounded-xl p-5 text-center">
        <div className="w-10 h-10 rounded-lg bg-white border border-border flex items-center justify-center shadow-[0_1px_2px_oklch(0.200_0.010_210/0.06)]">
          <FileText className="w-5 h-5 text-steel" />
        </div>
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-sm font-semibold text-ink leading-snug break-all px-2">{pdfFile.name}</span>
          <span className="text-xs text-muted">{(pdfFile.size / 1024 / 1024).toFixed(1)} MB</span>
        </div>
        <button
          onClick={() => onChange(null)}
          className="flex items-center gap-1.5 text-xs text-muted hover:text-red transition-colors font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-steel-ring rounded"
          aria-label="Remove selected file"
        >
          <X className="w-3 h-3" />
          Remove
        </button>
      </div>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Upload a PDF file"
      className={`flex-grow border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-6 text-center transition-all cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-steel-ring focus-visible:ring-offset-2 ${dragOver ? 'border-steel bg-steel-light scale-[1.01]' : 'border-border hover:border-steel/50 hover:bg-fog bg-fog/50'}`}
      onClick={() => fileInputRef.current?.click()}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && fileInputRef.current?.click()}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        if (e.dataTransfer.files[0]) onChange(e.dataTransfer.files[0]);
      }}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDragEnd={() => setDragOver(false)}
    >
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="application/pdf"
        onChange={(e) => e.target.files && onChange(e.target.files[0])}
      />
      <div className={`w-10 h-10 rounded-lg border flex items-center justify-center mb-3 transition-colors ${dragOver ? 'bg-steel text-white border-steel' : 'bg-white border-border text-muted'}`}>
        <UploadCloud className="w-5 h-5" />
      </div>
      <span className="text-sm font-medium text-ink leading-snug">
        {dragOver ? 'Drop to upload' : 'Click or drag PDF here'}
      </span>
      <span className="text-xs text-muted mt-1">Up to 15 MB</span>
    </div>
  );
}
