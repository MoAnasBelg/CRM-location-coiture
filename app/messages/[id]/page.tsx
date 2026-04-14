"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { ArrowLeft, Send, Trash2 } from "lucide-react";
import { useParams } from "next/navigation";

type Client = {
  id: string;
  nom: string;
  telephone: string;
  statut_lead: string;
  date_creation: string;
};

type Message = {
  id: string;
  client_id: string;
  contenu_message: string;
  type_expediteur: string;
  date_creation: string;
};

type SidebarItem = Client & {
  lastMessage: string;
  lastTime: string;
  hasUnread: boolean;
};

const LEAD_STATUSES = ["Nouveau", "Intéressé", "Chaud", "Réservé", "Perdu"];

const statusColor: Record<string, string> = {
  Nouveau:   "bg-blue-500/10 text-blue-400 border border-blue-500/20",
  Intéressé: "bg-purple-500/10 text-purple-400 border border-purple-500/20",
  Chaud:     "bg-orange-500/10 text-orange-400 border border-orange-500/20",
  Réservé:   "bg-green-500/10 text-green-400 border border-green-500/20",
  Perdu:     "bg-red-500/10 text-red-400 border border-red-500/20",
};

function timeAgo(dateStr: string) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "maintenant";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}j`;
}

export default function ChatPage() {
  const params = useParams();
  const id = params.id as string;

  const [client, setClient] = useState<Client | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [allClients, setAllClients] = useState<Client[]>([]);
  const [allMessages, setAllMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadSidebar = useCallback(async () => {
    const [{ data: c }, { data: m }] = await Promise.all([
      supabase.from("clients").select("id, nom, telephone, statut_lead, date_creation").order("date_creation", { ascending: false }),
      supabase.from("messages").select("id, client_id, contenu_message, type_expediteur, date_creation").order("date_creation", { ascending: true }),
    ]);
    setAllClients((c as Client[]) ?? []);
    setAllMessages((m as Message[]) ?? []);
  }, []);

  const loadChat = useCallback(async () => {
    const [{ data: c }, { data: m }] = await Promise.all([
      supabase.from("clients").select("id, nom, telephone, statut_lead, date_creation").eq("id", id).single(),
      supabase.from("messages").select("id, client_id, contenu_message, type_expediteur, date_creation").eq("client_id", id).order("date_creation", { ascending: true }),
    ]);
    if (c) setClient(c as Client);
    setMessages((m as Message[]) ?? []);
  }, [id]);

  useEffect(() => { loadSidebar(); }, [loadSidebar]);
  useEffect(() => { if (id) loadChat(); }, [id, loadChat]);

  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel(`chat-full-${id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        const msg = payload.new as Message;
        setAllMessages((prev) => [...prev, msg]);
        if (msg.client_id === id) {
          setMessages((prev) => {
            // avoid duplicate if optimistic update already added it
            if (prev.find((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
        }
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "messages" }, (payload) => {
        const old = payload.old as { id: string };
        setAllMessages((prev) => prev.filter((m) => m.id !== old.id));
        setMessages((prev) => prev.filter((m) => m.id !== old.id));
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "clients" }, (payload) => {
        const updated = payload.new as Client;
        setAllClients((prev) =>
          prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c))
        );
        if (updated.id === id) {
          setClient((prev) => (prev ? { ...prev, ...updated } : prev));
        }
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "clients" }, () => {
        loadSidebar();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [id, loadSidebar]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sidebarItems: SidebarItem[] = allClients
    .map((c) => {
      const msgs = allMessages.filter((m) => m.client_id === c.id);
      const last = msgs[msgs.length - 1];
      return {
        ...c,
        lastMessage: last?.contenu_message ?? "",
        lastTime: last?.date_creation ?? c.date_creation ?? "",
        hasUnread: msgs.some((m) => m.type_expediteur === "client"),
      };
    })
    .sort((a, b) => new Date(b.lastTime).getTime() - new Date(a.lastTime).getTime());

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || sending) return;
    setSending(true);

    const optimistic: Message = {
      id: `temp-${Date.now()}`,
      client_id: id,
      contenu_message: input.trim(),
      type_expediteur: "agent",
      date_creation: new Date().toISOString(),
    };

    // Optimistic update — show immediately
    setMessages((prev) => [...prev, optimistic]);
    const text = input.trim();
    setInput("");

    const { data } = await supabase.from("messages").insert({
      client_id: id,
      contenu_message: text,
      type_expediteur: "agent",
    }).select().single();

    // Replace optimistic with real record
    if (data) {
      setMessages((prev) =>
        prev.map((m) => (m.id === optimistic.id ? (data as Message) : m))
      );
    }

    setSending(false);
  }

  async function handleDeleteMessage(msgId: string) {
    setDeletingId(msgId);
    // Optimistic delete — remove immediately
    setMessages((prev) => prev.filter((m) => m.id !== msgId));
    setAllMessages((prev) => prev.filter((m) => m.id !== msgId));
    await supabase.from("messages").delete().eq("id", msgId);
    setDeletingId(null);
  }

  async function handleStatusChange(newStatus: string) {
    await supabase.from("clients").update({ statut_lead: newStatus }).eq("id", id);
    setClient((prev) => (prev ? { ...prev, statut_lead: newStatus } : prev));
  }

  const initials = client?.nom?.substring(0, 2).toUpperCase() ?? "??";

  return (
    <div className="flex-1 overflow-hidden flex flex-col h-full">

      <div className="flex items-center gap-4 p-8 pb-4 shrink-0">
        <Link href="/messages" className="p-2 rounded-md hover:bg-white/5 text-gray-400 transition">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-3xl font-bold">Messages</h1>
      </div>

      <div className="flex-1 flex overflow-hidden px-8 pb-8">

        {/* SIDEBAR */}
        <div className="w-[300px] xl:w-[360px] bg-bg-card rounded-l-xl border border-border-dark flex flex-col shrink-0 shadow-xl">
          <div className="p-4 border-b border-white/5">
            <p className="text-xs text-gray-500">{allClients.length} conversations</p>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
            {sidebarItems.map((c) => {
              const ini = c.nom.substring(0, 2).toUpperCase();
              const isActive = c.id === id;
              const badge = statusColor[c.statut_lead] ?? "bg-gray-500/10 text-gray-400 border border-gray-500/20";

              return (
                <Link
                  key={c.id}
                  href={`/messages/${c.id}`}
                  className={`flex items-start gap-3 p-3 rounded-xl transition group ${
                    isActive ? "bg-white/10" : "hover:bg-white/5"
                  }`}
                >
                  <div className="relative shrink-0">
                    <div className={`w-11 h-11 rounded-full border border-border-dark flex items-center justify-center font-bold text-sm transition-colors ${
                      isActive
                        ? "bg-white text-black"
                        : "bg-[#1c1c1c] text-gray-400 group-hover:bg-white group-hover:text-black"
                    }`}>
                      {ini}
                    </div>
                    {c.hasUnread && !isActive && (
                      <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-[#0f0f0f]" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <h3 className={`text-[13px] truncate ${
                        c.hasUnread && !isActive ? "font-bold text-white" : "font-medium text-gray-300"
                      }`}>
                        {c.nom}
                      </h3>
                      <span className="text-[10px] text-gray-600 shrink-0 ml-1">
                        {timeAgo(c.lastTime)}
                      </span>
                    </div>

                    {c.lastMessage ? (
                      <p className={`text-xs truncate mb-1.5 ${
                        c.hasUnread && !isActive ? "text-gray-300" : "text-gray-600"
                      }`}>
                        {c.lastMessage}
                      </p>
                    ) : (
                      <p className="text-xs text-gray-700 italic mb-1.5">Aucun message</p>
                    )}

                    {c.statut_lead && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badge}`}>
                        {c.statut_lead}
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* CHAT AREA */}
        <div className="flex-1 bg-[#141414] rounded-r-xl border border-l-0 border-border-dark flex flex-col overflow-hidden">

          {/* Header */}
          <div className="p-4 border-b border-border-dark flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#1c1c1c] border border-border-dark text-gray-400 flex items-center justify-center font-bold text-sm">
                {initials}
              </div>
              <div>
                <h2 className="font-bold text-sm">{client?.nom ?? "—"}</h2>
                <p className="text-xs text-gray-500">{client?.telephone ?? "—"}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Statut:</span>
              <select
                value={client?.statut_lead ?? "Nouveau"}
                onChange={(e) => handleStatusChange(e.target.value)}
                className={`text-xs px-3 py-1.5 rounded-full border outline-none cursor-pointer font-medium bg-transparent ${
                  statusColor[client?.statut_lead ?? "Nouveau"] ?? statusColor["Nouveau"]
                }`}
              >
                {LEAD_STATUSES.map((s) => (
                  <option key={s} value={s} className="bg-[#1c1c1c] text-white">{s}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-5 space-y-3">
            {messages.length === 0 && (
              <p className="text-center text-gray-600 text-sm mt-10">Aucun message pour ce client.</p>
            )}

            {messages.map((msg) => {
              const isAgent = msg.type_expediteur === "agent";
              const isHovered = hoveredId === msg.id;
              const isDeleting = deletingId === msg.id;
              const isTemp = msg.id.startsWith("temp-");

              return (
                <div
                  key={msg.id}
                  className={`flex items-end gap-2 ${isAgent ? "justify-end" : "justify-start"}`}
                  onMouseEnter={() => setHoveredId(msg.id)}
                  onMouseLeave={() => setHoveredId(null)}
                >
                  {isAgent && !isTemp && (
                    <button
                      onClick={() => handleDeleteMessage(msg.id)}
                      disabled={isDeleting}
                      className={`p-1.5 rounded-lg transition shrink-0 ${
                        isHovered ? "opacity-100" : "opacity-0"
                      } ${isDeleting ? "opacity-40 cursor-not-allowed" : "hover:bg-red-500/10 text-gray-600 hover:text-red-400"}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <div className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed transition-opacity ${
                    isDeleting || isTemp ? "opacity-60" : "opacity-100"
                  } ${
                    isAgent
                      ? "bg-white text-black rounded-br-sm"
                      : "bg-[#1c1c1c] text-white border border-border-dark rounded-bl-sm"
                  }`}>
                    {msg.contenu_message}
                    <div className={`text-[10px] mt-1 ${isAgent ? "text-gray-400" : "text-gray-600"}`}>
                      {new Date(msg.date_creation).toLocaleTimeString("fr-MA", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>

                  {!isAgent && !isTemp && (
                    <button
                      onClick={() => handleDeleteMessage(msg.id)}
                      disabled={isDeleting}
                      className={`p-1.5 rounded-lg transition shrink-0 ${
                        isHovered ? "opacity-100" : "opacity-0"
                      } ${isDeleting ? "opacity-40 cursor-not-allowed" : "hover:bg-red-500/10 text-gray-600 hover:text-red-400"}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSend} className="p-4 border-t border-border-dark flex gap-3 shrink-0">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Écrire un message..."
              className="flex-1 bg-[#1c1c1c] border border-border-dark rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-gray-500 transition"
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="bg-white text-black px-4 py-2.5 rounded-xl font-medium text-sm flex items-center gap-2 hover:bg-gray-200 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
              Envoyer
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
