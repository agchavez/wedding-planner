import { describe, expect, it } from "vitest";
import { detectSongKind, songFileKind, songTitleFromFileName, songUrl, uploadedSongOwner } from "@/lib/songFiles";
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
