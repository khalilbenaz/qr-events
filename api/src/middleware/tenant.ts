import type { AppContext, EventRow } from '../types';
import { ApiError } from '../lib/response';

/**
 * Garde d'isolation multi-tenant : récupère un événement UNIQUEMENT s'il
 * appartient à l'organisateur courant. Lève 404 sinon (on ne révèle pas
 * l'existence d'un événement d'un autre tenant).
 *
 * À utiliser dans CHAQUE route manipulant une ressource liée à un événement.
 */
export async function getOwnedEvent(c: AppContext, eventId: string): Promise<EventRow> {
  const organizerId = c.get('organizerId');
  const ev = await c.env.DB.prepare('SELECT * FROM events WHERE id = ? AND organizer_id = ?')
    .bind(eventId, organizerId)
    .first<EventRow>();
  if (!ev) throw new ApiError(404, 'not_found', 'Événement introuvable');
  return ev;
}
