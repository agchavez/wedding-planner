"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import {
  Ban,
  Heart,
  KeyRound,
  MoreHorizontal,
  Search,
  ShieldCheck,
  ShieldOff,
  Trash2,
  UserCheck,
  UserPlus,
} from "lucide-react";
import {
  assignWeddingAction,
  createUserAction,
  removeUserAction,
  setBannedAction,
  setPasswordAction,
  setRoleAction,
  type ActionResult,
} from "@/app/(app)/admin/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type AdminUserRow = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "user";
  banned: boolean;
  createdAt: string;
  weddingId: string | null;
  weddingLabel: string | null;
};

export type WeddingOption = { id: string; label: string; date: string | null };

type Notice = { kind: "ok" | "error"; message: string } | null;
type Modal = { type: "create" } | { type: "password" | "wedding" | "delete"; user: AdminUserRow } | null;

const NEW_ON_LOGIN = "on-login";
const NEW_NOW = "new";

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "?"
  );
}

const dateFormat = new Intl.DateTimeFormat("es-HN", { dateStyle: "medium" });

export function AdminUsers({
  users,
  weddings,
  currentUserId,
}: {
  users: AdminUserRow[];
  weddings: WeddingOption[];
  currentUserId: string;
}) {
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState<Notice>(null);
  const [modal, setModal] = useState<Modal>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      [u.name, u.email, u.weddingLabel ?? ""].some((field) => field.toLowerCase().includes(q))
    );
  }, [users, query]);

  /** Ejecuta una acción del servidor y muestra el resultado. */
  function perform(action: () => Promise<ActionResult>, success: string, onDone?: () => void) {
    setNotice(null);
    startTransition(async () => {
      const result = await action();
      if (result.error) {
        setNotice({ kind: "error", message: result.error });
        return;
      }
      setNotice({ kind: "ok", message: success });
      onDone?.();
    });
  }

  const close = () => setModal(null);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative sm:w-80">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre, correo o boda"
            className="pl-8"
            aria-label="Buscar usuarios"
          />
        </div>
        <Button onClick={() => setModal({ type: "create" })}>
          <UserPlus className="size-4" />
          Nuevo usuario
        </Button>
      </div>

      {notice && (
        <p
          role="status"
          className={
            notice.kind === "ok"
              ? "rounded-md bg-accent px-3 py-2 text-sm text-accent-foreground"
              : "rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
          }
        >
          {notice.message}
        </p>
      )}

      <Card className="py-0">
        <CardContent className="px-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Usuario</th>
                  <th className="px-4 py-3 font-medium">Boda</th>
                  <th className="px-4 py-3 font-medium">Rol</th>
                  <th className="hidden px-4 py-3 font-medium md:table-cell">Alta</th>
                  <th className="px-4 py-3" aria-label="Acciones" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((user) => {
                  const isSelf = user.id === currentUserId;
                  return (
                    <tr key={user.id} className={user.banned ? "opacity-60" : undefined}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
                            {initials(user.name)}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-foreground">
                              {user.name}
                              {isSelf && <span className="ml-1.5 text-xs font-normal text-muted-foreground">(tú)</span>}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {user.weddingLabel ? (
                          <span className="inline-flex items-center gap-1.5 text-foreground">
                            <Heart className="size-3.5 text-decorative" />
                            {user.weddingLabel}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">Se crea al iniciar sesión</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                            {user.role === "admin" ? "Admin" : "Usuario"}
                          </Badge>
                          {user.banned && <Badge variant="destructive">Suspendido</Badge>}
                        </div>
                      </td>
                      <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                        {dateFormat.format(new Date(user.createdAt))}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={<Button variant="ghost" size="icon-sm" aria-label={`Acciones para ${user.name}`} />}
                          >
                            <MoreHorizontal />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="min-w-52">
                            <DropdownMenuItem onClick={() => setModal({ type: "wedding", user })}>
                              <Heart />
                              Asignar boda
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setModal({ type: "password", user })}>
                              <KeyRound />
                              Restablecer contraseña
                            </DropdownMenuItem>
                            {!isSelf && (
                              <>
                                <DropdownMenuItem
                                  onClick={() =>
                                    perform(
                                      () => setRoleAction(user.id, user.role === "admin" ? "user" : "admin"),
                                      user.role === "admin"
                                        ? `${user.name} ya no es administrador.`
                                        : `${user.name} ahora es administrador.`
                                    )
                                  }
                                >
                                  {user.role === "admin" ? <ShieldOff /> : <ShieldCheck />}
                                  {user.role === "admin" ? "Quitar admin" : "Hacer admin"}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() =>
                                    perform(
                                      () => setBannedAction(user.id, !user.banned),
                                      user.banned ? `${user.name} fue reactivado.` : `${user.name} fue suspendido.`
                                    )
                                  }
                                >
                                  {user.banned ? <UserCheck /> : <Ban />}
                                  {user.banned ? "Reactivar" : "Suspender"}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem variant="destructive" onClick={() => setModal({ type: "delete", user })}>
                                  <Trash2 />
                                  Eliminar
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                      {query ? "Ningún usuario coincide con la búsqueda." : "Todavía no hay usuarios."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <CreateUserDialog
        open={modal?.type === "create"}
        onClose={close}
        weddings={weddings}
        isPending={isPending}
        onSubmit={(formData, reset) =>
          perform(() => createUserAction(formData), `Usuario ${formData.get("email")} creado.`, () => {
            reset();
            close();
          })
        }
      />

      {modal?.type === "password" && (
        <Dialog open onOpenChange={(o) => !o && close()}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Restablecer contraseña</DialogTitle>
              <DialogDescription>
                Nueva contraseña para {modal.user.email}. Se cerrarán sus sesiones abiertas.
              </DialogDescription>
            </DialogHeader>
            <form
              id="password-form"
              action={(formData) =>
                perform(() => setPasswordAction(modal.user.id, formData), `Contraseña de ${modal.user.name} actualizada.`, close)
              }
            >
              <Label htmlFor="admin-new-password">Contraseña nueva</Label>
              <Input
                id="admin-new-password"
                name="password"
                type="text"
                autoComplete="off"
                minLength={8}
                required
                className="mt-1 font-mono"
              />
            </form>
            <DialogFooter>
              <Button variant="outline" onClick={close}>
                Cancelar
              </Button>
              <Button type="submit" form="password-form" disabled={isPending}>
                Guardar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {modal?.type === "wedding" && (
        <Dialog open onOpenChange={(o) => !o && close()}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Asignar boda</DialogTitle>
              <DialogDescription>
                Varios usuarios pueden compartir una boda (por ejemplo, la pareja y su wedding planner).
              </DialogDescription>
            </DialogHeader>
            <form
              id="wedding-form"
              action={(formData) =>
                perform(
                  () => assignWeddingAction(modal.user.id, String(formData.get("weddingId") ?? "")),
                  `Boda de ${modal.user.name} actualizada.`,
                  close
                )
              }
            >
              <Label>Boda</Label>
              <WeddingSelect weddings={weddings} defaultValue={modal.user.weddingId ?? NEW_NOW} allowOnLogin={false} />
            </form>
            <DialogFooter>
              <Button variant="outline" onClick={close}>
                Cancelar
              </Button>
              <Button type="submit" form="wedding-form" disabled={isPending}>
                Guardar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {modal?.type === "delete" && (
        <AlertDialog open onOpenChange={(o) => !o && close()}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar a {modal.user.name}?</AlertDialogTitle>
              <AlertDialogDescription>
                Se eliminará la cuenta {modal.user.email} y sus sesiones. Los datos de la boda se conservan.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel render={<Button variant="outline" />}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                render={<Button variant="destructive" disabled={isPending} />}
                onClick={() => perform(() => removeUserAction(modal.user.id), `${modal.user.name} fue eliminado.`, close)}
              >
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}

function WeddingSelect({
  weddings,
  defaultValue,
  allowOnLogin,
}: {
  weddings: WeddingOption[];
  defaultValue: string;
  allowOnLogin: boolean;
}) {
  const labels: Record<string, string> = {
    [NEW_ON_LOGIN]: "Boda nueva (se crea al entrar)",
    [NEW_NOW]: "Crear boda nueva vacía",
    ...Object.fromEntries(weddings.map((w) => [w.id, w.label])),
  };

  return (
    <Select name="weddingId" defaultValue={defaultValue}>
      <SelectTrigger className="mt-1 w-full">
        <SelectValue>{(value: string) => labels[value] ?? "Selecciona una boda"}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {allowOnLogin && <SelectItem value={NEW_ON_LOGIN}>{labels[NEW_ON_LOGIN]}</SelectItem>}
        <SelectItem value={NEW_NOW}>{labels[NEW_NOW]}</SelectItem>
        {weddings.map((w) => (
          <SelectItem key={w.id} value={w.id}>
            {w.label}
            {w.date && (
              <span className="ml-2 text-xs text-muted-foreground">{dateFormat.format(new Date(w.date))}</span>
            )}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function CreateUserDialog({
  open,
  onClose,
  weddings,
  isPending,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  weddings: WeddingOption[];
  isPending: boolean;
  onSubmit: (formData: FormData, reset: () => void) => void;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nuevo usuario</DialogTitle>
          <DialogDescription>Comparte el correo y la contraseña con la persona; podrá cambiarla en “Mi cuenta”.</DialogDescription>
        </DialogHeader>
        <form
          ref={formRef}
          id="create-user-form"
          action={(formData) => onSubmit(formData, () => formRef.current?.reset())}
          className="grid grid-cols-1 gap-3 sm:grid-cols-2"
        >
          <div>
            <Label htmlFor="new-name">Nombre</Label>
            <Input id="new-name" name="name" required className="mt-1" />
          </div>
          <div>
            <Label htmlFor="new-email">Correo</Label>
            <Input id="new-email" name="email" type="email" required className="mt-1" />
          </div>
          <div>
            <Label htmlFor="new-password">Contraseña inicial</Label>
            <Input
              id="new-password"
              name="password"
              type="text"
              autoComplete="off"
              minLength={8}
              required
              className="mt-1 font-mono"
            />
          </div>
          <div>
            <Label>Rol</Label>
            <Select name="role" defaultValue="user">
              <SelectTrigger className="mt-1 w-full">
                <SelectValue>{(value: string) => (value === "admin" ? "Administrador" : "Usuario")}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">Usuario</SelectItem>
                <SelectItem value="admin">Administrador</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label>Boda</Label>
            <WeddingSelect weddings={weddings} defaultValue={NEW_ON_LOGIN} allowOnLogin />
          </div>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="create-user-form" disabled={isPending}>
            Crear usuario
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
