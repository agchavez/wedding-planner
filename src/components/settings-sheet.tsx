"use client";

import { useState, useSyncExternalStore, useTransition } from "react";
import { Check, Heart, Palette, RotateCcw, Settings } from "lucide-react";
import { updateWeddingDetails } from "@/app/(app)/actions";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  applyCustomColors,
  DEFAULT_THEME,
  getStoredCustomColors,
  isThemeName,
  THEME_STORAGE_KEY,
  THEMES,
  CUSTOM_COLORS_STORAGE_KEY,
  type CustomColorKey,
  type CustomColors,
  type ThemeName,
} from "@/lib/theme";
import type { Wedding } from "@/generated/prisma";
import { toDateOnlyValue } from "@/lib/format";

let listeners: Array<() => void> = [];

function subscribe(callback: () => void) {
  listeners.push(callback);
  return () => {
    listeners = listeners.filter((l) => l !== callback);
  };
}

function getSnapshot(): ThemeName {
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  return isThemeName(stored) ? stored : DEFAULT_THEME;
}

function getServerSnapshot(): ThemeName {
  return DEFAULT_THEME;
}

function applyTheme(next: ThemeName) {
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem(THEME_STORAGE_KEY, next);
  // El tema base trae sus propios colores; los personalizados guardados se re-aplican encima.
  applyCustomColors(getStoredCustomColors());
  listeners.forEach((l) => l());
}

const COLOR_FIELDS: { key: CustomColorKey; label: string }[] = [
  { key: "primary", label: "Color principal" },
  { key: "accent", label: "Color de acento" },
];

function readComputedColor(key: CustomColorKey): string {
  if (typeof document === "undefined") return "#000000";
  const value = getComputedStyle(document.documentElement).getPropertyValue(`--${key}`).trim();
  if (!value) return "#000000";
  // Los valores hex de 3/6 dígitos son compatibles con <input type="color">; oklch()/otros no.
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value) ? value : "#000000";
}

export function SettingsSheet({ wedding, canEdit }: { wedding: Wedding | null; canEdit: boolean }) {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [open, setOpen] = useState(false);
  const [customColors, setCustomColors] = useState<CustomColors>({});
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) setCustomColors(getStoredCustomColors());
  }

  function handleColorChange(key: CustomColorKey, value: string) {
    const next = { ...customColors, [key]: value };
    setCustomColors(next);
    applyCustomColors(next);
    localStorage.setItem(CUSTOM_COLORS_STORAGE_KEY, JSON.stringify(next));
  }

  function handleResetColors() {
    setCustomColors({});
    applyCustomColors({});
    localStorage.removeItem(CUSTOM_COLORS_STORAGE_KEY);
  }

  function handleWeddingSubmit(formData: FormData) {
    startTransition(async () => {
      await updateWeddingDetails(formData);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  }

  const hasCustomColors = Object.keys(customColors).length > 0;

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger render={<Button variant="outline" size="sm" />}>
        <Settings className="size-4" />
        <span className="hidden sm:inline">Ajustes</span>
      </SheetTrigger>
      <SheetContent side="right" className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Ajustes</SheetTitle>
          <SheetDescription>
            {wedding ? "Personaliza la apariencia y edita los datos generales de la boda." : "Personaliza la apariencia."}
          </SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="apariencia" className="px-4">
          <TabsList className="w-full">
            <TabsTrigger value="apariencia" className="flex-1">
              <Palette className="size-3.5" />
              Apariencia
            </TabsTrigger>
            {wedding && (
              <TabsTrigger value="boda" className="flex-1">
                <Heart className="size-3.5" />
                La boda
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="apariencia" className="space-y-4 pt-3">
            <div className="flex flex-col gap-2">
              {THEMES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => applyTheme(t.value)}
                  className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted"
                >
                  <span className="flex shrink-0 -space-x-1.5">
                    <span
                      className="size-5 rounded-full border border-border/50"
                      style={{ backgroundColor: t.swatch.primary }}
                    />
                    <span
                      className="size-5 rounded-full border border-border/50"
                      style={{ backgroundColor: t.swatch.accent }}
                    />
                  </span>
                  <span className="flex-1 font-medium text-foreground">{t.label}</span>
                  {theme === t.value && <Check className="size-4 text-primary" />}
                </button>
              ))}
            </div>

            <div className="space-y-3 border-t border-border pt-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-foreground">Personalizar colores</p>
                {hasCustomColors && (
                  <Button variant="ghost" size="sm" onClick={handleResetColors}>
                    <RotateCcw className="size-3.5" />
                    Restablecer
                  </Button>
                )}
              </div>
              {COLOR_FIELDS.map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between gap-3">
                  <Label htmlFor={`color-${key}`} className="text-sm text-muted-foreground">
                    {label}
                  </Label>
                  <input
                    id={`color-${key}`}
                    type="color"
                    value={customColors[key] ?? readComputedColor(key)}
                    onChange={(e) => handleColorChange(key, e.target.value)}
                    className="size-9 cursor-pointer rounded-md border border-border bg-transparent p-0.5"
                  />
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="boda" className="pt-3">
            {!canEdit && (
              <p className="mb-3 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
                Tu rol en esta boda es de solo lectura: puedes ver estos datos, pero no cambiarlos.
              </p>
            )}
            <form action={handleWeddingSubmit} className="grid grid-cols-1 gap-3">
              <fieldset disabled={!canEdit} className="contents">
              <div>
                <Label htmlFor="partner1">Novia/o 1</Label>
                <Input id="partner1" name="partner1" defaultValue={wedding?.partner1} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="partner2">Novia/o 2</Label>
                <Input id="partner2" name="partner2" defaultValue={wedding?.partner2} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="weddingDate">Fecha de la boda</Label>
                <DatePicker
                  name="weddingDate"
                  defaultValue={toDateOnlyValue(wedding?.weddingDate)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="venueName">Lugar</Label>
                <Input id="venueName" name="venueName" defaultValue={wedding?.venueName} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="venueAddress">Dirección del lugar</Label>
                <Input id="venueAddress" name="venueAddress" defaultValue={wedding?.venueAddress} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="currency">Moneda</Label>
                <Input id="currency" name="currency" defaultValue={wedding?.currency} className="mt-1" />
              </div>
              <Button type="submit" disabled={isPending || !canEdit} className="mt-1">
                {isPending ? "Guardando..." : saved ? "Guardado ✓" : "Guardar cambios"}
              </Button>
              </fieldset>
            </form>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
