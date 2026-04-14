"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Car, Plus, Settings, X, Trash2, Check } from "lucide-react";
import Link from "next/link";

type Voiture = {
  id: string;
  nom_voiture: string;
  modele: string;
  matricule: string;
  prix_par_jour: number;
  statut_disponibilite: string;
  date_creation: string;
};

const STATUTS = ["disponible", "reservee", "louee", "en_maintenance"] as const;

const statutConfig: Record<string, { dot: string; text: string; label: string }> = {
  disponible:      { dot: "bg-green-500",  text: "text-green-400",  label: "Disponible" },
  reservee:        { dot: "bg-amber-500",  text: "text-amber-400",  label: "Réservée" },
  louee:           { dot: "bg-red-500",    text: "text-red-400",    label: "Louée" },
  en_maintenance:  { dot: "bg-gray-400",   text: "text-gray-400",   label: "Maintenance" },
};

function StatutBadge({ statut }: { statut: string }) {
  const cfg = statutConfig[statut] ?? { dot: "bg-gray-400", text: "text-gray-400", label: statut };
  return (
    <div className="flex items-center gap-2">
      <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
      <span className={`${cfg.text} text-[11px] font-bold uppercase tracking-wider`}>{cfg.label}</span>
    </div>
  );
}

type ModalProps = {
  onClose: () => void;
  onSaved: () => void;
  voiture?: Voiture | null;
};

function VoitureModal({ onClose, onSaved, voiture }: ModalProps) {
  const isEdit = !!voiture;
  const [form, setForm] = useState({
    nom_voiture: voiture?.nom_voiture ?? "",
    modele: voiture?.modele ?? "",
    matricule: voiture?.matricule ?? "",
    prix_par_jour: voiture?.prix_par_jour?.toString() ?? "",
    statut_disponibilite: voiture?.statut_disponibilite ?? "disponible",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    if (!form.nom_voiture || !form.modele || !form.matricule || !form.prix_par_jour) {
      setError("Tous les champs sont obligatoires.");
      return;
    }
    setLoading(true);
    setError("");
    const payload = {
      nom_voiture: form.nom_voiture.trim(),
      modele: form.modele.trim(),
      matricule: form.matricule.trim().toUpperCase(),
      prix_par_jour: parseFloat(form.prix_par_jour),
      statut_disponibilite: form.statut_disponibilite,
    };
    let result;
    if (isEdit) {
      result = await supabase.from("voitures").update(payload).eq("id", voiture!.id);
    } else {
      result = await supabase.from("voitures").insert([payload]);
    }
    setLoading(false);
    if (result.error) { setError(result.error.message); return; }
    onSaved();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold">{isEdit ? "Modifier la voiture" : "Ajouter une voiture"}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        <div className="space-y-4">
          {[
            { label: "Nom voiture", key: "nom_voiture", placeholder: "ex: Dacia Sandero" },
            { label: "Modèle", key: "modele", placeholder: "ex: Sandero Stepway 2022" },
            { label: "Matricule", key: "matricule", placeholder: "ex: 12345-A-1" },
            { label: "Prix / jour (MAD)", key: "prix_par_jour", placeholder: "ex: 250", type: "number" },
          ].map(({ label, key, placeholder, type }) => (
            <div key={key}>
              <label className="block text-xs text-gray-400 mb-1">{label}</label>
              <input
                type={type ?? "text"}
                placeholder={placeholder}
                value={form[key as keyof typeof form]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-white/30 transition"
              />
            </div>
          ))}

          <div>
            <label className="block text-xs text-gray-400 mb-1">Statut</label>
            <select
              value={form.statut_disponibilite}
              onChange={(e) => setForm((f) => ({ ...f, statut_disponibilite: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30 transition"
            >
              {STATUTS.map((s) => (
                <option key={s} value={s} className="bg-[#111]">{statutConfig[s].label}</option>
              ))}
            </select>
          </div>

          {error && <p className="text-red-400 text-xs">{error}</p>}
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-white/10 text-sm text-gray-400 hover:bg-white/5 transition">
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex-1 py-2 rounded-lg bg-white text-black text-sm font-medium hover:bg-gray-100 transition disabled:opacity-50"
          >
            {loading ? "Sauvegarde..." : isEdit ? "Sauvegarder" : "Ajouter"}
          </button>
        </div>
      </div>
    </div>
  );
}

type StatusMenuProps = {
  voiture: Voiture;
  onChanged: () => void;
  onClose: () => void;
};

function StatusMenu({ voiture, onChanged, onClose }: StatusMenuProps) {
  const handleChange = async (statut: string) => {
    await supabase.from("voitures").update({ statut_disponibilite: statut }).eq("id", voiture.id);
    onChanged();
    onClose();
  };

  return (
    <div className="absolute right-0 top-8 z-20 w-44 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-xl py-1 overflow-hidden">
      {STATUTS.map((s) => (
        <button
          key={s}
          onClick={() => handleChange(s)}
          className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-white/5 transition text-left"
        >
          <span className={statutConfig[s].text}>{statutConfig[s].label}</span>
          {voiture.statut_disponibilite === s && <Check className="w-3.5 h-3.5 text-green-400" />}
        </button>
      ))}
    </div>
  );
}

export default function VoituresPage() {
  const [voitures, setVoitures] = useState<Voiture[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editVoiture, setEditVoiture] = useState<Voiture | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadVoitures = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("voitures").select("*").order("date_creation", { ascending: false });
    setVoitures(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { 
    // eslint-disable-next-line
    loadVoitures(); 
  }, [loadVoitures]);

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer cette voiture ?")) return;
    setDeletingId(id);
    await supabase.from("voitures").delete().eq("id", id);
    setDeletingId(null);
    loadVoitures();
  };

  // Stats
  const total = voitures.length;
  const disponibles = voitures.filter((v) => v.statut_disponibilite === "disponible").length;
  const louees = voitures.filter((v) => v.statut_disponibilite === "louee").length;
  const maintenance = voitures.filter((v) => v.statut_disponibilite === "en_maintenance").length;

  return (
    <div className="flex-1 overflow-y-auto p-8" onClick={() => setOpenMenuId(null)}>
      {/* Topbar */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link href="/" className="p-2 rounded-md hover:bg-white/5 text-gray-400 transition">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Flotte</h1>
            <p className="text-gray-500 text-sm mt-0.5">{total} voiture{total !== 1 ? "s" : ""} au total</p>
          </div>
        </div>
        <button
          onClick={() => { setEditVoiture(null); setShowModal(true); }}
          className="px-4 py-2 rounded-lg bg-white text-black text-sm font-medium hover:bg-gray-100 transition flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Ajouter voiture
        </button>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-4 gap-3 mb-8">
        {[
          { label: "Total", value: total, color: "text-white" },
          { label: "Disponibles", value: disponibles, color: "text-green-400" },
          { label: "En location", value: louees, color: "text-red-400" },
          { label: "Maintenance", value: maintenance, color: "text-gray-400" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white/[0.04] border border-white/8 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">{label}</p>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="text-gray-500 text-sm">Chargement...</div>
      ) : voitures.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Car className="w-12 h-12 text-gray-700 mb-4" />
          <p className="text-gray-400 font-medium">Aucune voiture dans la flotte</p>
          <p className="text-gray-600 text-sm mt-1">Cliquez sur Ajouter voiture pour commencer</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {voitures.map((voiture) => (
            <div
              key={voiture.id}
              className={`bg-[#111] rounded-xl p-5 border border-white/8 flex flex-col transition ${deletingId === voiture.id ? "opacity-40" : ""}`}
            >
              {/* Card header */}
              <div className="flex items-center justify-between mb-4">
                <StatutBadge statut={voiture.statut_disponibilite} />
                <div className="relative" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => setOpenMenuId(openMenuId === voiture.id ? null : voiture.id)}
                    className="text-gray-500 hover:text-white transition p-1 rounded"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                  {openMenuId === voiture.id && (
                    <StatusMenu
                      voiture={voiture}
                      onChanged={loadVoitures}
                      onClose={() => setOpenMenuId(null)}
                    />
                  )}
                </div>
              </div>

              {/* Car info */}
              <div className="mb-5 flex-1">
                <h2 className="font-bold text-base mb-0.5">{voiture.nom_voiture}</h2>
                <p className="text-gray-500 text-sm">{voiture.modele}</p>
                <p className="text-gray-600 text-xs mt-1 font-mono">{voiture.matricule}</p>
              </div>

              {/* Footer */}
              <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-bold">{voiture.prix_par_jour}</span>
                  <span className="text-sm text-gray-500">MAD/j</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setEditVoiture(voiture); setShowModal(true); }}
                    className="text-gray-500 hover:text-white transition text-xs border border-white/8 rounded-md px-2 py-1"
                  >
                    Modifier
                  </button>
                  <button
                    onClick={() => handleDelete(voiture.id)}
                    className="text-gray-600 hover:text-red-400 transition p-1 rounded"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <VoitureModal
          voiture={editVoiture}
          onClose={() => { setShowModal(false); setEditVoiture(null); }}
          onSaved={loadVoitures}
        />
      )}
    </div>
  );
}
