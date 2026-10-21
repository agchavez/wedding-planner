"use client";

import { useState, useTransition } from "react";
import { Check, Heart, Minus, Plus } from "lucide-react";
import { respondInvitation } from "@/app/i/[token]/actions";
import { firstName } from "@/lib/invitationMessage";
import type { InvitationGuestData } from "@/lib/guestInvitations";
import { cn } from "@/lib/utils";

function formatDeadline(iso: string) {
  return new Intl.DateTimeFormat("es-HN", { day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(iso));
}

export function RsvpSection({
  guest,
  token,
  rsvpDeadline,
}: {
  guest: InvitationGuestData;
  token?: string;
  rsvpDeadline: string | null;
}) {
  const [editing, setEditing] = useState(!guest.responded);
  const [attending, setAttending] = useState<boolean | null>(
    guest.responded ? guest.rsvpStatus === "confirmed" : null
  );
  const [count, setCount] = useState(guest.attendingCount && guest.attendingCount > 0 ? guest.attendingCount : guest.seats);
  const [dietary, setDietary] = useState(guest.dietaryRestrictions);
  const [message, setMessage] = useState(guest.rsvpMessage);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function submit() {
    if (attending === null) return;
    setError("");
    if (!token) {
      setError("Vista previa: así verá el formulario tu invitado.");
      return;
    }
    startTransition(async () => {
      const result = await respondInvitation(token, { attending, count, dietary, message });
      if (!result.ok) setError(result.error);
      else setEditing(false);
    });
  }

  if (!editing) {
    return (
      <div className="inv-paper rounded-2xl border border-(--inv-gold)/40 px-6 py-10 text-center">
        <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-(--inv-accent) text-(--inv-paper)">
          {attending ? <Heart className="size-6" fill="currentColor" /> : <Check className="size-6" />}
        </span>
        <p className="inv-script mt-5 text-5xl text-(--inv-accent)">
          {attending ? "¡Gracias!" : "Te echaremos de menos"}
        </p>
        <p className="mt-3 text-lg">
          {attending
            ? `${firstName(guest.fullName)}, recibimos tu confirmación para ${count} ${count === 1 ? "persona" : "personas"}. ¡Nos vemos pronto!`
            : `${firstName(guest.fullName)}, gracias por avisarnos. Estarás en nuestros corazones ese día.`}
        </p>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="inv-caps mt-6 text-[0.65rem] text-(--inv-muted) underline-offset-4 hover:underline"
        >
          Cambiar mi respuesta
        </button>
      </div>
    );
  }

  return (
    <div className="inv-paper rounded-2xl border border-(--inv-gold)/40 px-5 py-8 @xl:px-8">
      {rsvpDeadline && (
        <p className="mb-6 text-center text-base italic text-(--inv-muted)">
          Por favor confírmanos antes del {formatDeadline(rsvpDeadline)}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="¿Asistirás?">
        {[
          { value: true, label: "Sí, ahí estaré" },
          { value: false, label: "No podré ir" },
        ].map((option) => (
          <button
            key={String(option.value)}
            type="button"
            role="radio"
            aria-checked={attending === option.value}
            onClick={() => setAttending(option.value)}
            className={cn(
              "rounded-xl border px-3 py-4 text-lg transition-all",
              attending === option.value
                ? "border-(--inv-accent) bg-(--inv-accent) text-(--inv-paper) shadow-md"
                : "border-(--inv-gold)/50 hover:border-(--inv-accent)"
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      {attending && guest.seats > 1 && (
        <div className="mt-7 flex flex-col items-center">
          <p className="inv-caps text-[0.65rem] text-(--inv-muted)">¿Cuántos asistirán?</p>
          <div className="mt-3 flex items-center gap-5">
            <button
              type="button"
              aria-label="Menos"
              onClick={() => setCount((c) => Math.max(1, c - 1))}
              disabled={count <= 1}
              className="flex size-10 items-center justify-center rounded-full border border-(--inv-gold)/60 disabled:opacity-30"
            >
              <Minus className="size-4" />
            </button>
            <span className="w-12 text-center text-4xl font-medium tabular-nums">{count}</span>
            <button
              type="button"
              aria-label="Más"
              onClick={() => setCount((c) => Math.min(guest.seats, c + 1))}
              disabled={count >= guest.seats}
              className="flex size-10 items-center justify-center rounded-full border border-(--inv-gold)/60 disabled:opacity-30"
            >
              <Plus className="size-4" />
            </button>
          </div>
          <p className="mt-2 text-sm text-(--inv-muted)">de {guest.seats} lugares reservados</p>
        </div>
      )}

      {attending !== null && (
        <div className="mt-7 space-y-4">
          {attending && (
            <label className="block">
              <span className="inv-caps text-[0.62rem] text-(--inv-muted)">Alergias o restricciones alimentarias</span>
              <input
                value={dietary}
                onChange={(e) => setDietary(e.target.value)}
                maxLength={300}
                placeholder="Opcional"
                className="mt-1.5 w-full border-b border-(--inv-gold)/60 bg-transparent px-1 py-2 text-lg outline-none placeholder:text-(--inv-muted)/60 focus:border-(--inv-accent)"
              />
            </label>
          )}
          <label className="block">
            <span className="inv-caps text-[0.62rem] text-(--inv-muted)">Un mensaje para los novios</span>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={1000}
              rows={3}
              placeholder="Opcional"
              className="mt-1.5 w-full resize-none border-b border-(--inv-gold)/60 bg-transparent px-1 py-2 text-lg outline-none placeholder:text-(--inv-muted)/60 focus:border-(--inv-accent)"
            />
          </label>
        </div>
      )}

      {error && <p className="mt-4 text-center text-sm text-red-700">{error}</p>}

      <button
        type="button"
        onClick={submit}
        disabled={attending === null || isPending}
        className="inv-caps mt-8 w-full rounded-full bg-(--inv-ink) py-4 text-xs text-(--inv-paper) transition-opacity hover:opacity-90 disabled:opacity-40"
      >
        {isPending ? "Enviando…" : "Enviar respuesta"}
      </button>
    </div>
  );
}
