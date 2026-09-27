import type { Metadata } from "next";
import Link from "next/link";
import { CalendarClock, LayoutGrid, ListMusic, Receipt, UserRoundPlus, Users } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import { Button } from "@/components/ui/button";
import { WEDDING_ROLES } from "@/lib/permissions";

export const metadata: Metadata = {
  title: "Wedplan · Planifiquen su boda juntos",
  description:
    "Invitados, presupuesto, música, horario y el salón de tu boda en un solo lugar, compartido con tu pareja y quien les ayude a organizarla.",
};

const FEATURES = [
  {
    icon: Users,
    title: "Invitados y confirmaciones",
    text: "Grupos, acompañantes, restricciones de comida y quién ya confirmó. Asigna cada invitado a su mesa.",
  },
  {
    icon: Receipt,
    title: "Presupuesto y pagos",
    text: "Categorías con su tope, gastos por proveedor y avisos cuando un pago está por vencer o te pasaste.",
  },
  {
    icon: ListMusic,
    title: "Música",
    text: "La entrada, el primer baile, la fiesta y la lista de lo que el DJ no debe tocar.",
  },
  {
    icon: CalendarClock,
    title: "Horario del día",
    text: "Cada momento con su hora y duración, separado por evento: ceremonia, recepción, fiesta.",
  },
  {
    icon: LayoutGrid,
    title: "Distribución del salón",
    text: "Arrastra mesas, sillas, pista y escenario sobre un plano. Ve cuántos lugares quedan libres.",
  },
  {
    icon: UserRoundPlus,
    title: "Organización en equipo",
    text: "Invita a tu pareja, familia o wedding planner con un enlace y decide qué puede hacer cada uno.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-svh bg-background text-foreground">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <Link href="/inicio" className="flex items-center gap-2">
          <BrandMark />
          <span className="font-heading text-xl font-semibold text-primary">Wedplan</span>
        </Link>
        <nav className="flex items-center gap-2">
          <Link href="/login" className="rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-foreground">
            Iniciar sesión
          </Link>
          <Button nativeButton={false} render={<Link href="/registro" />} className="hidden sm:inline-flex">
            Crear mi boda
          </Button>
        </nav>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 pt-8 pb-20 sm:px-8 lg:grid-cols-[1.05fr_1fr] lg:pt-16 lg:pb-28">
          <div>
            <h1 className="font-heading text-5xl leading-[1.05] font-semibold tracking-tight text-foreground sm:text-6xl lg:text-7xl">
              Su boda, organizada entre todos.
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted-foreground">
              Invitados, presupuesto, música, horario y el salón en un solo lugar, compartido con tu pareja y con quien les
              ayude a organizarla.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button nativeButton={false} render={<Link href="/registro" />} className="h-12 px-6 text-base">
                Crear mi boda
              </Button>
              <Button variant="outline" nativeButton={false} render={<Link href="/login" />} className="h-12 px-6 text-base">
                Ya tengo cuenta
              </Button>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">¿Te invitaron? Abre el enlace que te enviaron.</p>
          </div>

          <HeroPreview />
        </section>

        {/* Funciones */}
        <section className="border-t border-border bg-card/50">
          <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
            <h2 className="max-w-xl font-heading text-3xl font-semibold leading-tight sm:text-4xl">
              Todo lo que hoy vive en cinco hojas de cálculo y un grupo de WhatsApp.
            </h2>
            <ul className="mt-12 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f) => (
                <li key={f.title} className="border-t border-decorative/50 pt-5">
                  <f.icon className="size-5 text-primary" />
                  <h3 className="mt-3 font-medium text-foreground">{f.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.text}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Roles */}
        <section className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
          <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr]">
            <div>
              <h2 className="font-heading text-3xl font-semibold leading-tight sm:text-4xl">Cada quien con su parte.</h2>
              <p className="mt-4 max-w-md leading-relaxed text-muted-foreground">
                La pareja decide quién entra y qué puede tocar. Tu mamá puede ver el horario sin mover el presupuesto; tu
                wedding planner puede editarlo todo.
              </p>
            </div>
            <ol className="grid gap-3 sm:grid-cols-2">
              {WEDDING_ROLES.map((role) => (
                <li key={role.value} className="rounded-2xl border border-border bg-card p-5">
                  <p className="font-heading text-xl font-semibold text-foreground">{role.label}</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{role.description}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Cierre */}
        <section className="px-5 pb-20 sm:px-8">
          <div className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl bg-primary px-6 py-16 text-center text-primary-foreground sm:px-12">
            <div className="pointer-events-none absolute inset-3 rounded-[1.25rem] border border-decorative/50" />
            <h2 className="relative font-heading text-3xl font-semibold sm:text-5xl">Empiecen hoy.</h2>
            <p className="relative mx-auto mt-4 max-w-md text-primary-foreground/80">
              Crear su boda toma un minuto. Luego inviten a quien quieran.
            </p>
            <Button
              variant="secondary"
              nativeButton={false} render={<Link href="/registro" />}
              className="relative mt-8 h-12 px-6 text-base"
            >
              Crear mi boda
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p className="flex items-center gap-2">
            <BrandMark className="size-5" />
            Wedplan
          </p>
          <Link href="/login" className="hover:text-foreground">
            Iniciar sesión
          </Link>
        </div>
      </footer>
    </div>
  );
}

/** Vista previa del panel: la cuenta regresiva, confirmaciones, presupuesto y horario. */
function HeroPreview() {
  const timeline = [
    { time: "16:00", title: "Ceremonia en el jardín" },
    { time: "17:30", title: "Cóctel y fotos" },
    { time: "19:00", title: "Entrada de los novios" },
  ];

  return (
    <div className="relative mx-auto w-full max-w-md lg:max-w-none" aria-hidden="true">
      <svg
        viewBox="0 0 220 140"
        className="absolute -top-24 -right-4 w-56 text-decorative sm:-top-28 sm:w-72"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
      >
        <circle cx="82" cy="78" r="50" strokeWidth="2" pathLength={1} className="ring-draw" />
        <circle cx="138" cy="78" r="50" strokeWidth="2" pathLength={1} className="ring-draw ring-draw-late" />
      </svg>

      <div className="relative rounded-3xl border border-border bg-card p-6 shadow-[0_24px_60px_-30px] shadow-primary/40 sm:p-8">
        <p className="text-sm text-muted-foreground">Sábado 14 de marzo</p>
        <p className="mt-1 font-heading text-3xl font-semibold text-primary sm:text-4xl">Ana &amp; Luis</p>
        <p className="mt-4 flex items-baseline gap-2">
          <span className="font-heading text-6xl font-semibold tabular-nums text-foreground">124</span>
          <span className="text-muted-foreground">días para la boda</span>
        </p>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-secondary/60 p-4">
            <p className="text-xs text-muted-foreground">Confirmados</p>
            <p className="mt-1 text-xl font-semibold tabular-nums">
              86 <span className="text-sm font-normal text-muted-foreground">de 120</span>
            </p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-background">
              <div className="h-full w-[72%] rounded-full bg-primary" />
            </div>
          </div>
          <div className="rounded-2xl bg-accent/70 p-4">
            <p className="text-xs text-muted-foreground">Presupuesto usado</p>
            <p className="mt-1 text-xl font-semibold tabular-nums">
              64<span className="text-sm font-normal text-muted-foreground">%</span>
            </p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-background">
              <div className="h-full w-[64%] rounded-full bg-decorative" />
            </div>
          </div>
        </div>

        <ul className="mt-6 space-y-2.5 border-t border-border pt-5">
          {timeline.map((item) => (
            <li key={item.time} className="flex items-center gap-3 text-sm">
              <span className="w-12 font-medium tabular-nums text-primary">{item.time}</span>
              <span className="text-foreground">{item.title}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
