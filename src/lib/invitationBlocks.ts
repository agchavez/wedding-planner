/**
 * Invitación por bloques: la invitación es una lista ordenada de bloques `{ id, type,
 * hidden, props }` más un diseño (tema) y la canción, que es global.
 *
 * Cómo conviven con los campos de InvitationSettings (headline, coverImageUrl,
 * galleryUrls…), que siguen usando la tarjeta de WhatsApp, los metadatos, el calendario
 * .ics y las herramientas MCP:
 *
 * - Los bloques guardan su propio contenido (son autosuficientes), así un borrador puede
 *   cambiar sin que lo vean los invitados.
 * - Al publicar, el diseño publicado se "proyecta" a esos campos (`projectDesign`): siempre
 *   reflejan lo que ven los invitados.
 * - Cuando algo edita esos campos directamente (update_invitation_design por MCP), el mismo
 *   cambio se aplica al borrador y a lo publicado con `patchDesign`, así fluye a los bloques
 *   (coverImageUrl → foto de la portada, galleryUrls → galería, etc.).
 * - Si no hay diseño guardado (invitaciones anteriores al editor), se deriva de los campos
 *   con `designFromData`: no se pierde nada y no hace falta migrar la base.
 *
 * Este módulo es puro (sin servidor ni React) para usarse igual en el editor, la vista y
 * las acciones.
 */

import { designThemeFor, isDesignTheme, ITINERARY_ICONS, type DesignTheme, type ItineraryEntry } from "@/lib/invitationThemes";
import type { InvitationData } from "@/lib/guestInvitations";
import { uploadedSongOwner } from "@/lib/songFiles";

export const BLOCK_TYPES = [
  "cover",
  "guestMessage",
  "verse",
  "countdown",
  "featuredPhoto",
  "program",
  "ceremony",
  "reception",
  "dressCode",
  "gallery",
  "gifts",
  "recommendations",
  "rsvp",
  "closing",
] as const;

export type BlockType = (typeof BLOCK_TYPES)[number];

export type EventProps = {
  title: string;
  /** Hora del evento como valor de input datetime-local ("2026-12-12T15:30", hora de Honduras). */
  time: string;
  place: string;
  address: string;
  mapUrl: string;
  /** Línea bajo el lugar, ej. "Ceremonia y recepción". */
  note: string;
  showMap: boolean;
  photoUrl: string;
  framing: Framing;
};

/**
 * Encuadre de una foto: punto de enfoque (x, y en %) y zoom (1 = sin zoom). Se guarda por foto en
 * `framing` del bloque: la clave es el nombre de la propiedad ("photoUrl", "openingPhotoUrl") o,
 * en la galería, la URL de la foto.
 */
export type PhotoFraming = { x: number; y: number; z: number };
export type Framing = Record<string, PhotoFraming>;

export const DEFAULT_FRAMING: PhotoFraming = { x: 50, y: 50, z: 1 };

/** Estilo de <img> (object-fit: cover) para un encuadre; vacío si no hay ajuste. */
export function framingStyle(f: PhotoFraming | undefined): { objectPosition?: string; scale?: string; transformOrigin?: string } {
  if (!f) return {};
  const pos = `${f.x}% ${f.y}%`;
  return { objectPosition: pos, ...(f.z > 1 ? { scale: String(f.z), transformOrigin: pos } : {}) };
}

const DRIVE_RE = /^(https:\/\/lh3\.googleusercontent\.com\/d\/[\w-]+)=w\d+(?:-rw)?$/;
const DRIVE_WIDTHS = [480, 720, 1080, 1440, 2000];

/**
 * Fotos de Drive en el tamaño justo: `src` liviano y `srcSet` con varios anchos en WebP ("-rw"),
 * para que cada celular descargue solo lo que necesita. Otras URLs se dejan igual.
 */
export function responsiveImage(url: string, fallbackWidth = 1080): { src: string; srcSet?: string } {
  const m = DRIVE_RE.exec(url);
  if (!m) return { src: url };
  return {
    src: `${m[1]}=w${fallbackWidth}-rw`,
    srcSet: DRIVE_WIDTHS.map((w) => `${m[1]}=w${w}-rw ${w}w`).join(", "),
  };
}

/** Una foto de Drive a un ancho fijo (fondos y miniaturas). */
export function driveImageAt(url: string, width: number) {
  const m = DRIVE_RE.exec(url);
  return m ? `${m[1]}=w${width}-rw` : url;
}

function cleanFraming(value: unknown): Framing {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: Framing = {};
  const clamp = (n: unknown, min: number, max: number, def: number) =>
    typeof n === "number" && Number.isFinite(n) ? Math.round(Math.min(max, Math.max(min, n)) * 100) / 100 : def;
  for (const [key, raw] of Object.entries(value as Record<string, unknown>).slice(0, 24)) {
    if (!key || key.length > 2000 || !raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    out[key] = { x: clamp(r.x, 0, 100, 50), y: clamp(r.y, 0, 100, 50), z: clamp(r.z, 1, 3, 1) };
  }
  return out;
}

export type BlockPropsMap = {
  /**
   * Portada y pantalla de apertura. `openingPhotoUrl` vacío = la misma foto de portada;
   * `marquee`: frases de la cinta, una por línea (vacío = se arman con la fecha y el lugar).
   */
  cover: {
    headline: string;
    kicker: string;
    photoUrl: string;
    openingPhotoUrl: string;
    openingKicker: string;
    marquee: string;
    framing: Framing;
  };
  guestMessage: {
    message: string;
    showSeats: boolean;
    photoUrl: string;
    framing: Framing;
    caption: string;
    brideParents: string;
    groomParents: string;
    sponsors: string;
  };
  verse: { text: string; reference: string };
  countdown: { title: string; showCalendar: boolean };
  featuredPhoto: { photoUrl: string; caption: string; framing: Framing };
  program: { title: string; items: ItineraryEntry[] };
  ceremony: EventProps;
  reception: EventProps;
  dressCode: {
    title: string;
    code: string;
    note: string;
    colors: string[];
    showIcons: boolean;
    /** Colores que se pide no usar (el ícono "sin verde" muestra estos tonos). */
    avoidColors: string[];
    /** Etiqueta bajo ese ícono; vacía = "Sin verde". */
    avoidLabel: string;
  };
  gallery: { title: string; photos: string[]; framing: Framing };
  gifts: { title: string; note: string; bankName: string; account: string; holder: string; registryUrl: string };
  recommendations: { title: string; adultsOnly: boolean; adultsOnlyText: string; items: string };
  /** `deadline`: "YYYY-MM-DD" o vacío. */
  rsvp: { title: string; deadline: string };
  closing: { kicker: string; message: string; hashtag: string; photoUrl: string; framing: Framing };
};

export type BlockOf<T extends BlockType> = { id: string; type: T; hidden: boolean; props: BlockPropsMap[T] };
export type InvitationBlock = { [K in BlockType]: BlockOf<K> }[BlockType];

export type InvitationDesign = {
  v: 1;
  theme: DesignTheme;
  song: { url: string; title: string };
  blocks: InvitationBlock[];
};

export const BLOCK_INFO: Record<BlockType, { label: string; description: string; removable: boolean }> = {
  cover: { label: "Portada", description: "Nombres, frase y foto, con la animación de apertura", removable: true },
  guestMessage: { label: "Mensaje para el invitado", description: "Saludo con su nombre, lugares y familia", removable: true },
  verse: { label: "Versículo", description: "Una cita o versículo", removable: true },
  countdown: { label: "Cuenta regresiva", description: "Fecha, días que faltan y agregar al calendario", removable: true },
  featuredPhoto: { label: "Foto destacada", description: "Una foto grande con un texto", removable: true },
  program: { label: "Programa del día", description: "Horario de cada momento", removable: true },
  ceremony: { label: "Ceremonia", description: "Hora, lugar y mapa", removable: true },
  reception: { label: "Recepción", description: "Lugar y mapa de la fiesta", removable: true },
  dressCode: { label: "Vestimenta", description: "Código, nota y colores", removable: true },
  gallery: { label: "Galería", description: "Fotos de la pareja", removable: true },
  gifts: { label: "Regalos", description: "Mensaje, cuenta y mesa de regalos", removable: true },
  recommendations: { label: "Recomendaciones", description: "Solo adultos y consejos", removable: true },
  rsvp: { label: "Confirmación (RSVP)", description: "El invitado confirma su asistencia", removable: false },
  closing: { label: "Cierre", description: "Despedida, hashtag y foto", removable: true },
};

export const DEFAULT_PROPS: { [K in BlockType]: BlockPropsMap[K] } = {
  cover: {
    headline: "¡Nos casamos!",
    kicker: "Vol. 01",
    photoUrl: "",
    openingPhotoUrl: "",
    openingKicker: "Edición especial",
    marquee: "",
    framing: {},
  },
  guestMessage: {
    message:
      "Con la bendición de Dios y de nuestras familias, tenemos el honor de invitarte a celebrar el día en que uniremos nuestras vidas.",
    showSeats: true,
    photoUrl: "",
    framing: {},
    caption: "Fig. 01 — Nosotros",
    brideParents: "",
    groomParents: "",
    sponsors: "",
  },
  verse: { text: "", reference: "" },
  countdown: { title: "Faltan", showCalendar: true },
  featuredPhoto: { photoUrl: "", caption: "", framing: {} },
  program: { title: "El programa", items: [] },
  ceremony: { title: "El lugar", time: "", place: "", address: "", mapUrl: "", note: "", showMap: true, photoUrl: "", framing: {} },
  reception: { title: "La recepción", time: "", place: "", address: "", mapUrl: "", note: "", showMap: false, photoUrl: "", framing: {} },
  dressCode: { title: "Vestimenta", code: "Formal", note: "", colors: [], showIcons: true, avoidColors: [], avoidLabel: "" },
  gallery: { title: "Portafolio", photos: [], framing: {} },
  gifts: {
    title: "Regalos",
    note: "Tu presencia es nuestro mejor regalo. Si deseas tener un detalle con nosotros, te dejamos esta opción.",
    bankName: "",
    account: "",
    holder: "",
    registryUrl: "",
  },
  recommendations: {
    title: "Nota importante",
    adultsOnly: false,
    adultsOnlyText: "Amamos a los niños, pero esta será una celebración solo para adultos. ¡Tómense la noche libre y disfruten con nosotros!",
    items: "",
  },
  rsvp: { title: "Confirma tu asistencia", deadline: "" },
  closing: { kicker: "", message: "No vemos la hora de celebrar contigo.", hashtag: "", photoUrl: "", framing: {} },
};

const MAX_BLOCKS = 40;

/* ------------------------------------------------------------------------------------ */
/* Utilidades                                                                           */
/* ------------------------------------------------------------------------------------ */

export function newBlockId() {
  return `b${Math.random().toString(36).slice(2, 10)}`;
}

export function createBlock<T extends BlockType>(type: T, props?: Partial<BlockPropsMap[T]>, hidden = false): BlockOf<T> {
  return { id: newBlockId(), type, hidden, props: structuredClone({ ...DEFAULT_PROPS[type], ...props }) as BlockPropsMap[T] };
}

export const isBlockType = (v: unknown): v is BlockType => typeof v === "string" && (BLOCK_TYPES as readonly string[]).includes(v);

export function findBlock<T extends BlockType>(design: InvitationDesign, type: T, visibleOnly = false): BlockOf<T> | undefined {
  return design.blocks.find((b) => b.type === type && (!visibleOnly || !b.hidden)) as BlockOf<T> | undefined;
}

/** Solo http(s) o fotos de ejemplo de la app (/ejemplos/…); nunca javascript:, data:, etc. */
export function isSafeImageUrl(url: string) {
  return /^https?:\/\/[^\s]+$/i.test(url) || /^\/ejemplos\/[\w/.-]+\.(jpe?g|png|webp)$/i.test(url);
}

export const isSafeLinkUrl = (url: string) => /^https?:\/\/[^\s]+$/i.test(url);

/** Canción: un enlace http(s) a un audio o una canción subida a este servidor (/api/cancion/…). */
export const isSafeSongUrl = (url: string) => isSafeLinkUrl(url) || uploadedSongOwner(url) !== null;

/** URL directa de Google Drive para una foto (sin redirecciones: la tarjeta de WhatsApp no las sigue). */
export const driveImageUrl = (driveFileId: string) => `https://lh3.googleusercontent.com/d/${driveFileId}=w2000`;

const DATETIME_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const EVENT_UTC_OFFSET = "-06:00";

/** "2026-12-12T15:30" (hora de Honduras) → ISO. Igual que parseEventDateTime, sin dependencias. */
export function eventTimeToIso(value: string): string | null {
  if (!DATETIME_RE.test(value)) return null;
  const d = new Date(`${value}:00${EVENT_UTC_OFFSET}`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** ISO → "2026-12-12T15:30" en hora de Honduras (UTC-6 fijo, sin horario de verano). */
export function isoToEventTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Date(d.getTime() - 6 * 3_600_000).toISOString().slice(0, 16);
}

/** "Texto — Referencia" → partes (la referencia va tras la última raya o guion largo). */
export function splitQuote(quote: string): { text: string; reference: string } {
  const q = quote.trim();
  const m = q.match(/^([\s\S]*\S)\s+[—–-]\s+([^—–\n]{2,60})$/);
  const strip = (s: string) => s.replace(/^["“”«»]+|["“”«»]+$/g, "").trim();
  return m ? { text: strip(m[1]), reference: m[2].trim() } : { text: strip(q), reference: "" };
}

export function joinQuote(text: string, reference: string) {
  return [text.trim(), reference.trim()].filter(Boolean).join(" — ");
}

/* ------------------------------------------------------------------------------------ */
/* Migración: campos anteriores → bloques                                               */
/* ------------------------------------------------------------------------------------ */

type DesignSource = Pick<
  InvitationData,
  | "theme"
  | "headline"
  | "message"
  | "quote"
  | "coverImageUrl"
  | "ceremonyTime"
  | "ceremonyPlace"
  | "ceremonyAddress"
  | "ceremonyMapUrl"
  | "receptionTime"
  | "receptionPlace"
  | "receptionAddress"
  | "receptionMapUrl"
  | "dressCode"
  | "dressCodeNote"
  | "giftsNote"
  | "hashtag"
  | "rsvpDeadline"
  | "showCountdown"
  | "brideParents"
  | "groomParents"
  | "sponsors"
  | "itinerary"
  | "dressCodeColors"
  | "giftBankName"
  | "giftAccount"
  | "giftAccountHolder"
  | "giftRegistryUrl"
  | "galleryUrls"
  | "songUrl"
  | "songTitle"
  | "adultsOnly"
  | "recommendations"
  | "closingMessage"
> &
  Partial<Pick<InvitationData, "venueName" | "venueAddress">>;

/** Lista de bloques por defecto a partir de los campos actuales (nada se pierde). */
export function designFromData(d: DesignSource): InvitationDesign {
  const gallery = (d.galleryUrls ?? []).filter(isSafeImageUrl);
  const verse = splitQuote(d.quote ?? "");
  const hasCeremony = Boolean(d.ceremonyPlace || d.ceremonyTime);
  const hasReception = Boolean(d.receptionPlace || d.receptionTime);
  const fallbackVenue = !hasCeremony && !hasReception && Boolean(d.venueName || d.venueAddress);
  const sameVenue = hasReception && d.receptionPlace === d.ceremonyPlace;
  const hasGifts = Boolean(d.giftsNote || d.giftAccount || d.giftRegistryUrl);

  const blocks: InvitationBlock[] = [
    createBlock("cover", { headline: d.headline || DEFAULT_PROPS.cover.headline, photoUrl: d.coverImageUrl ?? "" }),
    createBlock("guestMessage", {
      message: d.message || DEFAULT_PROPS.guestMessage.message,
      brideParents: d.brideParents ?? "",
      groomParents: d.groomParents ?? "",
      sponsors: d.sponsors ?? "",
      photoUrl: gallery[0] ?? "",
    }),
    createBlock("verse", verse, !verse.text),
    createBlock("countdown", {}, !d.showCountdown),
    createBlock("featuredPhoto", {}, true),
    createBlock(
      "ceremony",
      {
        time: isoToEventTime(d.ceremonyTime),
        place: fallbackVenue ? (d.venueName ?? "") : d.ceremonyPlace,
        address: fallbackVenue ? (d.venueAddress ?? "") : d.ceremonyAddress,
        mapUrl: d.ceremonyMapUrl,
        note: sameVenue ? "Ceremonia y recepción" : "",
        photoUrl: gallery[1] ?? "",
      },
      !hasCeremony && !fallbackVenue
    ),
    createBlock(
      "reception",
      {
        time: isoToEventTime(d.receptionTime),
        place: d.receptionPlace,
        address: d.receptionAddress,
        mapUrl: d.receptionMapUrl,
        showMap: hasReception && !sameVenue,
      },
      !hasReception || sameVenue
    ),
    createBlock("program", { items: (d.itinerary ?? []).map((i) => ({ time: i.time, title: i.title, icon: i.icon })) }, !d.itinerary?.length),
    createBlock(
      "dressCode",
      {
        code: d.dressCode ?? "",
        note: d.dressCodeNote ?? "",
        colors: d.dressCodeColors ?? [],
        showIcons: Boolean(d.dressCode),
        // Si la nota pide no usar verde, se precargan tonos de verde (editables en el bloque).
        avoidColors: /verde/i.test(d.dressCodeNote ?? "") ? ["#5f7a3a", "#8fa66b", "#1f7a4d", "#9fd8b4"] : [],
        avoidLabel: "",
      },
      !d.dressCode && !d.dressCodeColors?.length
    ),
    createBlock("gallery", { photos: gallery }, gallery.length === 0),
    createBlock(
      "gifts",
      {
        note: d.giftsNote || (hasGifts ? "" : DEFAULT_PROPS.gifts.note),
        bankName: d.giftBankName,
        account: d.giftAccount,
        holder: d.giftAccountHolder,
        registryUrl: d.giftRegistryUrl,
      },
      !hasGifts
    ),
    createBlock("rsvp", { deadline: d.rsvpDeadline ? d.rsvpDeadline.slice(0, 10) : "" }),
    createBlock("recommendations", { adultsOnly: d.adultsOnly, items: d.recommendations ?? "" }, !d.adultsOnly && !d.recommendations),
    createBlock("closing", {
      message: d.closingMessage || DEFAULT_PROPS.closing.message,
      hashtag: d.hashtag ?? "",
      kicker: (d.recommendations ?? "").split("\n")[0]?.trim() ?? "",
      photoUrl: gallery.at(-1) ?? (isSafeImageUrl(d.coverImageUrl ?? "") ? d.coverImageUrl : ""),
    }),
  ];

  // Ids fijos (el tipo): el diseño derivado es el mismo en cada lectura, así el borrador
  // derivado y el publicado derivado no aparecen como "cambios sin publicar".
  for (const b of blocks) b.id = b.type;
  return { v: 1, theme: designThemeFor(d.theme), song: { url: d.songUrl ?? "", title: d.songTitle ?? "" }, blocks };
}

/* ------------------------------------------------------------------------------------ */
/* Saneamiento (todo lo que llega del cliente o de la base pasa por aquí)               */
/* ------------------------------------------------------------------------------------ */

const text = (value: unknown, max: number) => (typeof value === "string" ? value.trim().slice(0, max) : "");
/** Como `text` pero sin recortar espacios: mientras se escribe en el editor no se comen los espacios. */
const draftText = (value: unknown, max: number) => (typeof value === "string" ? value.slice(0, max) : "");

const LIMITS: Record<string, number> = {
  headline: 80,
  kicker: 80,
  openingKicker: 80,
  marquee: 400,
  message: 1500,
  brideParents: 300,
  groomParents: 300,
  sponsors: 800,
  text: 400,
  reference: 80,
  title: 80,
  caption: 200,
  place: 120,
  address: 200,
  code: 80,
  note: 800,
  bankName: 80,
  account: 60,
  holder: 100,
  adultsOnlyText: 400,
  items: 800,
  hashtag: 60,
};

const URL_KEYS = new Set(["photoUrl", "openingPhotoUrl", "mapUrl", "registryUrl"]);

function cleanUrl(key: string, value: unknown) {
  const url = text(value, 2000);
  if (!url) return "";
  return key.endsWith("hotoUrl") ? (isSafeImageUrl(url) ? url : "") : isSafeLinkUrl(url) ? url : "";
}

function cleanItinerary(items: unknown, trim: boolean): ItineraryEntry[] {
  if (!Array.isArray(items)) return [];
  const t = trim ? text : draftText;
  return items.slice(0, 15).map((i) => ({
    time: t(i?.time, 20),
    title: t(i?.title, 80),
    icon: typeof i?.icon === "string" && i.icon in ITINERARY_ICONS ? i.icon : "heart",
  }));
}

function cleanProps<T extends BlockType>(type: T, raw: unknown, trim: boolean): BlockPropsMap[T] {
  const src = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const defaults = DEFAULT_PROPS[type] as Record<string, unknown>;
  const t = trim ? text : draftText;
  const out: Record<string, unknown> = {};
  for (const [key, def] of Object.entries(defaults)) {
    const value = key in src ? src[key] : def;
    if (key === "framing") out[key] = cleanFraming(value);
    else if (URL_KEYS.has(key)) out[key] = cleanUrl(key, value);
    else if (key === "time") out[key] = typeof value === "string" && DATETIME_RE.test(value) ? value : "";
    else if (key === "deadline") out[key] = typeof value === "string" && DATE_RE.test(value) ? value : "";
    else if (key === "colors" || key === "avoidColors")
      out[key] = Array.isArray(value) ? value.filter((c): c is string => typeof c === "string" && /^#[0-9a-f]{6}$/i.test(c)).slice(0, 6) : [];
    else if (key === "photos")
      out[key] = Array.isArray(value)
        ? [...new Set(value.map((u) => text(u, 2000)).filter(isSafeImageUrl))].slice(0, 12)
        : [];
    else if (key === "items" && type === "program") {
      const items = cleanItinerary(value, trim);
      out[key] = trim ? items.filter((i) => i.title) : items;
    } else if (typeof def === "boolean") out[key] = typeof value === "boolean" ? value : def;
    else out[key] = t(value, LIMITS[key] ?? 300);
  }
  return out as BlockPropsMap[T];
}

/**
 * Diseño válido a partir de cualquier valor (JSON de la base o del cliente). Garantiza un
 * único bloque de confirmación. `trim: false` para los borradores (no recorta espacios
 * finales mientras se escribe ni descarta filas vacías del programa).
 */
export function sanitizeDesign(raw: unknown, { trim = true }: { trim?: boolean } = {}): InvitationDesign | null {
  if (!raw || typeof raw !== "object") return null;
  const src = raw as Record<string, unknown>;
  if (!Array.isArray(src.blocks)) return null;
  const song = (src.song && typeof src.song === "object" ? src.song : {}) as Record<string, unknown>;
  const ids = new Set<string>();
  const blocks: InvitationBlock[] = [];
  let hasRsvp = false;
  for (const item of src.blocks.slice(0, MAX_BLOCKS)) {
    if (!item || typeof item !== "object") continue;
    const b = item as Record<string, unknown>;
    if (!isBlockType(b.type)) continue;
    if (b.type === "rsvp") {
      if (hasRsvp) continue;
      hasRsvp = true;
    }
    let id = typeof b.id === "string" && /^[\w-]{1,40}$/.test(b.id) ? b.id : newBlockId();
    while (ids.has(id)) id = newBlockId();
    ids.add(id);
    blocks.push({ id, type: b.type, hidden: b.type === "rsvp" ? false : Boolean(b.hidden), props: cleanProps(b.type, b.props, trim) } as InvitationBlock);
  }
  if (!hasRsvp) {
    const closing = blocks.findIndex((b) => b.type === "closing");
    blocks.splice(closing === -1 ? blocks.length : closing, 0, createBlock("rsvp"));
  }
  const songUrl = text(song.url, 2000);
  return {
    v: 1,
    theme: isDesignTheme(src.theme) ? src.theme : designThemeFor(typeof src.theme === "string" ? src.theme : ""),
    song: { url: isSafeSongUrl(songUrl) ? songUrl : "", title: text(song.title, 100) },
    blocks,
  };
}

export const designKey = (design: InvitationDesign) => JSON.stringify(sanitizeDesign(design));

/* ------------------------------------------------------------------------------------ */
/* Proyección a los campos de InvitationSettings                                        */
/* ------------------------------------------------------------------------------------ */

/** Campos de InvitationSettings que salen del diseño (formato de InvitationData: fechas ISO). */
export type ProjectedFields = Pick<
  InvitationData,
  | "theme"
  | "headline"
  | "message"
  | "quote"
  | "coverImageUrl"
  | "ceremonyTime"
  | "ceremonyPlace"
  | "ceremonyAddress"
  | "ceremonyMapUrl"
  | "receptionTime"
  | "receptionPlace"
  | "receptionAddress"
  | "receptionMapUrl"
  | "dressCode"
  | "dressCodeNote"
  | "giftsNote"
  | "hashtag"
  | "rsvpDeadline"
  | "showCountdown"
  | "brideParents"
  | "groomParents"
  | "sponsors"
  | "itinerary"
  | "dressCodeColors"
  | "giftBankName"
  | "giftAccount"
  | "giftAccountHolder"
  | "giftRegistryUrl"
  | "galleryUrls"
  | "songUrl"
  | "songTitle"
  | "adultsOnly"
  | "recommendations"
  | "closingMessage"
>;

/**
 * Lo que ven los invitados, en los campos de siempre. Se usa el primer bloque de cada tipo
 * (preferentemente visible); los ocultos conservan su contenido salvo los interruptores
 * (cuenta regresiva y solo adultos), que dependen de que el bloque se vea.
 */
export function projectDesign(design: InvitationDesign): ProjectedFields {
  const pick = <T extends BlockType>(type: T) => findBlock(design, type, true) ?? findBlock(design, type);
  const cover = pick("cover")?.props;
  const msg = pick("guestMessage")?.props;
  const verse = pick("verse");
  const countdown = findBlock(design, "countdown", true);
  const program = pick("program")?.props;
  const ceremony = pick("ceremony")?.props;
  const reception = pick("reception")?.props;
  const dress = pick("dressCode")?.props;
  const gallery = pick("gallery")?.props;
  const gifts = pick("gifts")?.props;
  const recs = pick("recommendations");
  const rsvp = pick("rsvp")?.props;
  const closing = pick("closing")?.props;
  return {
    theme: design.theme,
    headline: cover?.headline ?? "",
    coverImageUrl: cover?.photoUrl ?? "",
    message: msg?.message ?? "",
    brideParents: msg?.brideParents ?? "",
    groomParents: msg?.groomParents ?? "",
    sponsors: msg?.sponsors ?? "",
    quote: verse && !verse.hidden ? joinQuote(verse.props.text, verse.props.reference) : "",
    showCountdown: Boolean(countdown),
    itinerary: program?.items.filter((i) => i.title) ?? [],
    ceremonyTime: eventTimeToIso(ceremony?.time ?? ""),
    ceremonyPlace: ceremony?.place ?? "",
    ceremonyAddress: ceremony?.address ?? "",
    ceremonyMapUrl: ceremony?.mapUrl ?? "",
    receptionTime: eventTimeToIso(reception?.time ?? ""),
    receptionPlace: reception?.place ?? "",
    receptionAddress: reception?.address ?? "",
    receptionMapUrl: reception?.mapUrl ?? "",
    dressCode: dress?.code ?? "",
    dressCodeNote: dress?.note ?? "",
    dressCodeColors: dress?.colors ?? [],
    galleryUrls: (gallery?.photos ?? []).slice(0, 12),
    giftsNote: gifts?.note ?? "",
    giftBankName: gifts?.bankName ?? "",
    giftAccount: gifts?.account ?? "",
    giftAccountHolder: gifts?.holder ?? "",
    giftRegistryUrl: gifts?.registryUrl ?? "",
    adultsOnly: Boolean(recs && !recs.hidden && recs.props.adultsOnly),
    recommendations: recs?.props.items ?? "",
    rsvpDeadline: rsvp?.deadline ? `${rsvp.deadline}T00:00:00.000Z` : null,
    closingMessage: closing?.message ?? "",
    hashtag: closing?.hashtag ?? "",
    songUrl: design.song.url,
    songTitle: design.song.title,
  };
}

/* ------------------------------------------------------------------------------------ */
/* Cambios a los campos (MCP) → bloques                                                 */
/* ------------------------------------------------------------------------------------ */

/** Cambios en el formato de update_invitation_design (horas "YYYY-MM-DDTHH:mm", fecha límite "YYYY-MM-DD"). */
export type LegacyPatch = Partial<{
  theme: string;
  headline: string;
  message: string;
  quote: string;
  coverImageUrl: string;
  ceremonyTime: string;
  ceremonyPlace: string;
  ceremonyAddress: string;
  ceremonyMapUrl: string;
  receptionTime: string;
  receptionPlace: string;
  receptionAddress: string;
  receptionMapUrl: string;
  dressCode: string;
  dressCodeNote: string;
  giftsNote: string;
  hashtag: string;
  rsvpDeadline: string;
  showCountdown: boolean;
  brideParents: string;
  groomParents: string;
  sponsors: string;
  itinerary: ItineraryEntry[];
  dressCodeColors: string[];
  giftBankName: string;
  giftAccount: string;
  giftAccountHolder: string;
  giftRegistryUrl: string;
  galleryUrls: string[];
  songUrl: string;
  songTitle: string;
  adultsOnly: boolean;
  recommendations: string;
  closingMessage: string;
}>;

type FieldTarget = { type: BlockType; prop: string };

const FIELD_TARGETS: Record<string, FieldTarget> = {
  headline: { type: "cover", prop: "headline" },
  coverImageUrl: { type: "cover", prop: "photoUrl" },
  message: { type: "guestMessage", prop: "message" },
  brideParents: { type: "guestMessage", prop: "brideParents" },
  groomParents: { type: "guestMessage", prop: "groomParents" },
  sponsors: { type: "guestMessage", prop: "sponsors" },
  itinerary: { type: "program", prop: "items" },
  ceremonyTime: { type: "ceremony", prop: "time" },
  ceremonyPlace: { type: "ceremony", prop: "place" },
  ceremonyAddress: { type: "ceremony", prop: "address" },
  ceremonyMapUrl: { type: "ceremony", prop: "mapUrl" },
  receptionTime: { type: "reception", prop: "time" },
  receptionPlace: { type: "reception", prop: "place" },
  receptionAddress: { type: "reception", prop: "address" },
  receptionMapUrl: { type: "reception", prop: "mapUrl" },
  dressCode: { type: "dressCode", prop: "code" },
  dressCodeNote: { type: "dressCode", prop: "note" },
  dressCodeColors: { type: "dressCode", prop: "colors" },
  galleryUrls: { type: "gallery", prop: "photos" },
  giftsNote: { type: "gifts", prop: "note" },
  giftBankName: { type: "gifts", prop: "bankName" },
  giftAccount: { type: "gifts", prop: "account" },
  giftAccountHolder: { type: "gifts", prop: "holder" },
  giftRegistryUrl: { type: "gifts", prop: "registryUrl" },
  recommendations: { type: "recommendations", prop: "items" },
  rsvpDeadline: { type: "rsvp", prop: "deadline" },
  closingMessage: { type: "closing", prop: "message" },
  hashtag: { type: "closing", prop: "hashtag" },
};

const isFilled = (v: unknown) => (Array.isArray(v) ? v.length > 0 : typeof v === "string" ? v.trim() !== "" : Boolean(v));

/** Bloque del tipo indicado; si no existe, lo crea antes de la confirmación (o al final para el cierre). */
function ensureBlock(blocks: InvitationBlock[], type: BlockType): InvitationBlock {
  const existing = blocks.find((b) => b.type === type);
  if (existing) return existing;
  const block = createBlock(type, {}, false) as InvitationBlock;
  const at = type === "closing" ? -1 : blocks.findIndex((b) => b.type === "rsvp");
  if (at === -1) blocks.push(block);
  else blocks.splice(at, 0, block);
  return block;
}

/** Aplica cambios hechos a los campos de siempre (MCP) a un diseño guardado. */
export function patchDesign(design: InvitationDesign, patch: LegacyPatch): InvitationDesign {
  const next: InvitationDesign = structuredClone(design);
  const blocks = next.blocks;
  for (const [field, value] of Object.entries(patch)) {
    if (value === undefined) continue;
    if (field === "theme" && typeof value === "string") next.theme = designThemeFor(value);
    else if (field === "songUrl") next.song.url = String(value);
    else if (field === "songTitle") next.song.title = String(value);
    else if (field === "showCountdown") {
      const block = ensureBlock(blocks, "countdown");
      block.hidden = !value;
    } else if (field === "adultsOnly") {
      const block = ensureBlock(blocks, "recommendations") as BlockOf<"recommendations">;
      block.props.adultsOnly = Boolean(value);
      if (value) block.hidden = false;
    } else if (field === "quote") {
      const block = ensureBlock(blocks, "verse") as BlockOf<"verse">;
      Object.assign(block.props, splitQuote(String(value)));
      block.hidden = !block.props.text;
    } else if (FIELD_TARGETS[field]) {
      const { type, prop } = FIELD_TARGETS[field];
      const block = ensureBlock(blocks, type);
      (block.props as Record<string, unknown>)[prop] = structuredClone(value);
      if (isFilled(value)) block.hidden = false;
    }
  }
  return sanitizeDesign(next) ?? design;
}
