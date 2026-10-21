import type { InvitationData, InvitationGuestData } from "@/lib/guestInvitations";

/**
 * Invitaciones de ejemplo (públicas en /ejemplos): sirven para ver cómo se comparte en
 * WhatsApp y como punto de partida — "Usar este ejemplo" copia su diseño y textos a la
 * invitación de la boda, donde se pueden modificar. Fotos CC0 (ver inicio/images/CREDITOS.md).
 */

export type InvitationExample = {
  slug: string;
  title: string;
  description: string;
  data: InvitationData;
  guest: InvitationGuestData;
};

const base: Omit<InvitationData, "partner1" | "partner2" | "theme" | "coverImageUrl"> = {
  weddingDate: null,
  venueName: "",
  venueAddress: "",
  headline: "¡Nos casamos!",
  message: "",
  quote: "",
  ceremonyTime: null,
  ceremonyPlace: "",
  ceremonyAddress: "",
  ceremonyMapUrl: "",
  receptionTime: null,
  receptionPlace: "",
  receptionAddress: "",
  receptionMapUrl: "",
  dressCode: "",
  dressCodeNote: "",
  giftsNote: "",
  hashtag: "",
  rsvpDeadline: null,
  showCountdown: true,
  brideParents: "",
  groomParents: "",
  sponsors: "",
  itinerary: [],
  dressCodeColors: [],
  giftBankName: "",
  giftAccount: "",
  giftAccountHolder: "",
  giftRegistryUrl: "",
  galleryUrls: [],
  songUrl: "",
  songTitle: "",
  adultsOnly: false,
  recommendations: "",
  closingMessage: "",
};

const G = (name: string) => `/ejemplos/galeria/${name}.jpg`;

const sampleGuest = (fullName: string, seats: number, plusOneNames: string[] = []): InvitationGuestData => ({
  fullName,
  seats,
  plusOneNames,
  rsvpStatus: "pending",
  attendingCount: null,
  rsvpMessage: "",
  dietaryRestrictions: "",
  responded: false,
});

export const INVITATION_EXAMPLES: InvitationExample[] = [
  {
    slug: "isabella-y-sebastian",
    title: "Olivo botánico",
    description: "Verde olivo y lino, con programa, paleta de vestimenta y galería.",
    data: {
      ...base,
      partner1: "Isabella",
      partner2: "Sebastián",
      theme: "olive",
      coverImageUrl: G("novia"),
      weddingDate: "2027-11-20T00:00:00.000Z",
      headline: "¡Nos casamos!",
      message:
        "Nos encantaría que nos acompañes en este día tan especial y que nos bendigas con tu presencia y tus oraciones.",
      quote: "Un matrimonio feliz es enamorarse muchas veces, siempre de la misma persona.",
      ceremonyTime: "2027-11-20T21:00:00.000Z",
      ceremonyPlace: "Parroquia El Calvario",
      ceremonyAddress: "Barrio El Centro, Comayagua",
      receptionTime: "2027-11-20T23:30:00.000Z",
      receptionPlace: "Villa Las Acacias",
      receptionAddress: "Carretera a Siguatepeque, km 3",
      brideParents: "Roberto Andrade\nLucía Mejía de Andrade",
      groomParents: "Fernando Castillo\nMarta Rivera de Castillo",
      sponsors: "Padrinos de anillos: Diego y Paola Zelaya\nPadrinos de lazo: Andrés y Karla Fúnez",
      itinerary: [
        { time: "3:00 pm", title: "Ceremonia religiosa", icon: "church" },
        { time: "5:30 pm", title: "Cóctel de bienvenida", icon: "cheers" },
        { time: "6:30 pm", title: "Sesión de fotos", icon: "camera" },
        { time: "7:00 pm", title: "Entrada de los novios y primer baile", icon: "dance" },
        { time: "8:00 pm", title: "Cena", icon: "dinner" },
        { time: "9:30 pm", title: "Corte del pastel y brindis", icon: "cake" },
        { time: "10:00 pm", title: "¡Fiesta!", icon: "party" },
      ],
      dressCode: "Formal",
      dressCodeColors: ["#efe9dc", "#c9c3a6", "#8b8f6a", "#a88f74", "#3e4230"],
      dressCodeNote: "Con cariño les pedimos evitar el color blanco y tonos similares.",
      giftsNote: "Tu presencia es nuestro mejor regalo. Si deseas tener un detalle con nosotros, te dejamos esta opción.",
      giftBankName: "Banco Atlántida",
      giftAccount: "2001 4455 6677",
      giftAccountHolder: "Isabella Andrade",
      galleryUrls: [G("abrazo"), G("anillos"), G("beso"), G("ramo"), G("brindis")],
      adultsOnly: true,
      recommendations: "Llega 20 minutos antes de la ceremonia.\nHabrá estacionamiento en el lugar.",
      closingMessage: "No vemos la hora de celebrar contigo.",
      hashtag: "#IsaYSebas2027",
      rsvpDeadline: "2027-10-31T00:00:00.000Z",
    },
    guest: sampleGuest("Familia Ramírez", 3),
  },
  {
    slug: "sofia-y-diego",
    title: "Clásica con confeti",
    description: "Marfil y dorado, ceremonia en iglesia y recepción de gala.",
    data: {
      ...base,
      partner1: "Sofía",
      partner2: "Diego",
      theme: "classic",
      coverImageUrl: "/ejemplos/sofia-y-diego.jpg",
      weddingDate: "2027-02-13T00:00:00.000Z",
      message:
        "Con la bendición de Dios y de nuestras familias, tenemos el honor de invitarte a celebrar el día en que uniremos nuestras vidas.",
      quote: "El amor es paciente, es bondadoso.",
      ceremonyTime: "2027-02-13T22:00:00.000Z",
      ceremonyPlace: "Catedral Metropolitana",
      ceremonyAddress: "Parque Central, Tegucigalpa",
      receptionTime: "2027-02-14T00:30:00.000Z",
      receptionPlace: "Hotel Real Intercontinental",
      receptionAddress: "Blvd. Juan Pablo II, Tegucigalpa",
      dressCode: "Formal",
      dressCodeNote: "Por favor, evitar el color blanco",
      giftsNote: "Tu presencia es nuestro mejor regalo. Si deseas obsequiarnos algo, tendremos lluvia de sobres.",
      hashtag: "#SofíaYDiego2027",
      rsvpDeadline: "2027-01-15T00:00:00.000Z",
      brideParents: "Mario Paredes\nAna Lucía de Paredes",
      groomParents: "José Antonio Flores\nCarmen de Flores",
      itinerary: [
        { time: "4:00 pm", title: "Ceremonia", icon: "church" },
        { time: "6:30 pm", title: "Recepción y brindis", icon: "cheers" },
        { time: "8:00 pm", title: "Cena", icon: "dinner" },
        { time: "9:00 pm", title: "Baile", icon: "party" },
      ],
      dressCodeColors: ["#f3ead9", "#d8c3a0", "#9c6b3f", "#3a2e26"],
      galleryUrls: [G("anillos"), G("ceremonia"), G("brindis")],
    },
    guest: sampleGuest("Mariana Torres", 2, ["Esteban Ruiz"]),
  },
  {
    slug: "valeria-y-andres",
    title: "Noche de gala",
    description: "Negro y oro, una celebración elegante al atardecer.",
    data: {
      ...base,
      partner1: "Valeria",
      partner2: "Andrés",
      theme: "noir",
      coverImageUrl: "/ejemplos/valeria-y-andres.jpg",
      weddingDate: "2027-04-24T00:00:00.000Z",
      headline: "Una noche para celebrar",
      message: "Después de muchos atardeceres juntos, queremos compartir contigo el más especial de todos.",
      ceremonyTime: "2027-04-24T23:00:00.000Z",
      ceremonyPlace: "Terraza Las Lomas",
      ceremonyAddress: "San Pedro Sula",
      receptionTime: "2027-04-25T01:00:00.000Z",
      receptionPlace: "Salón Imperial",
      receptionAddress: "San Pedro Sula",
      dressCode: "Etiqueta rigurosa",
      dressCodeNote: "Damas vestido largo, caballeros traje oscuro",
      giftsNote: "Contaremos con mesa de regalos y lluvia de sobres.",
      hashtag: "#ValeYAndrés",
      rsvpDeadline: "2027-03-31T00:00:00.000Z",
      itinerary: [
        { time: "5:00 pm", title: "Ceremonia al atardecer", icon: "rings" },
        { time: "6:00 pm", title: "Cóctel", icon: "cheers" },
        { time: "7:30 pm", title: "Cena de gala", icon: "dinner" },
        { time: "9:00 pm", title: "Fiesta", icon: "music" },
        { time: "2:00 am", title: "Despedida", icon: "moon" },
      ],
      dressCodeColors: ["#111013", "#3a3530", "#d6b46a", "#7a1f2b"],
      galleryUrls: [G("beso"), G("mesas"), G("brindis")],
      adultsOnly: true,
    },
    guest: sampleGuest("Familia Hernández", 4),
  },
  {
    slug: "camila-y-jose",
    title: "Romántica en rosa",
    description: "Rosa empolvado y vino, íntima y cálida.",
    data: {
      ...base,
      partner1: "Camila",
      partner2: "José",
      theme: "blush",
      coverImageUrl: "/ejemplos/camila-y-jose.jpg",
      weddingDate: "2027-06-12T00:00:00.000Z",
      headline: "Y así empieza nuestra historia",
      message: "Nos encantaría que seas parte de este capítulo tan importante. ¡Te esperamos para celebrar el amor!",
      quote: "Donde tú vayas, iré yo.",
      ceremonyTime: "2027-06-12T21:00:00.000Z",
      ceremonyPlace: "Capilla Santa Lucía",
      ceremonyAddress: "Santa Lucía, Francisco Morazán",
      receptionTime: "2027-06-12T23:00:00.000Z",
      receptionPlace: "Jardín Los Pinos",
      receptionAddress: "Santa Lucía, Francisco Morazán",
      dressCode: "Formal de jardín",
      dressCodeNote: "Tonos pastel bienvenidos",
      giftsNote: "Tu presencia es nuestro mejor regalo.",
      hashtag: "#CamiYJosé",
      rsvpDeadline: "2027-05-15T00:00:00.000Z",
      sponsors: "Padrinos de velación: Luis y Gabriela Cruz\nMadrina de ramo: Sofía Turcios",
      dressCodeColors: ["#f6dfe0", "#e8b9bf", "#b36a7d", "#7a2f45"],
      giftAccount: "7300 1122 3344",
      giftBankName: "BAC Credomatic",
      giftAccountHolder: "Camila Turcios",
      galleryUrls: [G("abrazo"), G("ramo"), G("anillos")],
    },
    guest: sampleGuest("Daniela Rivera", 1),
  },
  {
    slug: "lucia-y-mateo",
    title: "Boda de campo",
    description: "Salvia y crema, al aire libre entre árboles.",
    data: {
      ...base,
      partner1: "Lucía",
      partner2: "Mateo",
      theme: "garden",
      coverImageUrl: "/ejemplos/lucia-y-mateo.jpg",
      weddingDate: "2027-09-18T00:00:00.000Z",
      headline: "Te invitamos a nuestra boda",
      message: "Celebremos juntos entre árboles, buena comida y mucha música. ¡Será un día inolvidable!",
      ceremonyTime: "2027-09-18T21:30:00.000Z",
      ceremonyPlace: "Hacienda El Zamorano",
      ceremonyAddress: "Valle del Yeguare",
      dressCode: "Casual elegante",
      dressCodeNote: "Recomendamos zapato cómodo: ¡es en el césped!",
      giftsNote: "Lluvia de sobres para nuestra luna de miel.",
      hashtag: "#LucíaYMateo",
      rsvpDeadline: "2027-08-20T00:00:00.000Z",
      itinerary: [
        { time: "3:30 pm", title: "Ceremonia en el jardín", icon: "heart" },
        { time: "5:00 pm", title: "Picnic y cóctel", icon: "cheers" },
        { time: "7:00 pm", title: "Cena bajo las luces", icon: "dinner" },
        { time: "8:30 pm", title: "Fogata y música", icon: "music" },
      ],
      dressCodeColors: ["#eef0e6", "#c7cfb4", "#5d7553", "#b8a274"],
      galleryUrls: [G("jardin"), G("abrazo"), G("mesas")],
      recommendations: "El lugar es al aire libre: trae un abrigo ligero para la noche.",
      showCountdown: true,
    },
    guest: sampleGuest("Carlos y Ana Mejía", 2),
  },
];

export function findInvitationExample(slug: string) {
  return INVITATION_EXAMPLES.find((e) => e.slug === slug) ?? null;
}

/** Fotos de portada disponibles sin subir nada (las de los ejemplos). */
export const EXAMPLE_COVER_PHOTOS = [...new Set(INVITATION_EXAMPLES.map((e) => e.data.coverImageUrl))];

/** Fotos de ejemplo para la galería (para probar sin subir nada). */
export const EXAMPLE_GALLERY_PHOTOS = ["abrazo", "anillos", "beso", "ramo", "brindis", "ceremonia", "mesas", "jardin", "salon"].map(
  (name) => `/ejemplos/galeria/${name}.jpg`
);
