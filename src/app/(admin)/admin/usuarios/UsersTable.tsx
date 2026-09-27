"use client";

import Link from "next/link";
import { useMemo, useRef, useState, useTransition } from "react";
import {
  Activity,
  Ban,
  Heart,
  KeyRound,
  LogOut,
  MoreHorizontal,
  Search,
  ShieldCheck,
  ShieldOff,
  Trash2,
  UserCheck,
  UserPlus,
} from "lucide-react";
import {
  createUserAction,
  removeUserAction,
  revokeUserSessionsAction,
  setBannedAction,
  setPasswordAction,
  setRoleAction,
  type ActionResult,
} from "@/app/(admin)/admin/actions";
import { Avatar, RoleChip } from "@/app/(admin)/admin/_components/ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import type { AdminUser } from "@/lib/admin-data";
import { formatDate, formatDateTime, relativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";

type Notice = { kind: "ok" | "error"; message: string } | null;
type Modal = { type: "create" } | { type: "password" | "delete"; user: AdminUser } | null;
type Filter = "all" | "admins" | "no-wedding" | "banned";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "admins", label: "Administradores" },
  { value: "no-wedding", label: "Sin boda" },
  { value: "banned", label: "Suspendidos" },
];

export function UsersTable({ users, currentUserId }: { users: AdminUser[]; currentUserId: string }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [notice, setNotice] = useState<Notice>(null);
  const [modal, setModal] = useState<Modal>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter((u) => {
      if (filter === "admins" && u.role !== "admin") return false;
      if (filter === "no-wedding" && u.weddings.length > 0) return false;
      if (filter === "banned" && !u.banned) return false;
      if (!q) return true;
      return [u.name, u.email, ...u.weddings.map((w) => w.name)].some((f) => f.toLowerCase().includes(q));
    });
  }, [users, query, filter]);

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
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative sm:w-72">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nombre, correo o boda"
              className="pl-8"
              aria-label="Buscar usuarios"
            />
          </div>
          <div className="flex flex-wrap gap-1" role="group" aria-label="Filtrar usuarios">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setFilter(f.value)}
                aria-pressed={filter === f.value}
                className={cn(
                  "rounded-full px-3 py-1 text-sm transition-colors",
                  filter === f.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <Button onClick={() => setModal({ type: "create" })}>
          <UserPlus className="size-4" />
          Nueva cuenta
        </Button>
      </div>

      {notice && (
        <p
          role="status"
          className={
            notice.kind === "ok"
              ? "rounded-lg bg-accent px-3.5 py-2.5 text-sm text-accent-foreground"
              : "rounded-lg border border-destructive/25 bg-destructive/8 px-3.5 py-2.5 text-sm text-destructive"
          }
        >
          {notice.message}
        </p>
      )}

      <div className="overflow-x-auto rounded-2xl border border-border bg-card">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b border-border text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Usuario</th>
              <th className="px-4 py-3 font-medium">Bodas y rol</th>
              <th className="px-4 py-3 font-medium">Último acceso</th>
              <th className="px-4 py-3 font-medium">Alta</th>
              <th className="px-4 py-3" aria-label="Acciones" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((user) => {
              const isSelf = user.id === currentUserId;
              return (
                <tr key={user.id} className={cn("align-top", user.banned && "bg-muted/40")}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={user.name} />
                      <div className="min-w-0">
                        <p className="flex items-center gap-1.5 truncate font-medium text-foreground">
                          {user.name}
                          {isSelf && <span className="text-xs font-normal text-muted-foreground">(tú)</span>}
                          {user.role === "admin" && <Badge>Admin</Badge>}
                          {user.banned && <Badge variant="destructive">Suspendido</Badge>}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {user.weddings.length === 0 ? (
                      <span className="text-xs text-muted-foreground">
                        {user.role === "admin" ? "No aplica" : "Todavía no crea ni se une a una boda"}
                      </span>
                    ) : (
                      <ul className="space-y-1">
                        {user.weddings.map((w) => (
                          <li key={w.id} className="flex items-center gap-2">
                            <Heart className="size-3.5 shrink-0 text-decorative" />
                            <Link href={`/admin/bodas/${w.id}`} className="truncate text-foreground hover:underline">
                              {w.name}
                            </Link>
                            <RoleChip role={w.role} />
                          </li>
                        ))}
                      </ul>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <p suppressHydrationWarning className="text-foreground" title={user.lastSeen ? formatDateTime(user.lastSeen) : undefined}>
                      {relativeTime(user.lastSeen)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {user.activeSessions === 0
                        ? "Sin sesiones abiertas"
                        : `${user.activeSessions} ${user.activeSessions === 1 ? "sesión abierta" : "sesiones abiertas"}`}
                    </p>
                  </td>
                  <td suppressHydrationWarning className="px-4 py-3 text-muted-foreground">{formatDate(user.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={<Button variant="ghost" size="icon-sm" aria-label={`Acciones para ${user.name}`} />}
                      >
                        <MoreHorizontal />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="min-w-56">
                        <DropdownMenuItem render={<Link href={`/admin/actividad?actor=${user.id}`} />}>
                          <Activity />
                          Ver su actividad
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setModal({ type: "password", user })}>
                          <KeyRound />
                          Restablecer contraseña
                        </DropdownMenuItem>
                        {!isSelf && user.activeSessions > 0 && (
                          <DropdownMenuItem
                            onClick={() =>
                              perform(() => revokeUserSessionsAction(user.id), `Se cerraron las sesiones de ${user.name}.`)
                            }
                          >
                            <LogOut />
                            Cerrar sus sesiones
                          </DropdownMenuItem>
                        )}
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
                              {user.role === "admin" ? "Quitar administrador" : "Hacer administrador"}
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
                              {user.banned ? "Reactivar cuenta" : "Suspender cuenta"}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem variant="destructive" onClick={() => setModal({ type: "delete", user })}>
                              <Trash2 />
                              Eliminar cuenta
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
                <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                  Ningún usuario coincide con los filtros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <CreateUserDialog
        open={modal?.type === "create"}
        onClose={close}
        isPending={isPending}
        onSubmit={(formData, reset) =>
          perform(() => createUserAction(formData), `Cuenta ${formData.get("email")} creada.`, () => {
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
                Guardar contraseña
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {modal?.type === "delete" && (
        <AlertDialog open onOpenChange={(o) => !o && close()}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar la cuenta de {modal.user.name}?</AlertDialogTitle>
              <AlertDialogDescription>
                Se eliminarán la cuenta {modal.user.email}, sus sesiones y su participación en{" "}
                {modal.user.weddings.length === 1 ? "1 boda" : `${modal.user.weddings.length} bodas`}. Los datos de las bodas
                se conservan.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel render={<Button variant="outline" />}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                render={<Button variant="destructive" disabled={isPending} />}
                onClick={() => perform(() => removeUserAction(modal.user.id), `La cuenta de ${modal.user.name} fue eliminada.`, close)}
              >
                Eliminar cuenta
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}

function CreateUserDialog({
  open,
  onClose,
  isPending,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  isPending: boolean;
  onSubmit: (formData: FormData, reset: () => void) => void;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nueva cuenta</DialogTitle>
          <DialogDescription>
            Al entrar, la persona podrá crear su boda o aceptar una invitación. Podrá cambiar la contraseña en “Mi cuenta”.
          </DialogDescription>
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
            <Label>Tipo de cuenta</Label>
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
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="create-user-form" disabled={isPending}>
            Crear cuenta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
