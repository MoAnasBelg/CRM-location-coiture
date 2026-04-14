"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { ArrowLeft, Plus, Phone, Tag, MessageSquare, X, Pencil, Trash2 } from "lucide-react";

type Client = {
  id: string;
  nom: string;
  telephone: string;
  statut_lead: string;
  date_creation: string;
};

const STATUTS = ["Nouveau", "Intéressé", "Chaud", "Réservé", "Perdu"];

const statusStyle: Record<string, string> = {
  Nouveau:   "bg-blue-500/10 text-blue-400 border border-blue-500/20",
  Intéressé: "bg-purple-500/10 text-purple-400 border border-purple-500/20",
  Chaud:     "bg-orange-500/10 text-orange-400 border border-orange-500/20",
  Réservé:   "bg-green-500/10 text-green-400 border border-green-500/20",
  Perdu:     "bg-red-500/10 text-red-400 border border-red-500/20",
};

const INPUT = "w-full bg-[#1c1c1c] border border-border-dark rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-gray-500 transition";

function getStyle(statut: string) {
  return statusStyle[statut] || statusStyle["Nouveau"];
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);

  // Add
  const [showAdd, setShowAdd] = useState(false);
  const [nom, setNom] = useState("");
  const [telephone, setTelephone] = useState("");
  const [saving, setSaving] = useState(false);

  // Edit
  const [editClient, setEditClient] = useState<Client | null>(null);
  const [editNom, setEditNom] = useState("");
  const [editTel, setEditTel] = useState("");
  const [editStatut, setEditStatut] = useState("Nouveau");
  const [editSaving, setEditSaving] = useState(false);

  // Delete
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    supabase.from("clients").select("*").order("date_creation", { ascending: false })
      .then(({ data }: { data: any }) => setClients((data as Client[]) || []));
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!nom.trim() || !telephone.trim() || saving) return;
    setSaving(true);
    const { data, error } = await supabase
      .from("clients")
      .insert({ nom: nom.trim(), telephone: telephone.trim(), statut_lead: "Nouveau" })
      .select().single();
    if (!error && data) {
      setClients((prev) => [data, ...prev]);
      setNom(""); setTelephone(""); setShowAdd(false);
    }
    setSaving(false);
  }

  function openEdit(client: Client) {
    setEditClient(client);
    setEditNom(client.nom);
    setEditTel(client.telephone);
    setEditStatut(client.statut_lead || "Nouveau");
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editClient || editSaving) return;
    setEditSaving(true);
    const updates = { nom: editNom.trim(), telephone: editTel.trim(), statut_lead: editStatut };
    const { error } = await supabase.from("clients").update(updates).eq("id", editClient.id);
    if (!error) {
      setClients((prev) => prev.map((c) => c.id === editClient.id ? { ...c, ...updates } : c));
      setEditClient(null);
    }
    setEditSaving(false);
  }

  async function handleDelete() {
    if (!deleteId || deleting) return;
    setDeleting(true);
    await supabase.from("clients").delete().eq("id", deleteId);
    setClients((prev) => prev.filter((c) => c.id !== deleteId));
    setDeleteId(null);
    setDeleting(false);
  }

  async function handleStatusChange(clientId: string, newStatus: string) {
    await supabase.from("clients").update({ statut_lead: newStatus }).eq("id", clientId);
    setClients((prev) => prev.map((c) => c.id === clientId ? { ...c, statut_lead: newStatus } : c));
  }

  return (
    <div className="flex-1 overflow-y-auto p-8">
      {/* Topbar */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link href="/" className="p-2 rounded-md hover:bg-white/5 text-gray-400 transition">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-3xl font-bold">Clients / Leads</h1>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="px-4 py-2 rounded-md border border-border-dark text-sm font-medium hover:bg-white/5 transition flex items-center gap-2">
          <Plus className="w-4 h-4" /> Nouveau client
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {clients.map((client) => {
          const initials = client.nom.substring(0, 2).toUpperCase();
          const statut = client.statut_lead || "Nouveau";
          return (
            <div key={client.id} className="bg-bg-card rounded-xl p-5 border border-border-dark flex flex-col gap-4 group hover:border-gray-600 transition">

              {/* Top */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-white text-bg-sidebar flex items-center justify-center font-bold text-lg shrink-0">
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-[15px] truncate">{client.nom}</h3>
                  <div className="flex items-center gap-2 text-gray-400 text-sm mt-1">
                    <Phone className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{client.telephone}</span>
                  </div>
                </div>
                {/* Icons on hover */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition shrink-0">
                  <button onClick={() => openEdit(client)}
                    className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition" title="Modifier">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setDeleteId(client.id)}
                    className="p-1.5 rounded-lg hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition" title="Supprimer">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Status */}
              <div className="pt-4 border-t border-white/5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-gray-400 text-sm shrink-0">
                  <Tag className="w-3.5 h-3.5" />
                  Statut
                </div>
                <select value={statut} onChange={(e) => handleStatusChange(client.id, e.target.value)}
                  className={`text-[11px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider border-0 outline-none cursor-pointer ${getStyle(statut)} bg-transparent`}>
                  {STATUTS.map((s) => (
                    <option key={s} value={s} className="bg-[#1c1c1c] text-white normal-case tracking-normal font-normal">{s}</option>
                  ))}
                </select>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Link href={`/messages/${client.id}`}
                  className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm text-gray-300 transition">
                  <MessageSquare className="w-4 h-4" />
                  Messages
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {clients.length === 0 && (
        <div className="text-center py-20 bg-bg-card rounded-xl border border-border-dark">
          <h2 className="text-lg font-bold mb-2">Aucun client</h2>
          <p className="text-gray-400 text-sm">Ajoutez votre premier client avec le bouton en haut.</p>
        </div>
      )}

      {/* ADD MODAL */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={() => setShowAdd(false)}>
          <div className="bg-bg-card border border-border-dark rounded-2xl p-6 w-full max-w-md shadow-2xl"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold">Nouveau client</h2>
              <button onClick={() => setShowAdd(false)} className="text-gray-400 hover:text-white transition">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAdd} className="flex flex-col gap-4">
              <div>
                <label className="text-sm text-gray-400 mb-1.5 block">Nom complet</label>
                <input value={nom} onChange={(e) => setNom(e.target.value)}
                  placeholder="ex: Mohammed Alami" required className={INPUT} />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1.5 block">Téléphone</label>
                <input value={telephone} onChange={(e) => setTelephone(e.target.value)}
                  placeholder="ex: 0612345678" required className={INPUT} />
              </div>
              <div className="flex gap-3 mt-2">
                <button type="button" onClick={() => setShowAdd(false)}
                  className="flex-1 py-2.5 rounded-xl border border-border-dark text-sm text-gray-400 hover:bg-white/5 transition">
                  Annuler
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-2.5 rounded-xl bg-white text-black text-sm font-medium hover:bg-gray-200 transition disabled:opacity-40">
                  {saving ? "Ajout..." : "Ajouter"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editClient && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={() => setEditClient(null)}>
          <div className="bg-bg-card border border-border-dark rounded-2xl p-6 w-full max-w-md shadow-2xl"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold">Modifier le client</h2>
              <button onClick={() => setEditClient(null)} className="text-gray-400 hover:text-white transition">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleEdit} className="flex flex-col gap-4">
              <div>
                <label className="text-sm text-gray-400 mb-1.5 block">Nom complet</label>
                <input value={editNom} onChange={(e) => setEditNom(e.target.value)} required className={INPUT} />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1.5 block">Téléphone</label>
                <input value={editTel} onChange={(e) => setEditTel(e.target.value)} required className={INPUT} />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1.5 block">Statut lead</label>
                <select value={editStatut} onChange={(e) => setEditStatut(e.target.value)}
                  className="w-full bg-[#1c1c1c] border border-border-dark rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-gray-500 appearance-none">
                  {STATUTS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="flex gap-3 mt-2">
                <button type="button" onClick={() => setEditClient(null)}
                  className="flex-1 py-2.5 rounded-xl border border-border-dark text-sm text-gray-400 hover:bg-white/5 transition">
                  Annuler
                </button>
                <button type="submit" disabled={editSaving}
                  className="flex-1 py-2.5 rounded-xl bg-white text-black text-sm font-medium hover:bg-gray-200 transition disabled:opacity-40">
                  {editSaving ? "Sauvegarde..." : "Sauvegarder"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE MODAL */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={() => setDeleteId(null)}>
          <div className="bg-bg-card border border-border-dark rounded-2xl p-6 w-full max-w-sm shadow-2xl"
            onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-5 h-5 text-red-400" />
            </div>
            <h2 className="text-lg font-bold text-center mb-2">Supprimer ce client ?</h2>
            <p className="text-gray-400 text-sm text-center mb-6">
              Ses messages et réservations resteront dans la base.
            </p>
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
    </div>
  );
}
