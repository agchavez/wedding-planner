"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar as CalendarIcon, CalendarClock, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, "0"));

/** Selector de solo hora (sin fecha) — dos selects hora/minuto en español, sin input nativo. */
export function TimePicker({
  name,
  defaultValue,
  placeholder = "Selecciona una hora",
  className,
}: {
  name: string;
  /** Hora en formato "HH:mm". */
  defaultValue?: string | null;
  placeholder?: string;
  className?: string;
}) {
  const [hour, setHour] = useState<string | null>(() => defaultValue?.split(":")[0] ?? null);
  const [minute, setMinute] = useState<string | null>(() => {
    const raw = defaultValue?.split(":")[1];
    if (!raw) return null;
    return String(Math.round(Number(raw) / 5) * 5).padStart(2, "0");
  });
  const [open, setOpen] = useState(false);

  const value = hour !== null && minute !== null ? `${hour}:${minute}` : "";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <input type="hidden" name={name} value={value} />
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            className={cn("w-full justify-start font-normal", !value && "text-muted-foreground", className)}
          />
        }
      >
        <Clock className="size-4" />
        {value || placeholder}
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="start">
        <div className="flex items-center gap-2">
          <Select value={hour ?? undefined} onValueChange={(v) => setHour(v)}>
            <SelectTrigger className="h-8 flex-1">
              <SelectValue placeholder="HH" />
            </SelectTrigger>
            <SelectContent>
              {HOURS.map((h) => (
                <SelectItem key={h} value={h}>
                  {h}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-muted-foreground">:</span>
          <Select value={minute ?? undefined} onValueChange={(v) => setMinute(v)}>
            <SelectTrigger className="h-8 flex-1">
              <SelectValue placeholder="mm" />
            </SelectTrigger>
            <SelectContent>
              {MINUTES.map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function parseDateOnly(value?: string | null) {
  if (!value) return undefined;
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return undefined;
  return new Date(y, m - 1, d);
}

function toDateOnlyString(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function DatePicker({
  id,
  name,
  defaultValue,
  placeholder = "Selecciona una fecha",
  className,
  fromYear = new Date().getFullYear() - 1,
  toYear = new Date().getFullYear() + 5,
}: {
  id?: string;
  name: string;
  defaultValue?: string | null;
  placeholder?: string;
  className?: string;
  /** Rango de años del selector de mes/año. */
  fromYear?: number;
  toYear?: number;
}) {
  const [date, setDate] = useState<Date | undefined>(() => parseDateOnly(defaultValue));
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <input type="hidden" name={name} value={date ? toDateOnlyString(date) : ""} />
      <PopoverTrigger
        render={
          <Button
            id={id}
            type="button"
            variant="outline"
            className={cn("w-full justify-start font-normal", !date && "text-muted-foreground", className)}
          />
        }
      >
        <CalendarIcon className="size-4" />
        {date ? format(date, "d 'de' MMMM 'de' yyyy", { locale: es }) : placeholder}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          defaultMonth={date}
          captionLayout="dropdown"
          startMonth={new Date(fromYear, 0)}
          endMonth={new Date(toYear, 11)}
          onSelect={(d) => {
            setDate(d);
            setOpen(false);
          }}
          locale={es}
          autoFocus
        />
        {date && (
          <div className="border-t border-border p-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full text-muted-foreground"
              onClick={() => {
                setDate(undefined);
                setOpen(false);
              }}
            >
              Quitar fecha
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

function toDateTimeLocalString(date: Date, time: string) {
  const [h, m] = time.split(":").map(Number);
  const d = new Date(date);
  d.setHours(h || 0, m || 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function DateTimePicker({
  name,
  defaultValue,
  placeholder = "Selecciona fecha y hora",
  className,
}: {
  name: string;
  defaultValue?: string | null;
  placeholder?: string;
  className?: string;
}) {
  const initial = useMemo(() => (defaultValue ? new Date(defaultValue) : undefined), [defaultValue]);
  const [date, setDate] = useState<Date | undefined>(initial);
  const [hour, setHour] = useState<string>(initial ? format(initial, "HH") : "12");
  const [minute, setMinute] = useState<string>(initial ? String(Math.round(initial.getMinutes() / 5) * 5).padStart(2, "0") : "00");
  const time = `${hour}:${minute}`;

  const combined = date ? toDateTimeLocalString(date, time) : "";

  return (
    <Popover>
      <input type="hidden" name={name} value={combined} />
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            className={cn("w-full justify-start font-normal", !date && "text-muted-foreground", className)}
          />
        }
      >
        <CalendarClock className="size-4" />
        {date ? `${format(date, "d MMM yyyy", { locale: es })}, ${time}` : placeholder}
      </PopoverTrigger>
      <PopoverContent className="w-auto space-y-2 p-2" align="start">
        <Calendar mode="single" selected={date} onSelect={setDate} locale={es} autoFocus />
        <div className="flex items-center gap-2 border-t border-border px-1 pt-2">
          <Label className="text-xs text-muted-foreground">Hora</Label>
          <Select value={hour} onValueChange={(v) => v && setHour(v)}>
            <SelectTrigger className="h-8 flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {HOURS.map((h) => (
                <SelectItem key={h} value={h}>
                  {h}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-muted-foreground">:</span>
          <Select value={minute} onValueChange={(v) => v && setMinute(v)}>
            <SelectTrigger className="h-8 flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MINUTES.map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </PopoverContent>
    </Popover>
  );
}
