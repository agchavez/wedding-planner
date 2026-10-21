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
};

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
      showCountdown: true,
    },
    guest: sampleGuest("Carlos y Ana Mejía", 2),
  },
];

export function findInvitationExample(slug: string) {
  return INVITATION_EXAMPLES.find((e) => e.slug === slug) ?? null;
}

/** Fotos de portada disponibles sin subir nada (las de los ejemplos). */
export const EXAMPLE_COVER_PHOTOS = INVITATION_EXAMPLES.map((e) => e.data.coverImageUrl);
