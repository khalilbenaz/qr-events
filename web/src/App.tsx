import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth/AuthContext";
import { AppLayout } from "./components/Layout";
import type { ReactNode } from "react";

import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import EventsList from "./pages/EventsList";
import EventNew from "./pages/EventNew";
import EventDetail from "./pages/EventDetail";
import PublicEvent from "./pages/PublicEvent";
import TicketStatus from "./pages/TicketStatus";
import NotFound from "./pages/NotFound";
import PendingScreen from "./pages/PendingScreen";
import AdminPage from "./pages/AdminPage";

function Protected({ children }: { children: ReactNode }) {
  const { organizer } = useAuth();
  if (!organizer) return <Navigate to="/app/login" replace />;
  // Compte non validé (hors admin) → écran d'attente.
  if (organizer.role !== "admin" && organizer.status !== "approved")
    return <AppLayout><PendingScreen /></AppLayout>;
  return <AppLayout>{children}</AppLayout>;
}

export default function App() {
  return (
    <Routes>
      {/* Accueil */}
      <Route path="/" element={<Landing />} />

      {/* Dashboard organisateur */}
      <Route path="/app/login" element={<Login />} />
      <Route path="/app/register" element={<Register />} />
      <Route path="/app" element={<Navigate to="/app/events" replace />} />
      <Route path="/app/events" element={<Protected><EventsList /></Protected>} />
      <Route path="/app/events/new" element={<Protected><EventNew /></Protected>} />
      <Route path="/app/events/:id" element={<Protected><EventDetail /></Protected>} />
      <Route path="/app/admin" element={<Protected><AdminPage /></Protected>} />

      {/* Suivi d'un billet (récupération du QR après validation) */}
      <Route path="/ticket/:token" element={<TicketStatus />} />

      {/* Pages publiques d'événement : /{organizer-slug}/{event-slug} */}
      <Route path="/:orgSlug/:eventSlug" element={<PublicEvent />} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
