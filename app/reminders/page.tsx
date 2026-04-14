"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { ArrowLeft, Clock, Car, Calendar, User, CheckCircle } from "lucide-react";

type Client = { id: string; nom: string; telephone: string };
type Voiture = { id: string; nom_voiture: string };
type Reservation = {
  id: string; client_id: string; voiture_id: string;
  date_debut: string; date_fin: string; prix_total: number;
  statut_reservation: string; statut_paiement: string; date_creation: string;
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

function daysUntil(dateStr: string) {
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export default function RemindersPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [voitures, setVoitures] = useState<Voiture[]>([]);
  const today = new Date().toISOString().slice(0, 10);
  const in7days = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

  useEffect(() => {
    Promise.all([
      supabase.from("reservations").select("*").order("date_fin", { ascending: true }),
      supabase.from("clients").select("*"),
      supabase.from("voitures").select("*"),
    ]).then(([r, c, v]) => {
      setReservations(r.data || []);
      setClients(c.data || []);
      setVoitures(v.data || []);
    });
  }, []);

  async function confirmReservation(id: string) {
    await supabase.from("reservations").update({ statut_reservation: "confirmee" }).eq("id", id);
    setReservations((prev) => prev.map((r) => r.id === id ? { ...r, statut_reservation: "confirmee" } : r));
  }

  const clientsMap = Object.fromEntries(clients.map((c) => [c.id, c]));
  const voituresMap = Object.fromEntries(voitures.map((v) => [v.id, v]));

  const pending = reservations.filter((r) => r.statut_reservation === "en_attente");
  const returnsThisWeek = reservations.filter(
    (r) => r.statut_reservation === "confirmee" && r.date_fin >= today && r.date_fin <= in7days
  );
  const pickupsThisWeek = reservations.filter(
    (r) => r.statut_reservation === "confirmee" && r.date_debut >= today && r.date_debut <= in7days
  );

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/" className="p-2 rounded-md hover:bg-white/5 text-gray-400 transition">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Reminders</h1>
          <p className="text-gray-500 text-sm mt-0.5">Réservations à confirmer et retours à venir</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Pending confirmations */}
        <div className="lg:col-span-1 bg-bg-card rounded-xl border border-border-dark overflow-hidden">
          <div className="p-5 border-b border-white/5 flex items-center justify-between">
            <h2 className="font-bold flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              En attente
            </h2>
            <span className="bg-amber-500/10 text-amber-400 text-xs font-bold px-2.5 py-1 rounded-full">
              {pending.length}
            </span>
          </div>
          <div className="p-4 space-y-3">
            {pending.length === 0 && (
              <p className="text-center text-gray-600 text-sm py-8">Aucune réservation en attente</p>
            )}
            {pending.map((res) => {
              const client = clientsMap[res.client_id];
              const voiture = voituresMap[res.voiture_id];
              return (
                <div key={res.id} className="bg-[#1c1c1c] rounded-xl p-4 border border-border-dark">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-sm">{client?.nom || "Client"}</span>
                    <span className="text-xs text-gray-500">{formatDate(res.date_creation)}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-gray-400 text-xs mb-1">
                    <Car className="w-3.5 h-3.5" /> {voiture?.nom_voiture || "Voiture"}
                  </div>
                  <div className="flex items-center gap-1.5 text-gray-400 text-xs mb-3">
                    <Calendar className="w-3.5 h-3.5" /> {formatDate(res.date_debut)} → {formatDate(res.date_fin)}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white font-bold text-sm">{Number(res.prix_total).toLocaleString("fr-FR")} MAD</span>
                    <button
                      onClick={() => confirmReservation(res.id)}
                      className="flex items-center gap-1.5 text-xs bg-green-500/10 text-green-400 border border-green-500/20 px-3 py-1.5 rounded-lg hover:bg-green-500/20 transition font-medium"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      Confirmer
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Pickups this week */}
        <div className="bg-bg-card rounded-xl border border-border-dark overflow-hidden">
          <div className="p-5 border-b border-white/5 flex items-center justify-between">
            <h2 className="font-bold flex items-center gap-2">
              <Car className="w-4 h-4 text-blue-400" />
              Départs cette semaine
            </h2>
            <span className="bg-blue-500/10 text-blue-400 text-xs font-bold px-2.5 py-1 rounded-full">
              {pickupsThisWeek.length}
            </span>
          </div>
          <div className="p-4 space-y-3">
            {pickupsThisWeek.length === 0 && (
              <p className="text-center text-gray-600 text-sm py-8">Aucun départ cette semaine</p>
            )}
            {pickupsThisWeek.map((res) => {
              const client = clientsMap[res.client_id];
              const voiture = voituresMap[res.voiture_id];
              const days = daysUntil(res.date_debut);
              return (
                <div key={res.id} className="bg-[#1c1c1c] rounded-xl p-4 border border-border-dark flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm truncate">{client?.nom || "Client"}</p>
                    <p className="text-gray-500 text-xs truncate">{voiture?.nom_voiture}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-blue-400 font-bold text-sm">{formatDate(res.date_debut)}</p>
                    <p className="text-gray-500 text-xs">{days === 0 ? "Aujourd'hui" : `Dans ${days}j`}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Returns this week */}
        <div className="bg-bg-card rounded-xl border border-border-dark overflow-hidden">
          <div className="p-5 border-b border-white/5 flex items-center justify-between">
            <h2 className="font-bold flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-400" />
              Retours cette semaine
            </h2>
            <span className="bg-amber-500/10 text-amber-400 text-xs font-bold px-2.5 py-1 rounded-full">
              {returnsThisWeek.length}
            </span>
          </div>
          <div className="p-4 space-y-3">
            {returnsThisWeek.length === 0 && (
              <p className="text-center text-gray-600 text-sm py-8">Aucun retour cette semaine</p>
            )}
            {returnsThisWeek.map((res) => {
              const client = clientsMap[res.client_id];
              const voiture = voituresMap[res.voiture_id];
              const days = daysUntil(res.date_fin);
              return (
                <div key={res.id} className="bg-[#1c1c1c] rounded-xl p-4 border border-border-dark flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                    <Car className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm truncate">{client?.nom || "Client"}</p>
                    <p className="text-gray-500 text-xs truncate">{voiture?.nom_voiture}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-amber-400 font-bold text-sm">{formatDate(res.date_fin)}</p>
                    <p className="text-gray-500 text-xs">{days === 0 ? "Aujourd'hui" : `Dans ${days}j`}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
