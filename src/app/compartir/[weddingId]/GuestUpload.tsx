"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Check, ImagePlus, Loader2, Play, RotateCw, X } from "lucide-react";
import { Fonts, Lightbox, photo } from "@/app/propuestas/shared";
import { GUEST_MAX_BYTES, driveThumb } from "./constants";

const SERIF = "'Bodoni Moda', 'Didot', serif";
const SANS = "'Inter', system-ui, sans-serif";
const C = { bg: "#f2eee3", ink: "#343a26", muted: "#757359", line: "#d9d4c1", accent: "#a8996a", deep: "#3d4529", card: "#fbf9f3" };

/** Boda de Angel e Indira: usa una foto de su sesión como portada. */
const HERO_BY_WEDDING: Record<string, string> = { "6ab8b4cfac4dc16342704a50": photo("c-sombrilla") };

type Shot = { id: string; driveFileId: string; type: string; by: string; src?: string };
type Job = { key: string; file: File; preview: string | null; progress: number; status: "queued" | "uploading" | "done" | "error"; error?: string };

const NAME_KEY = "compartir:nombre";
const CONCURRENCY = 2;

function formatDate(iso: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${dd} · ${mm} · ${d.getUTCFullYear()}`;
}

function upload(weddingId: string, job: Job, name: string, onProgress: (p: number) => void) {
  return new Promise<{ driveFileId: string; type: string }>((resolve, reject) => {
    const body = new FormData();
    body.append("file", job.file);
    body.append("name", name);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `/api/compartir/${weddingId}`);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onload = () => {
      let data: { error?: string; driveFileId?: string; type?: string } = {};
      try {
        data = JSON.parse(xhr.responseText);
      } catch {}
      if (xhr.status >= 200 && xhr.status < 300 && data.driveFileId) resolve({ driveFileId: data.driveFileId, type: data.type ?? "image" });
      else reject(new Error(data.error || (xhr.status === 413 ? "El archivo es muy pesado." : "No se pudo subir.")));
    };
    xhr.onerror = () => reject(new Error("Sin conexión. Revisa tu internet."));
    xhr.send(body);
  });
}

export function GuestUpload({
  weddingId,
  partner1,
  partner2,
  dateIso,
  enabled,
  initial,
}: {
  weddingId: string;
  partner1: string;
  partner2: string;
  dateIso: string | null;
  enabled: boolean;
  initial: Shot[];
}) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [shots, setShots] = useState<Shot[]>(initial);
  const [lb, setLb] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const queue = useRef<Job[]>([]);
  const running = useRef(0);

  const hero = HERO_BY_WEDDING[weddingId];
  const date = formatDate(dateIso);
  const initials = [partner1, partner2].filter(Boolean).map((n) => n[0]?.toUpperCase());

  // El nombre se recuerda en este celular para no escribirlo en cada visita.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(NAME_KEY);
      if (saved && nameRef.current && !nameRef.current.value) nameRef.current.value = saved;
    } catch {}
  }, []);

  function rememberName(value: string) {
    try {
      localStorage.setItem(NAME_KEY, value.trim());
    } catch {}
  }

  const patch = (key: string, change: Partial<Job>) => setJobs((all) => all.map((j) => (j.key === key ? { ...j, ...change } : j)));

  // Cola: sube de a dos archivos para no saturar los datos del celular.
  function pump() {
    while (running.current < CONCURRENCY && queue.current.length > 0) {
      const job = queue.current.shift()!;
      const name = nameRef.current?.value.trim().slice(0, 60) ?? "";
      running.current += 1;
      patch(job.key, { status: "uploading", progress: 0 });
      upload(weddingId, job, name, (p) => patch(job.key, { progress: p }))
        .then((res) => {
          patch(job.key, { status: "done", progress: 1 });
          setShots((all) => [
            { id: job.key, driveFileId: res.driveFileId, type: res.type, by: name || "Anónimo", src: job.preview ?? undefined },
            ...all,
          ]);
        })
        .catch((error: Error) => patch(job.key, { status: "error", error: error.message }))
        .finally(() => {
          running.current -= 1;
          pump();
        });
    }
  }

  function enqueue(list: Job[]) {
    queue.current.push(...list.filter((j) => j.status === "queued"));
    pump();
  }

  function retry(job: Job) {
    patch(job.key, { status: "queued", error: undefined });
    enqueue([{ ...job, status: "queued" }]);
  }

  function addFiles(list: FileList | null) {
    if (!list?.length) return;
    const added: Job[] = Array.from(list).map((file, i) => {
      const valid = file.type.startsWith("image/") || file.type.startsWith("video/");
      const tooBig = file.size > GUEST_MAX_BYTES;
      return {
        key: `${Date.now()}-${i}-${file.name}`,
        file,
        preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
        progress: 0,
        status: valid && !tooBig ? "queued" : "error",
        error: !valid ? "Solo fotos o videos." : tooBig ? "Muy pesado (máx. 24 MB)." : undefined,
      };
    });
    setJobs((all) => [...added, ...all]);
    enqueue(added);
    if (inputRef.current) inputRef.current.value = "";
  }

  const done = jobs.filter((j) => j.status === "done").length;
  const pending = jobs.filter((j) => j.status === "queued" || j.status === "uploading").length;
  const images = shots.map((s) => s.src ?? driveThumb(s.driveFileId, 2000));

  return (
    <div style={{ background: C.bg, color: C.ink, fontFamily: SANS }} className="min-h-svh overflow-x-clip">
      <Fonts families="family=Bodoni+Moda:ital,opsz,wght@0,6..96,400..700;1,6..96,400..700&family=Inter:wght@300;400;500;600" />

      {/* Portada */}
      <header className="relative flex min-h-[62svh] flex-col items-center justify-end overflow-hidden px-6 pb-10 text-center text-[#f2eee3]">
        {hero ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={hero} alt="" className="absolute inset-0 size-full object-cover object-[50%_35%]" />
        ) : (
          <div className="absolute inset-0" style={{ background: `radial-gradient(circle at 50% 20%, #5a6638, ${C.deep})` }} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#262b19]/90 via-[#262b19]/35 via-55% to-[#262b19]/10" />
        <div className="relative">
          {initials.length > 0 && (
            <p style={{ fontFamily: SERIF }} className="text-5xl italic">
              {initials[0]}
              {initials[1] && (
                <>
                  {" "}
                  <span className="text-[#cdbb86]">&amp;</span> {initials[1]}
                </>
              )}
            </p>
          )}
          <h1 style={{ fontFamily: SERIF }} className="mt-4 text-[2.6rem] leading-[1.05] sm:text-6xl">
            Comparte tus fotos
            <br />
            <span className="italic">con nosotros</span>
          </h1>
          {(partner1 || date) && (
            <p className="mt-5 text-[11px] uppercase tracking-[0.35em] text-[#e9e3cf]/90">
              {[partner1 && partner2 ? `${partner1} & ${partner2}` : partner1 || partner2, date].filter(Boolean).join("  ·  ")}
            </p>
          )}
        </div>
      </header>

      <main className="mx-auto w-full max-w-xl px-4 pb-20">
        {/* Tarjeta de subida */}
        <section
          style={{ background: C.card, borderColor: C.line }}
          className="relative -mt-6 rounded-2xl border px-5 py-7 shadow-[0_20px_50px_-25px_rgba(52,58,38,0.45)] sm:px-8"
        >
          <p style={{ fontFamily: SERIF }} className="text-center text-xl italic leading-snug" >
            Cada foto que tomes hoy es un recuerdo que queremos guardar para siempre.
          </p>
          <p style={{ color: C.muted }} className="mt-3 text-center text-sm leading-relaxed">
            Súbelas aquí, sin apps ni registros. Llegan directo a nuestro álbum.
          </p>

          {enabled ? (
            <>
              <label className="mt-7 block">
                <span style={{ color: C.muted }} className="text-[11px] font-medium uppercase tracking-[0.25em]">
                  Tu nombre
                </span>
                <input
                  ref={nameRef}
                  maxLength={60}
                  onChange={(e) => rememberName(e.target.value)}
                  placeholder="Para saber quién nos regaló estos recuerdos"
                  autoComplete="name"
                  style={{ borderColor: C.line, color: C.ink }}
                  className="mt-2 w-full rounded-xl border bg-white/70 px-4 py-3 text-base outline-none transition focus:border-[#a8996a] focus:ring-4 focus:ring-[#a8996a]/15"
                />
              </label>

              <input
                ref={inputRef}
                type="file"
                accept="image/*,video/*"
                multiple
                className="hidden"
                onChange={(e) => addFiles(e.target.files)}
              />
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                style={{ background: C.ink }}
                className="mt-5 flex w-full items-center justify-center gap-3 rounded-xl px-6 py-4 text-base font-medium text-[#f2eee3] shadow-lg shadow-[#343a26]/20 transition active:scale-[0.98] hover:brightness-110"
              >
                <ImagePlus className="size-5" />
                Elegir fotos y videos
              </button>
              <p style={{ color: C.muted }} className="mt-3 flex items-center justify-center gap-1.5 text-xs">
                <Camera className="size-3.5" /> Puedes elegir varias a la vez · hasta 24 MB cada una
              </p>

              {jobs.length > 0 && (
                <div className="mt-7">
                  <div className="mb-3 flex items-center justify-between text-sm">
                    <span style={{ fontFamily: SERIF }} className="text-lg italic">
                      {pending > 0 ? "Subiendo…" : "¡Gracias por compartir!"}
                    </span>
                    <span style={{ color: C.muted }}>
                      {done} de {jobs.length}
                    </span>
                  </div>
                  <ul className="grid grid-cols-4 gap-2 sm:grid-cols-5">
                    {jobs.map((job) => (
                      <li key={job.key} className="relative aspect-square overflow-hidden rounded-lg" style={{ background: C.line }}>
                        {job.preview ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={job.preview} alt="" className="size-full object-cover" />
                        ) : (
                          <div className="flex size-full items-center justify-center" style={{ color: C.muted }}>
                            <Play className="size-6" />
                          </div>
                        )}
                        {job.status !== "done" && <div className="absolute inset-0 bg-[#262b19]/45" />}
                        {job.status === "uploading" && (
                          <>
                            <Loader2 className="absolute left-1/2 top-1/2 size-5 -translate-x-1/2 -translate-y-1/2 animate-spin text-white" />
                            <div className="absolute inset-x-0 bottom-0 h-1 bg-white/30">
                              <div className="h-full bg-[#cdbb86] transition-[width]" style={{ width: `${Math.round(job.progress * 100)}%` }} />
                            </div>
                          </>
                        )}
                        {job.status === "queued" && <span className="absolute inset-0 flex items-center justify-center text-[10px] uppercase tracking-widest text-white">En cola</span>}
                        {job.status === "done" && (
                          <span className="absolute right-1 top-1 flex size-5 items-center justify-center rounded-full bg-[#4f6b2c] text-white">
                            <Check className="size-3" />
                          </span>
                        )}
                        {job.status === "error" && (
                          <button
                            type="button"
                            title={job.error}
                            onClick={() =>
                              job.error && /pesado|Solo/.test(job.error)
                                ? setJobs((all) => all.filter((j) => j.key !== job.key))
                                : retry(job)
                            }
                            className="absolute inset-0 flex flex-col items-center justify-center gap-1 px-1 text-center text-[10px] leading-tight text-white"
                          >
                            {job.error && /pesado|Solo/.test(job.error) ? <X className="size-4" /> : <RotateCw className="size-4" />}
                            {job.error}
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : (
            <p style={{ borderColor: C.line, color: C.muted }} className="mt-7 rounded-xl border border-dashed px-4 py-5 text-center text-sm">
              El álbum todavía no está abierto. Vuelve a intentarlo el día de la boda.
            </p>
          )}
        </section>

        {/* Álbum de los invitados */}
        {shots.length > 0 && (
          <section className="mt-14">
            <div className="mb-5 text-center">
              <p style={{ color: C.accent }} className="text-[11px] uppercase tracking-[0.35em]">
                El álbum de todos
              </p>
              <h2 style={{ fontFamily: SERIF }} className="mt-2 text-3xl italic">
                Lo que han compartido
              </h2>
            </div>
            <div className="columns-2 gap-2 sm:columns-3">
              {shots.map((shot, i) =>
                shot.type === "video" ? (
                  <a
                    key={shot.id}
                    href={`https://drive.google.com/file/d/${shot.driveFileId}/view`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative mb-2 block break-inside-avoid overflow-hidden rounded-lg"
                    style={{ background: C.line }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={driveThumb(shot.driveFileId, 600)} alt="" loading="lazy" className="w-full object-cover" onError={(e) => (e.currentTarget.style.minHeight = "8rem")} />
                    <span className="absolute inset-0 flex items-center justify-center">
                      <span className="flex size-11 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur">
                        <Play className="size-5 translate-x-px" />
                      </span>
                    </span>
                  </a>
                ) : (
                  <button key={shot.id} type="button" onClick={() => setLb(i)} className="group relative mb-2 block w-full break-inside-avoid overflow-hidden rounded-lg">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={shot.src ?? driveThumb(shot.driveFileId, 600)} alt="" loading="lazy" className="w-full object-cover transition duration-500 group-hover:scale-[1.03]" />
                    {shot.by && (
                      <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/55 to-transparent px-2 pb-1.5 pt-5 text-left text-[11px] text-white/95">
                        {shot.by}
                      </span>
                    )}
                  </button>
                ),
              )}
            </div>
          </section>
        )}

        <footer className="mt-16 text-center">
          <p style={{ fontFamily: SERIF }} className="text-2xl italic">
            Gracias por ser parte de este día
          </p>
          <p style={{ color: C.muted }} className="mt-2 text-xs uppercase tracking-[0.3em]">
            {partner1 && partner2 ? `${partner1} & ${partner2}` : "Con cariño"}
          </p>
        </footer>
      </main>

      <Lightbox images={images} index={lb} onClose={() => setLb(null)} onIndex={setLb} />
    </div>
  );
}
