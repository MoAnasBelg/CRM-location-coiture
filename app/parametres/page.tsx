"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Building2, Phone, Bot, Bell, Users, LogOut, Eye, EyeOff, X, Plus } from "lucide-react";

const INPUT = "w-full bg-[#1c1c1c] border border-border-dark rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-gray-500 transition";
const LABEL = "block text-sm text-gray-400 mb-1.5 font-medium";

function Section({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-bg-card rounded-xl border border-border-dark p-6">
      <h2 className="text-base font-bold mb-5 flex items-center gap-2">
        <Icon className="w-4 h-4 text-gray-400" />
        {title}
      </h2>
      {children}
    </div>
  );
}

function Toggle({ label, description, value, onChange }: {
  label: string; description: string; value: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
      <div>
        <p className="text-sm font-medium text-white">{label}</p>
        <p className="text-xs text-gray-500 mt-0.5">{description}</p>
      </div>
      <button onClick={() => onChange(!value)}
        className={`relative w-10 h-6 rounded-full transition-colors ${value ? "bg-green-500" : "bg-white/10"}`}>
        <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${value ? "translate-x-5" : "translate-x-1"}`} />
      </button>
    </div>
  );
}

type AdminUser = { id: string; email: string; created_at: string };

export default function ParametresPage() {
  const router = useRouter();

  const [agenceName, setAgenceName] = useState("");
  const [agenceVille, setAgenceVille] = useState("");
  const [agenceAdresse, setAgenceAdresse] = useState("");
  const [agenceWhatsapp, setAgenceWhatsapp] = useState("");

  const [aiEnabled, setAiEnabled] = useState(false);
  const [aiLanguage, setAiLanguage] = useState("fr_darija");
  const [aiTone, setAiTone] = useState("professionnel");
  const [aiApiKey, setAiApiKey] = useState("");

  const [notifNewLead, setNotifNewLead] = useState(true);
  const [notifReservation, setNotifReservation] = useState(true);
  const [notifReminder, setNotifReminder] = useState(true);

  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);
  const [showAddUser, setShowAddUser] = useState(false);
  const [newPwd, setNewPwd] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdMsg, setPwdMsg] = useState("");

  const [saved, setSaved] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setCurrentUser({
          id: data.user.id,
          email: data.user.email || "",
          created_at: data.user.created_at,
        });
      }
    });
  }, []);

  async function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  async function handleLogout() {
    setLoggingOut(true);
    await supabase.auth.signOut();
    router.push("/login");
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!newPwd.trim() || pwdSaving) return;
    setPwdSaving(true);
    setPwdMsg("");
    const { error } = await supabase.auth.updateUser({ password: newPwd });
    if (error) {
      setPwdMsg("Erreur: " + error.message);
    } else {
      setPwdMsg("Mot de passe mis à jour !");
      setNewPwd("");
    }
    setPwdSaving(false);
    setTimeout(() => setPwdMsg(""), 3000);
  }

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link href="/" className="p-2 rounded-md hover:bg-white/5 text-gray-400 transition">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Paramètres</h1>
            <p className="text-gray-500 text-sm mt-0.5">Configuration de votre CRM</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleLogout} disabled={loggingOut}
            className="px-4 py-2.5 rounded-xl border border-border-dark text-sm text-gray-400 hover:text-red-400 hover:border-red-500/30 flex items-center gap-2 transition disabled:opacity-40">
            <LogOut className="w-4 h-4" />
            {loggingOut ? "Déconnexion..." : "Se déconnecter"}
          </button>
          <button onClick={handleSave}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition ${saved ? "bg-green-500 text-white" : "bg-white text-black hover:bg-gray-200"}`}>
            <Save className="w-4 h-4" />
            {saved ? "Sauvegardé !" : "Sauvegarder"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        <Section icon={Building2} title="Informations de l'agence">
          <div className="space-y-4">
            <div>
              <label className={LABEL}>Nom de agence</label>
              <input value={agenceName} onChange={(e) => setAgenceName(e.target.value)}
                placeholder="ex: Auto Location Casablanca" className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Ville</label>
              <input value={agenceVille} onChange={(e) => setAgenceVille(e.target.value)}
                placeholder="ex: Casablanca" className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Adresse</label>
              <input value={agenceAdresse} onChange={(e) => setAgenceAdresse(e.target.value)}
                placeholder="ex: 12 Rue Hassan II" className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Numéro WhatsApp</label>
              <input value={agenceWhatsapp} onChange={(e) => setAgenceWhatsapp(e.target.value)}
                placeholder="ex: +212612345678" className={INPUT} />
              <p className="text-xs text-gray-500 mt-1.5">Sera utilisé pour Baileys (Phase 3)</p>
            </div>
          </div>
        </Section>

        <Section icon={Bot} title="Intelligence Artificielle">
          <div className="space-y-4">
            <Toggle label="Activer l'IA" description="Réponses automatiques aux messages WhatsApp"
              value={aiEnabled} onChange={setAiEnabled} />
            <div>
              <label className={LABEL}>Langue</label>
              <select value={aiLanguage} onChange={(e) => setAiLanguage(e.target.value)}
                className={INPUT + " appearance-none"}>
                <option value="fr_darija">Français + Darija</option>
                <option value="fr">Français uniquement</option>
                <option value="ar">Arabe uniquement</option>
                <option value="all">Français + Darija + Arabe</option>
              </select>
            </div>
            <div>
              <label className={LABEL}>Ton</label>
              <select value={aiTone} onChange={(e) => setAiTone(e.target.value)}
                className={INPUT + " appearance-none"}>
                <option value="professionnel">Professionnel</option>
                <option value="amical">Amical</option>
                <option value="formel">Formel</option>
              </select>
            </div>
            <div>
              <label className={LABEL}>Clé API OpenAI</label>
              <input type="password" value={aiApiKey} onChange={(e) => setAiApiKey(e.target.value)}
                placeholder="sk-..." className={INPUT} />
            </div>
          </div>
        </Section>

        <Section icon={Bell} title="Notifications">
          <Toggle label="Nouveau lead" description="Quand un client envoie un premier message"
            value={notifNewLead} onChange={setNotifNewLead} />
          <Toggle label="Nouvelle réservation" description="Quand une réservation est créée"
            value={notifReservation} onChange={setNotifReservation} />
          <Toggle label="Rappels" description="Avant les départs et retours de voitures"
            value={notifReminder} onChange={setNotifReminder} />
        </Section>

        <Section icon={Users} title="Gestion des utilisateurs">
          <div className="space-y-4">
            {currentUser && (
              <div className="bg-[#1c1c1c] rounded-xl p-4 border border-border-dark">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm font-bold">{currentUser.email}</p>
                    <p className="text-xs text-gray-500 mt-0.5">Compte connecté</p>
                  </div>
                  <span className="text-[10px] bg-green-500/10 text-green-400 border border-green-500/20 px-2 py-1 rounded-full font-bold">
                    Admin
                  </span>
                </div>
                <form onSubmit={handleChangePassword} className="space-y-2">
                  <label className="text-xs text-gray-500">Changer le mot de passe</label>
                  <div className="relative">
                    <input type={showPwd ? "text" : "password"} value={newPwd}
                      onChange={(e) => setNewPwd(e.target.value)} placeholder="Nouveau mot de passe"
                      className="w-full bg-black/30 border border-border-dark rounded-lg px-3 py-2 pr-9 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-gray-500" />
                    <button type="button" onClick={() => setShowPwd(!showPwd)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                      {showPwd ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  {pwdMsg && (
                    <p className={`text-xs ${pwdMsg.startsWith("Erreur") ? "text-red-400" : "text-green-400"}`}>{pwdMsg}</p>
                  )}
                  <button type="submit" disabled={pwdSaving || !newPwd.trim()}
                    className="w-full py-2 rounded-lg bg-white/10 hover:bg-white/15 text-xs text-white font-medium transition disabled:opacity-40">
                    {pwdSaving ? "Mise à jour..." : "Mettre à jour le mot de passe"}
                  </button>
                </form>
              </div>
            )}

            <button onClick={() => setShowAddUser(true)}
              className="w-full py-2.5 rounded-xl border border-dashed border-border-dark text-sm text-gray-400 hover:text-white hover:border-gray-500 flex items-center justify-center gap-2 transition">
              <Plus className="w-4 h-4" /> Ajouter un utilisateur
            </button>

            <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3">
              <p className="text-xs text-amber-400 leading-relaxed">
                Pour créer un utilisateur: <strong>Supabase → Authentication → Users → Add user</strong>
              </p>
            </div>
          </div>
        </Section>

      </div>

      {showAddUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={() => setShowAddUser(false)}>
          <div className="bg-bg-card border border-border-dark rounded-2xl p-6 w-full max-w-sm shadow-2xl"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Ajouter un utilisateur</h2>
              <button onClick={() => setShowAddUser(false)} className="text-gray-400 hover:text-white transition">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 mb-4">
              <p className="text-xs text-amber-400 leading-relaxed">
                Allez sur <strong>Supabase → Authentication → Users → Add user</strong> pour créer un nouveau compte admin. Cochez bien <strong>Auto Confirm User</strong>.
              </p>
            </div>
            <button onClick={() => setShowAddUser(false)}
              className="w-full py-2.5 rounded-xl bg-white text-black text-sm font-bold hover:bg-gray-200 transition">
              Compris
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
