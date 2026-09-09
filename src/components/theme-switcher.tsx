"use client";

import { useSyncExternalStore } from "react";
import { Check, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DEFAULT_THEME, THEME_STORAGE_KEY, THEMES, isThemeName, type ThemeName } from "@/lib/theme";

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
  listeners.forEach((l) => l());
}

export function ThemeSwitcher() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
        <Palette className="size-4" />
        <span className="hidden sm:inline">Tema</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {THEMES.map((t) => (
          <DropdownMenuItem key={t.value} onClick={() => applyTheme(t.value)}>
            <span className="flex-1">{t.label}</span>
            {theme === t.value && <Check className="size-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
