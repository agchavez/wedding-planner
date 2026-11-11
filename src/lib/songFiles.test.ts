import { describe, expect, it } from "vitest";
import { cleanSongRange, detectSongKind, formatSongTime, parseSongTime, songFileKind, songTitleFromFileName, songUrl, uploadedSongOwner } from "@/lib/songFiles";
import { patchDesign } from "@/lib/invitationBlocks";
import { sanitizeDesign } from "@/lib/invitationBlocks";

const bytes = (...head: number[]) => Uint8Array.from([...head, ...new Array(16).fill(0)]);
const WEDDING = "64b7f0c2a1d3e4f5a6b7c8d9";

describe("songFiles", () => {
  it("reconoce mp3 y m4a por sus primeros bytes", () => {
    expect(detectSongKind(bytes(0x49, 0x44, 0x33, 3))).toBe("mp3"); // "ID3"
    expect(detectSongKind(bytes(0xff, 0xfb, 0x90, 0x00))).toBe("mp3");
    expect(detectSongKind(bytes(0, 0, 0, 0x20, 0x66, 0x74, 0x79, 0x70))).toBe("m4a"); // "ftyp"
  });

  it("rechaza lo que no es audio aunque se llame .mp3", () => {
    expect(detectSongKind(bytes(0x3c, 0x68, 0x74, 0x6d, 0x6c))).toBeNull(); // "<html"
    expect(detectSongKind(bytes(0x89, 0x50, 0x4e, 0x47))).toBeNull(); // PNG
    expect(detectSongKind(Uint8Array.from([0x49, 0x44]))).toBeNull();
  });

  it("solo sirve nombres de archivo simples de audio", () => {
    expect(songFileKind("abc-cancion.mp3")).toBe("mp3");
    expect(songFileKind("abc.M4A")).toBe("m4a");
    expect(songFileKind("../secreto.mp3")).toBeNull();
    expect(songFileKind("a..b.mp3")).toBeNull();
    expect(songFileKind("recibo.pdf")).toBeNull();
  });

  it("identifica la boda dueña de una canción subida", () => {
    expect(uploadedSongOwner(songUrl(WEDDING, "x-cancion.mp3"))).toBe(WEDDING);
    expect(uploadedSongOwner("/api/uploads/receipts/x.pdf")).toBeNull();
    expect(uploadedSongOwner(`/api/cancion/${WEDDING}/../x.mp3`)).toBeNull();
    expect(uploadedSongOwner("https://ejemplo.com/a.mp3")).toBeNull();
  });

  it("propone un nombre a partir del archivo", () => {
    expect(songTitleFromFileName("03_Mi-cancion (final).mp3")).toBe("03 Mi cancion (final)");
  });

  it("el diseño acepta la canción subida y los enlaces https, nada más", () => {
    const song = (url: string) => sanitizeDesign({ blocks: [], song: { url, title: "x" } })!.song.url;
    expect(song(songUrl(WEDDING, "x.mp3"))).toBe(songUrl(WEDDING, "x.mp3"));
    expect(song("https://ejemplo.com/a.mp3")).toBe("https://ejemplo.com/a.mp3");
    expect(song("/api/uploads/receipts/x.pdf")).toBe("");
    expect(song("javascript:alert(1)")).toBe("");
  });
});

describe("fragmento de la canción", () => {
  it("lee tiempos escritos como minuto:segundo o en segundos", () => {
    expect(parseSongTime("1:05")).toBe(65);
    expect(parseSongTime("65")).toBe(65);
    expect(parseSongTime("0:07.5")).toBe(7.5);
    expect(parseSongTime("  ")).toBe(0);
    expect(parseSongTime("1:75")).toBeNull();
    expect(parseSongTime("un minuto")).toBeNull();
    expect(parseSongTime("999:00")).toBeNull();
  });

  it("escribe los segundos como minuto:segundo", () => {
    expect(formatSongTime(65)).toBe("1:05");
    expect(formatSongTime(7.5)).toBe("0:07.5");
    expect(formatSongTime(600)).toBe("10:00");
    expect(parseSongTime(formatSongTime(83.4))).toBe(83.4);
  });

  it("descarta un final que no va después del inicio", () => {
    expect(cleanSongRange(30, 75)).toEqual({ start: 30, end: 75 });
    expect(cleanSongRange(30, 0)).toEqual({ start: 30, end: 0 });
    expect(cleanSongRange(30, 20)).toEqual({ start: 30, end: 0 });
    expect(cleanSongRange(30, 30.5)).toEqual({ start: 30, end: 0 });
    expect(cleanSongRange(-5, "x")).toEqual({ start: 0, end: 0 });
    expect(cleanSongRange(Number.NaN, Infinity)).toEqual({ start: 0, end: 0 });
  });

  it("el diseño guarda el tramo solo si hay canción, y lo borra al cambiarla", () => {
    const url = songUrl(WEDDING, "x.mp3");
    const withSong = sanitizeDesign({ blocks: [], song: { url, title: "x", start: 62, end: 95.26 } })!;
    expect(withSong.song).toMatchObject({ start: 62, end: 95.3 });
    expect(sanitizeDesign({ blocks: [], song: { url: "", start: 62, end: 95 } })!.song).toMatchObject({ start: 0, end: 0 });
    expect(sanitizeDesign({ blocks: [], song: { url, title: "x" } })!.song).toMatchObject({ start: 0, end: 0 });
    expect(patchDesign(withSong, { songUrl: "https://ejemplo.com/otra.mp3" }).song).toMatchObject({ start: 0, end: 0 });
    expect(patchDesign(withSong, { songTitle: "Otro nombre" }).song).toMatchObject({ start: 62, end: 95.3 });
  });
});
