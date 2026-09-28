"use client";

import { useRef, useState } from "react";
import { FileText, UploadCloud, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Input de archivo con área de arrastrar-y-soltar (además de clic para elegir). Mantiene un
 * <input type="file"> real y oculto para que el archivo viaje normal dentro del FormData del
 * formulario — arrastrar solo asigna dataTransfer.files a ese input.
 */
export function FileDropzone({
  name,
  accept,
  className,
  existingFileName,
}: {
  name: string;
  accept?: string;
  className?: string;
  /** Nombre del archivo ya subido previamente (modo edición), solo informativo. */
  existingFileName?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  function applyFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    if (inputRef.current) inputRef.current.files = files;
    setFileName(files[0].name);
  }

  function clearFile(e: React.MouseEvent) {
    e.stopPropagation();
    setFileName(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        applyFiles(e.dataTransfer.files);
      }}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-input bg-muted/30 px-3 py-5 text-center text-sm transition-colors hover:bg-muted/50",
        isDragging && "border-primary bg-primary/5",
        className
      )}
    >
      <input
        ref={inputRef}
        type="file"
        name={name}
        accept={accept}
        className="hidden"
        onChange={(e) => applyFiles(e.target.files)}
      />
      {fileName ? (
        <div className="flex max-w-full items-center gap-2 text-foreground">
          <FileText className="size-4 shrink-0" />
          <span className="max-w-[220px] truncate">{fileName}</span>
          <button
            type="button"
            onClick={clearFile}
            className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="size-3.5" />
            <span className="sr-only">Quitar archivo</span>
          </button>
        </div>
      ) : (
        <>
          <UploadCloud className="size-5 text-muted-foreground" />
          <p className="text-muted-foreground">
            <span className="font-medium text-foreground">Haz clic para subir</span> o arrastra un archivo aquí
          </p>
          {existingFileName && (
            <p className="text-xs text-muted-foreground">Actual: {existingFileName} (sube uno nuevo para reemplazarlo)</p>
          )}
        </>
      )}
    </div>
  );
}
