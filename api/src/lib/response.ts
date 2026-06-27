import type { Context } from "hono";

/** Erreur applicative avec code HTTP — capturée par le handler onError. */
export class ApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message?: string) {
    super(message ?? code);
    this.status = status;
    this.code = code;
  }
}

export const ok = (c: Context, data: unknown, status = 200) =>
  c.json({ ok: true, data }, status as 200);

export const fail = (c: Context, status: number, code: string, message?: string) =>
  c.json({ ok: false, error: { code, message: message ?? code } }, status as 400);
