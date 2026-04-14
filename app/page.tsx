"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { ArrowRight, Car, User, Calendar, RefreshCw } from "lucide-react";

type Client = { id: string; nom: string; telephone: string; statut_lead: string; date_creation: string };
type Voiture = { id: string; nom_voiture: string; modele: string; prix_par_jour: number; statut_disponibilite: string };
type Reservation = {
  id: string; client_id: string; voiture_id: string;
  date_debut: string; date_fin: string; prix_total: number;
  statut_reservation: string; statut_paiement: string; date_creation: string;
};

const leadTagStyle: Record<string, string> = {
  Nouveau:     "bg-blue-500/10 text-blue-400",
  Interessee:  "bg-amber-500/10 text-amber-400",
  Chaud:       "bg-red-500/10 text-red-400",
  Reserve:     "bg-green-500/10 text-green-400",
  Perdu:       "bg-gray-500/10 text-gray-400",
};

const statutVoitureConfig: Record<string, { dot: string; text: string; label: string }> = {
  disponible:     { dot: "bg-green-500",  text: "text-green-400",  label: "Disponible" },
  reservee:       { dot: "bg-amber-500",  text: "text-amber-400",  label: "Réservée" },
  louee:          { dot: "bg-red-500",    text: "text-red-400",    label: "Louée" },
  en_maintenance: { dot: "bg-gray-400",   text: "text-gray-400",   label: "Maintenance" },
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "maintenant";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}j`;
}

function initials(nom: string) {
  return nom.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

export default function DashboardPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [voitures, setVoitures] = useState<Voiture[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [today, setToday] = useState("");
  const [in3days, setIn3days] = useState("");

  const loadAll = useCallback(async () => {
    setLoading(true);
    const [c, v, r] = await Promise.all([
      supabase.from("clients").select("*").order("date_creation", { ascending: false }),
      supabase.from("voitures").select("*").order("date_creation", { ascending: false }),
      supabase.from("reservations").select("*").order("date_creation", { ascending: false }),
    ]);
    setClients(c.data ?? []);
    setVoitures(v.data ?? []);
    setReservations(r.data ?? []);
    setLoading(false);
    setLastRefresh(new Date());
  }, []);

  useEffect(() => {
    // eslint-disable-next-line
    setToday(new Date().toISOString().slice(0, 10));
    // eslint-disable-next-line
    setIn3days(new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10));
    // eslint-disable-next-line
    loadAll();
  }, [loadAll]);

  // --- KPIs ---
  const newLeadsToday = clients.filter((c) => c.date_creation?.slice(0, 10) === today).length;
  const activeBookings = reservations.filter((r) => r.statut_reservation === "confirmee" && r.date_fin >= today).length;
  const disponibles = voitures.filter((v) => v.statut_disponibilite === "disponible").length;
  const totalVoitures = voitures.length;
  const pendingConfirm = reservations.filter((r) => r.statut_reservation === "en_attente").length;
  const revenuMois = reservations
    .filter((r) => r.date_creation?.slice(0, 7) === today.slice(0, 7) && r.statut_reservation === "confirmee")
    .reduce((sum, r) => sum + (Number(r.prix_total) || 0), 0);

  // Maps
  const clientsMap = Object.fromEntries(clients.map((c) => [c.id, c]));
  const voituresMap = Object.fromEntries(voitures.map((v) => [v.id, v]));

  // Recent leads (last 5 clients)
  const recentLeads = clients.slice(0, 5);

  // Upcoming returns (reservations ending in next 3 days)
  const upcomingReturns = reservations
    .filter((r) => r.statut_reservation === "confirmee" && r.date_fin >= today && r.date_fin <= in3days)
    .slice(0, 4);

  // Fleet preview (first 4 voitures)
  const fleetPreview = voitures.slice(0, 4);

  return (
    <div className="flex-1 overflow-y-auto p-8">
      {/* Topbar */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Mis à jour à {lastRefresh ? lastRefresh.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "..."}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadAll}
            disabled={loading}
            className="p-2 rounded-lg border border-white/8 text-gray-400 hover:text-white hover:bg-white/5 transition disabled:opacity-40"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <Link
            href="/reservations"
            className="px-4 py-2 rounded-lg bg-white text-black text-sm font-medium hover:bg-gray-100 transition"
          >
            + Nouvelle réservation
          </Link>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-[#111] rounded-xl p-5 border border-white/8">
          <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-3">Nouveaux leads aujourdhui</h3>
          <div className="text-4xl font-semibold mb-1">{newLeadsToday}</div>
          <div className="text-gray-500 text-sm">{clients.length} total</div>
        </div>

        <div className="bg-[#111] rounded-xl p-5 border border-white/8">
          <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-3">Réservations actives</h3>
          <div className="text-4xl font-semibold mb-1">{activeBookings}</div>
          <div className="text-amber-400 text-sm">{pendingConfirm} en attente</div>
        </div>

        <div className="bg-[#111] rounded-xl p-5 border border-white/8">
          <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-3">Voitures disponibles</h3>
          <div className="text-4xl font-semibold mb-2 flex items-baseline gap-1">
            <span>{disponibles}</span>
            <span className="text-lg text-gray-500 font-medium">/{totalVoitures}</span>
          </div>
          <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all"
              style={{ width: totalVoitures ? `${(disponibles / totalVoitures) * 100}%` : "0%" }}
            />
          </div>
        </div>

        <div className="bg-[#111] rounded-xl p-5 border border-white/8">
          <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-3">Revenu ce mois</h3>
          <div className="text-3xl font-semibold mb-1">{revenuMois.toLocaleString("fr-FR")}</div>
          <div className="text-gray-500 text-sm">MAD confirmé</div>
        </div>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* LEFT — 2/3 */}
        <div className="lg:col-span-2 flex flex-col gap-6">

          {/* Recent Leads */}
          <div className="bg-[#111] rounded-xl p-6 border border-white/8">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold">Leads récents</h2>
              <Link href="/clients" className="text-green-400 text-sm flex items-center gap-1 font-medium hover:underline">
                Voir tout <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {loading ? (
              <div className="text-gray-500 text-sm py-4">Chargement...</div>
            ) : recentLeads.length === 0 ? (
              <div className="text-center py-8 text-gray-600">
                <User className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">Aucun lead pour linstant</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentLeads.map((client) => (
                  <div key={client.id} className="flex items-center justify-between pb-4 border-b border-white/5 last:border-0 last:pb-0">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-white text-black flex items-center justify-center font-bold text-xs shrink-0">
                        {initials(client.nom)}
                      </div>
                      <div>
                        <h4 className="font-bold text-[14px]">{client.nom}</h4>
                        <p className="text-gray-500 text-xs">{client.telephone}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-[11px] px-2.5 py-1 rounded-full font-bold ${leadTagStyle[client.statut_lead] ?? "bg-gray-500/10 text-gray-400"}`}>
                        {client.statut_lead || "Nouveau"}
                      </span>
                      <span className="text-gray-600 text-xs min-w-[30px] text-right">
                        {timeAgo(client.date_creation)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Fleet quick view */}
          <div className="bg-[#111] rounded-xl p-6 border border-white/8">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold">Flotte</h2>
              <Link href="/voitures" className="text-green-400 text-sm flex items-center gap-1 font-medium hover:underline">
                Gérer <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {loading ? (
              <div className="text-gray-500 text-sm">Chargement...</div>
            ) : fleetPreview.length === 0 ? (
              <div className="text-center py-8 text-gray-600">
                <Car className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">Aucune voiture</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {fleetPreview.map((v) => {
                  const cfg = statutVoitureConfig[v.statut_disponibilite] ?? { dot: "bg-gray-400", text: "text-gray-400", label: v.statut_disponibilite };
                  return (
                    <div key={v.id} className="bg-white/[0.03] rounded-lg p-4 border border-white/8">
                      <div className="flex items-center gap-2 mb-3">
                        <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                        <span className={`${cfg.text} text-xs font-semibold`}>{cfg.label}</span>
                      </div>
                      <div className="font-bold text-[14px] leading-tight">{v.nom_voiture}</div>
                      <div className="text-gray-500 text-xs mt-1">{v.prix_par_jour} MAD/j</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT — 1/3 */}
        <div className="lg:col-span-1 flex flex-col gap-6">

          {/* Pending confirmations */}
          <div className="bg-[#111] rounded-xl p-6 border border-white/8">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold">En attente de confirmation</h2>
              <span className="bg-amber-500/10 text-amber-400 text-xs font-bold px-2.5 py-1 rounded-full">
                {pendingConfirm}
              </span>
            </div>

            {loading ? (
              <div className="text-gray-500 text-sm">Chargement...</div>
            ) : reservations.filter((r) => r.statut_reservation === "en_attente").length === 0 ? (
              <div className="text-center py-6 text-gray-600 text-sm">Aucune réservation en attente</div>
            ) : (
              <div className="space-y-3">
                {reservations.filter((r) => r.statut_reservation === "en_attente").slice(0, 4).map((res) => {
                  const client = clientsMap[res.client_id];
                  const voiture = voituresMap[res.voiture_id];
                  return (
                    <div key={res.id} className="bg-white/[0.03] rounded-lg p-3 border border-white/8">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-sm">{client?.nom || "Client"}</span>
                        <span className="text-gray-600 text-xs">{timeAgo(res.date_creation)}</span>
                      </div>
                      <div className="text-gray-500 text-xs mb-2">{voiture?.nom_voiture || "Voiture"}</div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">
                          {formatDate(res.date_debut)} → {formatDate(res.date_fin)}
                        </span>
                        <span className="text-sm font-bold text-white">{Number(res.prix_total).toLocaleString("fr-FR")} MAD</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <Link href="/reservations" className="mt-4 flex items-center justify-center gap-1 text-xs text-gray-500 hover:text-white transition pt-3 border-t border-white/5">
              Gérer les réservations <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {/* Upcoming returns */}
          <div className="bg-[#111] rounded-xl p-6 border border-white/8 flex-1">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold">Retours dans 3 jours</h2>
              <Calendar className="w-4 h-4 text-gray-500" />
            </div>

            {loading ? (
              <div className="text-gray-500 text-sm">Chargement...</div>
            ) : upcomingReturns.length === 0 ? (
              <div className="text-center py-6 text-gray-600 text-sm">Aucun retour prévu</div>
            ) : (
              <div className="space-y-3">
                {upcomingReturns.map((res) => {
                  const client = clientsMap[res.client_id];
                  const voiture = voituresMap[res.voiture_id];
                  return (
                    <div key={res.id} className="flex items-center gap-3 pb-3 border-b border-white/5 last:border-0 last:pb-0">
                      <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                        <Car className="w-4 h-4 text-gray-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm truncate">{client?.nom || "Client"}</p>
                        <p className="text-gray-500 text-xs truncate">{voiture?.nom_voiture || "Voiture"}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-bold text-amber-400">{formatDate(res.date_fin)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
