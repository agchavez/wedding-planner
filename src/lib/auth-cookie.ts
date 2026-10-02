/**
 * Prefijo propio de las cookies de Better Auth. Otras apps en *.partners.hn también usan Better
 * Auth y dejan `better-auth.session_token` en `.partners.hn`; con el prefijo por defecto el
 * navegador envía las dos cookies, gana la ajena y la sesión de aquí nunca se reconoce.
 * Vive aparte de auth.ts porque proxy.ts no puede importar el cliente de Mongo.
 */
export const AUTH_COOKIE_PREFIX = "wedplan";
