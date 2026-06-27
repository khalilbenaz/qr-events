import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../lib/api";
import type { PublicEvent as PublicEventT } from "../lib/types";
import { PlainLayout } from "../components/Layout";
import { Spinner } from "../components/ui";
import { EventTemplate, type RegResult } from "./public/templates";
import { MobileReserveBar } from "./public/shared";

export default function PublicEvent() {
  const { orgSlug, eventSlug } = useParams();
  const [ev, setEv] = useState<PublicEventT | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [result, setResult] = useState<RegResult | null>(null);

  useEffect(() => {
    api<PublicEventT>(`/public/event/${orgSlug}/${eventSlug}`, { auth: false })
      .then(setEv).catch(() => setNotFound(true));
  }, [orgSlug, eventSlug]);

  if (notFound)
    return <PlainLayout><div className="empty"><h1>Événement introuvable</h1>
      <p>Ce lien n'existe pas ou l'événement n'est pas encore publié.</p></div></PlainLayout>;
  if (!ev) return <PlainLayout><Spinner /></PlainLayout>;

  return (
    <PlainLayout>
      <EventTemplate ev={ev} orgSlug={orgSlug!} eventSlug={eventSlug!}
        result={result} setResult={setResult} />
      <MobileReserveBar ev={ev} result={result} />
    </PlainLayout>
  );
}
