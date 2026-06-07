'use client';

import { File as FileIcon, ImageIcon, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface FileDropzoneProps {
  file: File | null;
  accept: string;
  disabled?: boolean;
  onFile: (file: File) => void;
}

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileDropzone({ file, accept, disabled, onFile }: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const openPicker = () => {
    inputRef.current?.click();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0];
    if (picked) onFile(picked);
    // Allow re-selecting the same file to fire change again.
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) onFile(dropped);
  };

  const handleDragOver = (e: React.DragEvent<HTMLButtonElement>) => {
    e.preventDefault();
  };

  const handleDragEnter = (e: React.DragEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const isImage = file?.type.startsWith('image/') ?? false;

  return (
    <div className="relative">
      {/* Sibling of the button (not a descendant): a <button> cannot contain
          interactive content like <input>. Click is triggered via inputRef. */}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleInputChange}
        disabled={disabled}
        className="hidden"
      />
      <button
        type="button"
        disabled={disabled}
        aria-label="파일 선택 또는 드래그 앤 드롭"
        onClick={openPicker}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'flex w-full flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed bg-muted/30 px-4 py-8 text-center transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-muted/50',
          isDragging && 'border-primary bg-primary/5',
        )}
      >
        {file ? (
          <>
            {isImage ? (
              <ImageIcon className="size-6 text-muted-foreground" aria-hidden />
            ) : (
              <FileIcon className="size-6 text-muted-foreground" aria-hidden />
            )}
            <div className="space-y-0.5">
              <p className="break-all text-sm font-medium">{file.name}</p>
              <p className="text-xs text-muted-foreground">{formatSize(file.size)}</p>
            </div>
            <p className="text-xs text-muted-foreground">다른 파일 선택</p>
          </>
        ) : (
          <>
            <Upload className="size-6 text-muted-foreground" aria-hidden />
            <div className="space-y-0.5">
              <p className="text-sm font-medium">파일을 드래그하거나 클릭하세요</p>
              <p className="text-xs text-muted-foreground">단일 파일만 업로드됩니다</p>
            </div>
          </>
        )}
      </button>
    </div>
  );
}
