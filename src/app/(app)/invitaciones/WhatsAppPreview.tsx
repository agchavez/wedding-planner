"use client";

import { Fragment, type ReactNode } from "react";
import { CheckCheck } from "lucide-react";

/** Aplica el formato de WhatsApp (*negrita*, _cursiva_, ~tachado~) y resalta los enlaces. */
function formatLine(line: string, key: number): ReactNode {
  const parts = line.split(/(https?:\/\/\S+|\*[^*\n]+\*|_[^_\n]+_|~[^~\n]+~)/g);
  return (
    <Fragment key={key}>
      {parts.map((part, i) => {
        if (/^https?:\/\//.test(part)) {
          return (
            <span key={i} className="break-all text-[#027eb5]">
              {part}
            </span>
          );
        }
        if (/^\*[^*]+\*$/.test(part)) return <strong key={i}>{part.slice(1, -1)}</strong>;
        if (/^_[^_]+_$/.test(part)) return <em key={i}>{part.slice(1, -1)}</em>;
        if (/^~[^~]+~$/.test(part)) return <s key={i}>{part.slice(1, -1)}</s>;
        return <Fragment key={i}>{part}</Fragment>;
      })}
    </Fragment>
  );
}

export type LinkPreview = { image: string; title: string; description: string; domain: string };

/** Burbuja de mensaje saliente de WhatsApp, con la tarjeta de vista previa del enlace. */
export function WhatsAppBubble({ text, preview, time = "10:24" }: { text: string; preview?: LinkPreview | null; time?: string }) {
  const lines = text.split("\n");
  return (
    <div className="ml-auto w-fit max-w-[92%] rounded-lg rounded-tr-none bg-[#d9fdd3] p-1 text-[0.9rem] leading-snug text-[#111b21] shadow-[0_1px_0.5px_rgba(11,20,26,0.13)]">
      {preview && (
        <div className="mb-1 overflow-hidden rounded-md bg-[#cfeec7]">
          {/* eslint-disable-next-line @next/next/no-img-element -- imagen generada por la propia app */}
          <img src={preview.image} alt="" className="aspect-[1200/630] w-full object-cover" />
          <div className="px-2.5 py-1.5">
            <p className="line-clamp-2 text-[0.85rem] font-medium">{preview.title}</p>
            <p className="line-clamp-2 text-[0.75rem] text-[#54656f]">{preview.description}</p>
            <p className="mt-0.5 text-[0.7rem] text-[#667781]">{preview.domain}</p>
          </div>
        </div>
      )}
      <div className="px-1.5 pt-0.5 pb-1 whitespace-pre-wrap">
        {lines.map((line, i) => (
          <Fragment key={i}>
            {formatLine(line, i)}
            {i < lines.length - 1 && "\n"}
          </Fragment>
        ))}
        <span className="float-right mt-1.5 ml-3 flex items-center gap-0.5 text-[0.65rem] text-[#667781]">
          {time}
          <CheckCheck className="size-3.5 text-[#53bdeb]" />
        </span>
      </div>
    </div>
  );
}

/** Teléfono con el chat de WhatsApp tal como lo verá el invitado. */
export function WhatsAppPhone({ contactName, children }: { contactName: string; children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[22rem] overflow-hidden rounded-[2.2rem] border-[10px] border-[#1f2328] bg-[#1f2328] shadow-2xl">
      <div className="flex items-center gap-3 bg-[#008069] px-3 py-2.5 text-white">
        <span className="flex size-8 items-center justify-center rounded-full bg-white/25 text-xs font-semibold">
          {contactName
            .split(/\s+/)
            .slice(0, 2)
            .map((p) => p[0])
            .join("")
            .toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{contactName}</p>
          <p className="text-[0.65rem] text-white/75">en línea</p>
        </div>
      </div>
      <div
        className="min-h-[26rem] space-y-2 bg-[#efeae2] p-3"
        style={{
          backgroundImage: "radial-gradient(rgba(0,0,0,0.035) 1px, transparent 1px)",
          backgroundSize: "14px 14px",
        }}
      >
        <p className="mx-auto w-fit rounded-md bg-white/90 px-2 py-0.5 text-[0.65rem] text-[#54656f] shadow-sm">HOY</p>
        {children}
      </div>
    </div>
  );
}
