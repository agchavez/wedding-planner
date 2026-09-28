import type { Metadata } from "next";
import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import { CalendarClock, LayoutGrid, ListMusic, Receipt, UserRoundPlus, Users } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import { Button } from "@/components/ui/button";
import { WEDDING_ROLES } from "@/lib/permissions";
import { cn } from "@/lib/utils";

// Fotos de dominio público (CC0), ver images/CREDITOS.md.
import heroConfeti from "./images/hero-confeti.webp";
import heroNovia from "./images/hero-novia.webp";
import heroCaminando from "./images/hero-caminando.webp";
import invitados from "./images/invitados.webp";
import presupuesto from "./images/presupuesto.webp";
import musica from "./images/musica.webp";
import horario from "./images/horario.webp";
import salon from "./images/salon.webp";
import equipo from "./images/equipo.webp";
import tiraRamo from "./images/tira-ramo.webp";
import tiraMesas from "./images/tira-mesas.webp";
import tiraAtardecer from "./images/tira-atardecer.webp";
import tiraAbrazo from "./images/tira-abrazo.webp";
import tiraBrindis from "./images/tira-brindis.webp";
import tiraBeso from "./images/tira-beso.webp";
import tiraCeremonia from "./images/tira-ceremonia.webp";
import tiraAnillos from "./images/tira-anillos.webp";
import tiraPradera from "./images/tira-pradera.webp";
import cierreJardin from "./images/cierre-jardin.webp";

export const metadata: Metadata = {
  title: "Wedplan · Planifiquen su boda juntos",
  description:
    "Invitados, presupuesto, música, horario y el salón de tu boda en un solo lugar, compartido con tu pareja y quien les ayude a organizarla.",
};

const FEATURES = [
  {
    icon: Users,
    image: invitados,
    title: "Invitados y confirmaciones",
    text: "Grupos, acompañantes, restricciones de comida y quién ya confirmó. Asigna cada invitado a su mesa.",
  },
  {
    icon: Receipt,
    image: presupuesto,
    title: "Presupuesto y pagos",
    text: "Categorías con su tope, gastos por proveedor y avisos cuando un pago está por vencer o te pasaste.",
  },
  {
    icon: ListMusic,
    image: musica,
    title: "Música",
    text: "La entrada, el primer baile, la fiesta y la lista de lo que el DJ no debe tocar.",
  },
  {
    icon: CalendarClock,
    image: horario,
    title: "Horario del día",
    text: "Cada momento con su hora y duración, separado por evento: ceremonia, recepción, fiesta.",
  },
  {
    icon: LayoutGrid,
    image: salon,
    title: "Distribución del salón",
    text: "Arrastra mesas, sillas, pista y escenario sobre un plano. Ve cuántos lugares quedan libres.",
  },
  {
    icon: UserRoundPlus,
    image: equipo,
    title: "Organización en equipo",
    text: "Invita a tu pareja, familia o wedding planner con un enlace y decide qué puede hacer cada uno.",
  },
];

const STRIP: { src: StaticImageData; alt: string }[] = [
  { src: tiraRamo, alt: "Ramo de flores rosas" },
  { src: tiraMesas, alt: "Mesas de la recepción con centros de flores" },
  { src: tiraAtardecer, alt: "Pareja de novios frente a un lago al atardecer" },
  { src: tiraAbrazo, alt: "Novios abrazados con el ramo" },
  { src: tiraBrindis, alt: "Novio con dos copas para el brindis" },
  { src: tiraBeso, alt: "Beso de los novios sobre el césped" },
  { src: tiraCeremonia, alt: "Novios de pie durante la ceremonia" },
  { src: tiraAnillos, alt: "Manos de los novios con sus anillos" },
  { src: tiraPradera, alt: "Novios sentados en una pradera" },
];

export default function LandingPage() {
  return (
    <div className="min-h-svh overflow-x-clip bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-transparent bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
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
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto grid max-w-6xl items-center gap-14 px-5 pt-10 pb-16 sm:px-8 lg:grid-cols-[1fr_1.05fr] lg:pt-16 lg:pb-24">
          <div>
            <p className="fade-up text-sm font-medium tracking-[0.2em] text-decorative uppercase">Planificador de bodas</p>
            <h1
              className="fade-up mt-4 font-heading text-5xl leading-[1.05] font-semibold tracking-tight text-foreground sm:text-6xl lg:text-7xl"
              style={{ animationDelay: "80ms" }}
            >
              Su boda, organizada <em className="text-primary">entre todos.</em>
            </h1>
            <p
              className="fade-up mt-6 max-w-lg text-lg leading-relaxed text-muted-foreground"
              style={{ animationDelay: "160ms" }}
            >
              Invitados, presupuesto, música, horario y el salón en un solo lugar, compartido con tu pareja y con quien les
              ayude a organizarla.
            </p>
            <div className="fade-up mt-8 flex flex-wrap items-center gap-3" style={{ animationDelay: "240ms" }}>
              <Button nativeButton={false} render={<Link href="/registro" />} className="h-12 px-6 text-base">
                Crear mi boda
              </Button>
              <Button variant="outline" nativeButton={false} render={<Link href="/login" />} className="h-12 px-6 text-base">
                Ya tengo cuenta
              </Button>
            </div>
            <p className="fade-up mt-4 text-sm text-muted-foreground" style={{ animationDelay: "320ms" }}>
              ¿Te invitaron? Abre el enlace que te enviaron.
            </p>
          </div>

          <HeroCollage />
        </section>

        {/* Tira de fotos en movimiento */}
        <section aria-label="Momentos de boda" className="py-6">
          <p className="mb-6 text-center font-heading text-2xl text-foreground italic sm:text-3xl">
            Del &ldquo;sí, acepto&rdquo; a la última canción.
          </p>
          <div className="marquee [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
            <ul className="marquee-track flex gap-4">
              {[...STRIP, ...STRIP].map((photo, i) => (
                <li
                  key={i}
                  aria-hidden={i >= STRIP.length}
                  className={cn(
                    "relative h-44 shrink-0 overflow-hidden rounded-2xl sm:h-56",
                    i % 3 === 1 ? "w-36 sm:w-44" : "w-60 sm:w-80"
                  )}
                >
                  <Image
                    src={photo.src}
                    alt={i >= STRIP.length ? "" : photo.alt}
                    fill
                    sizes="320px"
                    placeholder="blur"
                    className="object-cover"
                  />
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Funciones */}
        <section className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
          <h2 className="reveal max-w-2xl font-heading text-3xl font-semibold leading-tight sm:text-4xl">
            Todo lo que hoy vive en cinco hojas de cálculo y un grupo de WhatsApp.
          </h2>
          <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <li key={f.title} className="reveal group overflow-hidden rounded-3xl border border-border bg-card">
                <div className="relative aspect-[4/3] overflow-hidden">
                  <Image
                    src={f.image}
                    alt=""
                    fill
                    sizes="(min-width: 1024px) 360px, (min-width: 640px) 50vw, 100vw"
                    placeholder="blur"
                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
                  <span className="absolute bottom-4 left-4 flex size-10 items-center justify-center rounded-full bg-card/90 text-primary shadow-sm backdrop-blur">
                    <f.icon className="size-5" />
                  </span>
                </div>
                <div className="p-6">
                  <h3 className="font-heading text-xl font-semibold text-foreground">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* Roles */}
        <section className="border-y border-border bg-secondary/40">
          <div className="mx-auto grid max-w-6xl gap-10 px-5 py-20 sm:px-8 lg:grid-cols-[1fr_1.4fr]">
            <div className="reveal">
              <h2 className="font-heading text-3xl font-semibold leading-tight sm:text-4xl">Cada quien con su parte.</h2>
              <p className="mt-4 max-w-md leading-relaxed text-muted-foreground">
                La pareja decide quién entra y qué puede tocar. Tu mamá puede ver el horario sin mover el presupuesto; tu
                wedding planner puede editarlo todo.
              </p>
            </div>
            <ol className="grid gap-3 sm:grid-cols-2">
              {WEDDING_ROLES.map((role, i) => (
                <li
                  key={role.value}
                  className="reveal rounded-2xl border border-border bg-card p-5 transition-shadow hover:shadow-lg hover:shadow-primary/10"
                >
                  <span className="font-heading text-sm text-decorative">0{i + 1}</span>
                  <p className="mt-1 font-heading text-xl font-semibold text-foreground">{role.label}</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{role.description}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Cierre */}
        <section className="px-5 py-20 sm:px-8">
          <div className="reveal relative mx-auto max-w-6xl overflow-hidden rounded-3xl px-6 py-24 text-center text-white sm:px-12 sm:py-32">
            <Image
              src={cierreJardin}
              alt="Columpio frente a las sillas de una ceremonia en un jardín"
              fill
              sizes="(min-width: 1152px) 1152px, 100vw"
              placeholder="blur"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/35 to-black/65" />
            <div className="pointer-events-none absolute inset-3 rounded-[1.25rem] border border-white/30" />
            <h2 className="relative font-heading text-4xl font-semibold sm:text-6xl">Empiecen hoy.</h2>
            <p className="relative mx-auto mt-4 max-w-md text-white/85">
              Crear su boda toma un minuto. Luego inviten a quien quieran.
            </p>
            <Button
              variant="secondary"
              nativeButton={false}
              render={<Link href="/registro" />}
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
          <p className="text-xs">Fotos de dominio público (CC0) de StockSnap y Wikimedia Commons.</p>
          <Link href="/login" className="hover:text-foreground">
            Iniciar sesión
          </Link>
        </div>
      </footer>
    </div>
  );
}

/** Collage de fotos en arcos con una vista previa del panel encima. */
function HeroCollage() {
  const timeline = [
    { time: "16:00", title: "Ceremonia en el jardín" },
    { time: "17:30", title: "Cóctel y fotos" },
    { time: "19:00", title: "Entrada de los novios" },
  ];

  return (
    <div className="relative mx-auto w-full max-w-lg lg:max-w-none">
      <svg
        viewBox="0 0 220 140"
        aria-hidden="true"
        className="absolute -top-12 -left-8 z-10 w-36 text-decorative sm:-top-16 sm:-left-14 sm:w-48"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
      >
        <circle cx="82" cy="78" r="50" strokeWidth="2" pathLength={1} className="ring-draw" />
        <circle cx="138" cy="78" r="50" strokeWidth="2" pathLength={1} className="ring-draw ring-draw-late" />
      </svg>

      <div className="grid grid-cols-[1.15fr_1fr] gap-3 sm:gap-4">
        <div className="float-slow relative row-span-2 aspect-[3/4.4] overflow-hidden rounded-t-full rounded-b-3xl shadow-xl shadow-primary/20">
          <Image
            src={heroConfeti}
            alt="Invitados lanzando confeti a los novios al salir de la ceremonia"
            fill
            preload
            sizes="(min-width: 1024px) 320px, 55vw"
            placeholder="blur"
            className="object-cover"
          />
        </div>
        <div
          className="float-slow relative aspect-[4/5] overflow-hidden rounded-t-full rounded-b-3xl shadow-lg shadow-primary/15"
          style={{ animationDelay: "-2.5s" }}
        >
          <Image
            src={heroNovia}
            alt="Novia sonriendo con su ramo en un jardín"
            fill
            sizes="(min-width: 1024px) 280px, 45vw"
            placeholder="blur"
            className="object-cover object-top"
          />
        </div>
        <div
          className="float-slow relative aspect-square overflow-hidden rounded-3xl shadow-lg shadow-primary/15"
          style={{ animationDelay: "-5s" }}
        >
          <Image
            src={heroCaminando}
            alt="Novios caminando de la mano"
            fill
            sizes="(min-width: 1024px) 280px, 45vw"
            placeholder="blur"
            className="object-cover"
          />
        </div>
      </div>

      {/* Vista previa del panel */}
      <div
        aria-hidden="true"
        className="fade-up relative -mt-24 ml-auto w-[88%] rounded-3xl border border-border bg-card/95 p-5 shadow-[0_24px_60px_-24px] shadow-primary/40 backdrop-blur sm:-mt-32 sm:w-[70%] lg:-ml-10 lg:mr-0"
        style={{ animationDelay: "400ms" }}
      >
        <div className="flex items-baseline justify-between gap-3">
          <p className="font-heading text-2xl font-semibold text-primary">Ana &amp; Luis</p>
          <p className="text-xs text-muted-foreground">Sáb. 14 de marzo</p>
        </div>
        <p className="mt-2 flex items-baseline gap-2">
          <span className="font-heading text-4xl font-semibold tabular-nums text-foreground">124</span>
          <span className="text-sm text-muted-foreground">días para la boda</span>
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-secondary/60 p-3">
            <p className="text-[11px] text-muted-foreground">Confirmados</p>
            <p className="text-lg font-semibold tabular-nums">
              86 <span className="text-xs font-normal text-muted-foreground">de 120</span>
            </p>
            <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-background">
              <div className="grow-bar h-full w-[72%] rounded-full bg-primary" />
            </div>
          </div>
          <div className="rounded-xl bg-accent/70 p-3">
            <p className="text-[11px] text-muted-foreground">Presupuesto usado</p>
            <p className="text-lg font-semibold tabular-nums">
              64<span className="text-xs font-normal text-muted-foreground">%</span>
            </p>
            <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-background">
              <div className="grow-bar h-full w-[64%] rounded-full bg-decorative" />
            </div>
          </div>
        </div>
        <ul className="mt-3 space-y-1.5 border-t border-border pt-3">
          {timeline.map((item) => (
            <li key={item.time} className="flex items-center gap-3 text-xs">
              <span className="w-10 font-medium tabular-nums text-primary">{item.time}</span>
              <span className="text-foreground">{item.title}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
