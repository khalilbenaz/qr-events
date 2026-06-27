import QRCode from "qrcode";

/**
 * Génère un QR code au format SVG (pur JS, compatible Workers free-tier —
 * pas de canvas natif requis). Rendu net dans tous les navigateurs et
 * facilement convertible en image côté client.
 *
 * Le contenu encodé est l'URL de scan : l'app mobile lit l'URL, en extrait
 * le token et appelle POST /scan. Afficher une URL permet aussi un fallback
 * « ouvrir dans le navigateur ».
 */
export async function qrSvg(data: string): Promise<string> {
  return QRCode.toString(data, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 2,
    width: 320,
  });
}

/** Data-URI SVG (utile pour <img src> ou intégration email/JSON). */
export async function qrDataUri(data: string): Promise<string> {
  const svg = await qrSvg(data);
  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
}
