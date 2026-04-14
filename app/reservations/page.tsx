"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { ArrowLeft, Plus, Calendar, Car, User, ChevronLeft, ChevronRight, Trash2, Pencil, X } from "lucide-react";

type Client = { id: string; nom: string; telephone: string };
type Voiture = { id: string; nom_voiture: string; prix_par_jour: number };
type Reservation = {
  id: string;
  client_id: string;
  voiture_id: string;
  date_debut: string;
  date_fin: string;
  prix_total: number;
  statut_paiement: string;
  statut_reservation: string;
};

const resBadgeStyle: Record<string, string> = {
  en_attente: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
  confirmee:  "bg-green-500/10 text-green-400 border border-green-500/20",
  annulee:    "bg-red-500/10 text-red-400 border border-red-500/20",
};
const payBadgeStyle: Record<string, string> = {
  en_attente: "border-gray-500 text-gray-400",
  partiel:    "border-amber-500 text-amber-400",
  paye:       "border-green-500 text-green-400",
};
const calColor: Record<string, string> = {
  en_attente: "bg-amber-500/20 text-amber-300 border-l-2 border-amber-500",
  confirmee:  "bg-green-500/20 text-green-300 border-l-2 border-green-500",
  annulee:    "bg-red-500/20 text-red-300 border-l-2 border-red-500",
};

const MONTHS_FR = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
const DAYS_FR = ["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"];

const INPUT = "w-full bg-[#1c1c1c] border border-border-dark text-white text-sm rounded-lg py-2.5 px-3 focus:outline-none focus:border-gray-500";
const SELECT = "w-full bg-[#1c1c1c] border border-border-dark text-white text-sm rounded-lg py-2.5 px-3 focus:outline-none focus:border-gray-500 appearance-none";
const LABEL = "block text-[13px] font-bold uppercase tracking-wider text-gray-400 mb-2";

export default function ReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [voitures, setVoitures] = useState<Voiture[]>([]);
  const [tab, setTab] = useState<"list" | "calendar">("list");

  // Create form
  const [clientId, setClientId] = useState("");
  const [voitureId, setVoitureId] = useState("");
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");
  const [prixTotal, setPrixTotal] = useState("");
  const [statutRes, setStatutRes] = useState("en_attente");
  const [statutPay, setStatutPay] = useState("en_attente");
  const [saving, setSaving] = useState(false);

  // Delete
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Edit
  const [editRes, setEditRes] = useState<Reservation | null>(null);
  const [editClientId, setEditClientId] = useState("");
  const [editVoitureId, setEditVoitureId] = useState("");
  const [editDateDebut, setEditDateDebut] = useState("");
  const [editDateFin, setEditDateFin] = useState("");
  const [editPrix, setEditPrix] = useState("");
  const [editStatutRes, setEditStatutRes] = useState("en_attente");
  const [editStatutPay, setEditStatutPay] = useState("en_attente");
  const [editSaving, setEditSaving] = useState(false);

  // Calendar
  const today = new Date();
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());

  const loadReservations = useCallback(() => {
    supabase.from("reservations").select("*").order("date_creation", { ascending: false })
      .then(({ data }) => setReservations(data || []));
  }, []);

  useEffect(() => {
    supabase.from("clients").select("*").order("date_creation", { ascending: false }).then(({ data }) => setClients(data || []));
    supabase.from("voitures").select("*").order("date_creation", { ascending: false }).then(({ data }) => setVoitures(data || []));
    loadReservations();
  }, [loadReservations]);

  // Auto-calc on create
  useEffect(() => {
    if (!voitureId || !dateDebut || !dateFin) return;
    const v = voitures.find((v) => v.id === voitureId);
    if (!v) return;
    const days = Math.max(1, Math.ceil((new Date(dateFin).getTime() - new Date(dateDebut).getTime()) / 86400000));
    setPrixTotal(String(v.prix_par_jour * days));
  }, [voitureId, dateDebut, dateFin, voitures]);

  // Auto-calc on edit
  useEffect(() => {
    if (!editVoitureId || !editDateDebut || !editDateFin) return;
    const v = voitures.find((v) => v.id === editVoitureId);
    if (!v) return;
    const days = Math.max(1, Math.ceil((new Date(editDateFin).getTime() - new Date(editDateDebut).getTime()) / 86400000));
    setEditPrix(String(v.prix_par_jour * days));
  }, [editVoitureId, editDateDebut, editDateFin, voitures]);

  function openEdit(res: Reservation) {
    setEditRes(res);
    setEditClientId(res.client_id);
    setEditVoitureId(res.voiture_id);
    setEditDateDebut(res.date_debut);
    setEditDateFin(res.date_fin);
    setEditPrix(String(res.prix_total));
    setEditStatutRes(res.statut_reservation);
    setEditStatutPay(res.statut_paiement);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!clientId || !voitureId || !dateDebut || !dateFin || saving) return;
    setSaving(true);
    const { error } = await supabase.from("reservations").insert({
      client_id: clientId, voiture_id: voitureId,
      date_debut: dateDebut, date_fin: dateFin,
      prix_total: parseFloat(prixTotal) || 0,
      statut_reservation: statutRes, statut_paiement: statutPay,
    });
    if (!error) {
      setClientId(""); setVoitureId(""); setDateDebut("");
      setDateFin(""); setPrixTotal(""); setStatutRes("en_attente"); setStatutPay("en_attente");
      loadReservations();
    }
    setSaving(false);
  }

  async function handleDelete() {
    if (!deleteId || deleting) return;
    setDeleting(true);
    await supabase.from("reservations").delete().eq("id", deleteId);
    setReservations((prev) => prev.filter((r) => r.id !== deleteId));
    setDeleteId(null);
    setDeleting(false);
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editRes || editSaving) return;
    setEditSaving(true);
    const updates = {
      client_id: editClientId, voiture_id: editVoitureId,
      date_debut: editDateDebut, date_fin: editDateFin,
      prix_total: parseFloat(editPrix) || 0,
      statut_reservation: editStatutRes, statut_paiement: editStatutPay,
    };
    const { error } = await supabase.from("reservations").update(updates).eq("id", editRes.id);
    if (!error) {
      setReservations((prev) => prev.map((r) => r.id === editRes.id ? { ...r, ...updates } : r));
      setEditRes(null);
    }
    setEditSaving(false);
  }

  async function updateStatutRes(id: string, val: string) {
    await supabase.from("reservations").update({ statut_reservation: val }).eq("id", id);
    setReservations((prev) => prev.map((r) => r.id === id ? { ...r, statut_reservation: val } : r));
  }

  async function updateStatutPay(id: string, val: string) {
    await supabase.from("reservations").update({ statut_paiement: val }).eq("id", id);
    setReservations((prev) => prev.map((r) => r.id === id ? { ...r, statut_paiement: val } : r));
  }

  const clientsMap = Object.fromEntries(clients.map((c) => [c.id, c]));
  const voituresMap = Object.fromEntries(voitures.map((v) => [v.id, v]));

  function buildCalendar() {
    const firstDay = new Date(calYear, calMonth, 1);
    const lastDay = new Date(calYear, calMonth + 1, 0);
    let startDow = firstDay.getDay();
    startDow = startDow === 0 ? 6 : startDow - 1;
    const days: (number | null)[] = Array(startDow).fill(null);
    for (let d = 1; d <= lastDay.getDate(); d++) days.push(d);
    while (days.length % 7 !== 0) days.push(null);
    return days;
  }

  function getReservationsForDay(day: number) {
    const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return reservations.filter((r) => r.date_debut <= dateStr && r.date_fin >= dateStr);
  }

  const calDays = buildCalendar();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-${String(today.getDate()).padStart(2,"0")}`;

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link href="/" className="p-2 rounded-md hover:bg-white/5 text-gray-400 transition">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-3xl font-bold">Réservations</h1>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-12">

        {/* CREATE FORM */}
        <section className="xl:col-span-4 bg-bg-card rounded-xl p-6 border border-border-dark h-fit">
          <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
            <Plus className="w-5 h-5 text-gray-400" /> Créer réservation
          </h2>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className={LABEL}>Client</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <select value={clientId} onChange={(e) => setClientId(e.target.value)} required
                  className="w-full bg-[#1c1c1c] border border-border-dark text-white rounded-lg py-2.5 pl-10 pr-3 focus:outline-none focus:border-gray-500 appearance-none text-sm">
                  <option value="">Choisir un client</option>
                  {clients.map((c) => <option key={c.id} value={c.id}>{c.nom} — {c.telephone}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className={LABEL}>Voiture</label>
              <div className="relative">
                <Car className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <select value={voitureId} onChange={(e) => setVoitureId(e.target.value)} required
                  className="w-full bg-[#1c1c1c] border border-border-dark text-white rounded-lg py-2.5 pl-10 pr-3 focus:outline-none focus:border-gray-500 appearance-none text-sm">
                  <option value="">Choisir une voiture</option>
                  {voitures.map((v) => <option key={v.id} value={v.id}>{v.nom_voiture} — {v.prix_par_jour} MAD/j</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={LABEL}>Début</label>
                <input type="date" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} required className={INPUT + " [color-scheme:dark]"} />
              </div>
              <div>
                <label className={LABEL}>Fin</label>
                <input type="date" value={dateFin} onChange={(e) => setDateFin(e.target.value)} required className={INPUT + " [color-scheme:dark]"} />
              </div>
            </div>
            <div>
              <label className={LABEL}>
                Prix total (MAD)
                {prixTotal && <span className="ml-2 text-green-400 font-medium normal-case tracking-normal text-xs">auto-calculé</span>}
              </label>
              <input type="number" value={prixTotal} onChange={(e) => setPrixTotal(e.target.value)} placeholder="0" className={INPUT} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={LABEL}>Réservation</label>
                <select value={statutRes} onChange={(e) => setStatutRes(e.target.value)} className={SELECT}>
                  <option value="en_attente">En attente</option>
                  <option value="confirmee">Confirmée</option>
                  <option value="annulee">Annulée</option>
                </select>
              </div>
              <div>
                <label className={LABEL}>Paiement</label>
                <select value={statutPay} onChange={(e) => setStatutPay(e.target.value)} className={SELECT}>
                  <option value="en_attente">En attente</option>
                  <option value="partiel">Partiel</option>
                  <option value="paye">Payé</option>
                </select>
              </div>
            </div>
            <button type="submit" disabled={saving}
              className="w-full rounded-lg bg-white hover:bg-gray-200 text-black transition py-3 text-sm font-bold disabled:opacity-40">
              {saving ? "Enregistrement..." : "Enregistrer"}
            </button>
          </form>
        </section>

        {/* RIGHT */}
        <section className="xl:col-span-8 bg-bg-card rounded-xl border border-border-dark overflow-hidden flex flex-col">
          <div className="p-4 border-b border-white/5 flex items-center justify-between">
            <div className="flex gap-1 bg-[#1c1c1c] rounded-lg p-1">
              <button onClick={() => setTab("list")}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${tab === "list" ? "bg-white text-black" : "text-gray-400 hover:text-white"}`}>
                Liste
              </button>
              <button onClick={() => setTab("calendar")}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition flex items-center gap-2 ${tab === "calendar" ? "bg-white text-black" : "text-gray-400 hover:text-white"}`}>
                <Calendar className="w-4 h-4" /> Calendrier
              </button>
            </div>
            <span className="bg-[#1c1c1c] border border-border-dark text-gray-300 text-xs font-bold px-3 py-1 rounded-full">
              {reservations.length}
            </span>
          </div>

          {/* LIST */}
          {tab === "list" && (
            <div className="p-6 flex-1 overflow-y-auto space-y-4">
              {reservations.map((res) => {
                const client = clientsMap[res.client_id];
                const voiture = voituresMap[res.voiture_id];
                const resVal = res.statut_reservation || "en_attente";
                const payVal = res.statut_paiement || "en_attente";
                return (
                  <div key={res.id} className="bg-[#1c1c1c] border border-border-dark rounded-xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:border-gray-600 transition group">
                    <div className="flex gap-4 items-center">
                      <div className="w-11 h-11 rounded-full bg-white/5 border border-white/5 flex items-center justify-center shrink-0">
                        <User className="w-5 h-5 text-gray-400" />
                      </div>
                      <div>
                        <h3 className="font-bold text-[15px] mb-1">{client?.nom || "Client inconnu"}</h3>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-400">
                          <span className="flex items-center gap-1.5"><Car className="w-3.5 h-3.5" />{voiture?.nom_voiture || "Voiture inconnue"}</span>
                          <span className="text-gray-600">•</span>
                          <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />{res.date_debut} → {res.date_fin}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 sm:ml-auto flex-wrap">
                      <div className="text-right">
                        <span className="block text-lg font-bold text-white leading-tight">
                          {res.prix_total || "—"} <span className="text-xs text-gray-500 font-medium">MAD</span>
                        </span>
                        <select value={payVal} onChange={(e) => updateStatutPay(res.id, e.target.value)}
                          className={`mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full border cursor-pointer outline-none bg-transparent ${payBadgeStyle[payVal] || payBadgeStyle.en_attente}`}>
                          <option value="en_attente" className="bg-[#1c1c1c] text-white">En attente</option>
                          <option value="partiel" className="bg-[#1c1c1c] text-white">Partiel</option>
                          <option value="paye" className="bg-[#1c1c1c] text-white">Payé</option>
                        </select>
                      </div>
                      <div className="h-10 w-px bg-white/5 hidden sm:block" />
                      <select value={resVal} onChange={(e) => updateStatutRes(res.id, e.target.value)}
                        className={`text-[11px] font-bold px-3 py-1.5 rounded-full cursor-pointer outline-none border-0 ${resBadgeStyle[resVal] || resBadgeStyle.en_attente} bg-transparent`}>
                        <option value="en_attente" className="bg-[#1c1c1c] text-white">En attente</option>
                        <option value="confirmee" className="bg-[#1c1c1c] text-white">Confirmée</option>
                        <option value="annulee" className="bg-[#1c1c1c] text-white">Annulée</option>
                      </select>
                      {/* Edit + Delete — appear on hover */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                        <button onClick={() => openEdit(res)}
                          className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition" title="Modifier">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => setDeleteId(res.id)}
                          className="p-2 rounded-lg hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition" title="Supprimer">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
              {reservations.length === 0 && (
                <div className="text-center py-16 bg-[#1c1c1c] rounded-xl border border-border-dark border-dashed">
                  <Calendar className="w-10 h-10 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-lg font-bold mb-1">Aucune réservation</h3>
                  <p className="text-gray-500 text-sm">Les nouvelles réservations apparaîtront ici.</p>
                </div>
              )}
            </div>
          )}

          {/* CALENDAR */}
          {tab === "calendar" && (
            <div className="p-6 flex-1 overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <button onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); } else setCalMonth(m => m - 1); }}
                  className="p-2 rounded-lg hover:bg-white/5 text-gray-400 transition">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <h3 className="text-lg font-bold">{MONTHS_FR[calMonth]} {calYear}</h3>
                <button onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); } else setCalMonth(m => m + 1); }}
                  className="p-2 rounded-lg hover:bg-white/5 text-gray-400 transition">
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
              <div className="grid grid-cols-7 mb-2">
                {DAYS_FR.map((d) => (
                  <div key={d} className="text-center text-xs font-bold text-gray-500 uppercase py-2">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {calDays.map((day, i) => {
                  if (!day) return <div key={i} className="min-h-[80px]" />;
                  const dayStr = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                  const isToday = dayStr === todayStr;
                  const dayRes = getReservationsForDay(day);
                  return (
                    <div key={i} className={`min-h-[80px] rounded-lg p-1.5 border transition ${isToday ? "border-white/30 bg-white/5" : "border-border-dark bg-[#1c1c1c] hover:border-gray-600"}`}>
                      <div className={`text-xs font-bold mb-1 w-6 h-6 flex items-center justify-center rounded-full ${isToday ? "bg-white text-black" : "text-gray-400"}`}>
                        {day}
                      </div>
                      <div className="space-y-0.5">
                        {dayRes.slice(0, 2).map((res) => {
                          const client = clientsMap[res.client_id];
                          const statusKey = res.statut_reservation || "en_attente";
                          return (
                            <div key={res.id}
                              onClick={() => openEdit(res)}
                              className={`text-[10px] px-1.5 py-0.5 rounded truncate font-medium cursor-pointer hover:opacity-80 transition ${calColor[statusKey] || calColor.en_attente}`}>
                              {client?.nom || "Client"}
                            </div>
                          );
                        })}
                        {dayRes.length > 2 && (
                          <div className="text-[10px] text-gray-500 px-1">+{dayRes.length - 2} autres</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-4 mt-6 pt-4 border-t border-border-dark">
                <span className="text-xs text-gray-500 font-medium">Légende:</span>
                {[{ key: "en_attente", label: "En attente" }, { key: "confirmee", label: "Confirmée" }, { key: "annulee", label: "Annulée" }].map(({ key, label }) => (
                  <div key={key} className="flex items-center gap-1.5">
                    <div className={`w-3 h-3 rounded-sm ${calColor[key]}`} />
                    <span className="text-xs text-gray-400">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>

      {/* DELETE MODAL */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={() => setDeleteId(null)}>
          <div className="bg-bg-card border border-border-dark rounded-2xl p-6 w-full max-w-sm shadow-2xl"
            onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-5 h-5 text-red-400" />
            </div>
            <h2 className="text-lg font-bold text-center mb-2">Supprimer la réservation ?</h2>
            <p className="text-gray-400 text-sm text-center mb-6">Cette action est irréversible.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)}
                className="flex-1 py-2.5 rounded-xl border border-border-dark text-sm text-gray-400 hover:bg-white/5 transition">
                Annuler
              </button>
              <button onClick={handleDelete} disabled={deleting}
                className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition disabled:opacity-40">
                {deleting ? "Suppression..." : "Supprimer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editRes && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setEditRes(null)}>
          <div className="bg-bg-card border border-border-dark rounded-2xl p-6 w-full max-w-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold">Modifier la réservation</h2>
              <button onClick={() => setEditRes(null)} className="text-gray-400 hover:text-white transition">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleEdit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={LABEL}>Client</label>
                  <select value={editClientId} onChange={(e) => setEditClientId(e.target.value)} className={SELECT}>
                    {clients.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
                  </select>
                </div>
                <div>
                  <label className={LABEL}>Voiture</label>
                  <select value={editVoitureId} onChange={(e) => setEditVoitureId(e.target.value)} className={SELECT}>
                    {voitures.map((v) => <option key={v.id} value={v.id}>{v.nom_voiture}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={LABEL}>Début</label>
                  <input type="date" value={editDateDebut} onChange={(e) => setEditDateDebut(e.target.value)}
                    className={INPUT + " [color-scheme:dark]"} required />
                </div>
                <div>
                  <label className={LABEL}>Fin</label>
                  <input type="date" value={editDateFin} onChange={(e) => setEditDateFin(e.target.value)}
                    className={INPUT + " [color-scheme:dark]"} required />
                </div>
              </div>
              <div>
                <label className={LABEL}>
                  Prix total (MAD)
                  {editPrix && <span className="ml-2 text-green-400 font-medium normal-case tracking-normal text-xs">auto-calculé</span>}
                </label>
                <input type="number" value={editPrix} onChange={(e) => setEditPrix(e.target.value)} className={INPUT} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={LABEL}>Réservation</label>
                  <select value={editStatutRes} onChange={(e) => setEditStatutRes(e.target.value)} className={SELECT}>
                    <option value="en_attente">En attente</option>
                    <option value="confirmee">Confirmée</option>
                    <option value="annulee">Annulée</option>
                  </select>
                </div>
                <div>
                  <label className={LABEL}>Paiement</label>
                  <select value={editStatutPay} onChange={(e) => setEditStatutPay(e.target.value)} className={SELECT}>
                    <option value="en_attente">En attente</option>
                    <option value="partiel">Partiel</option>
                    <option value="paye">Payé</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setEditRes(null)}
                  className="flex-1 py-2.5 rounded-xl border border-border-dark text-sm text-gray-400 hover:bg-white/5 transition">
                  Annuler
                </button>
                <button type="submit" disabled={editSaving}
                  className="flex-1 py-2.5 rounded-xl bg-white hover:bg-gray-200 text-black text-sm font-bold transition disabled:opacity-40">
                  {editSaving ? "Sauvegarde..." : "Sauvegarder"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
