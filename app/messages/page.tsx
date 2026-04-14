"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { ArrowLeft, Search, MessageSquare } from "lucide-react";

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

type ConversationItem = Client & {
  lastMessage: string;
  lastTime: string;
  unread: number;
};

const statusColor: Record<string, string> = {
  Nouveau:   "bg-blue-500/10 text-blue-400",
  Intéressé: "bg-purple-500/10 text-purple-400",
  Chaud:     "bg-orange-500/10 text-orange-400",
  Réservé:   "bg-green-500/10 text-green-400",
  Perdu:     "bg-red-500/10 text-red-400",
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "maintenant";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}j`;
  return new Date(dateStr).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

export default function MessagesPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [search, setSearch] = useState("");

  const loadAll = useCallback(async () => {
    const [{ data: c }, { data: m }] = await Promise.all([
      supabase.from("clients").select("*").order("date_creation", { ascending: false }),
      supabase.from("messages").select("*").order("date_creation", { ascending: true }),
    ]);
    setClients((c as Client[]) ?? []);
    setMessages((m as Message[]) ?? []);
  }, []);

  useEffect(() => {
    loadAll();

    const channel = supabase
      .channel("inbox-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        setMessages((prev) => [...prev, payload.new as Message]);
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "messages" }, (payload) => {
        const deleted = payload.old as { id: string };
        setMessages((prev) => prev.filter((m) => m.id !== deleted.id));
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "clients" }, (payload) => {
        setClients((prev) =>
          prev.map((c) =>
            c.id === (payload.new as Client).id ? { ...c, ...(payload.new as Client) } : c
          )
        );
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "clients" }, () => {
        loadAll();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [loadAll]);

  const conversations: ConversationItem[] = clients
    .map((client) => {
      const clientMsgs = messages.filter((m) => m.client_id === client.id);
      const last = clientMsgs[clientMsgs.length - 1];
      const unread = clientMsgs.filter((m) => m.type_expediteur === "client").length;
      return {
        ...client,
        lastMessage: last?.contenu_message ?? "Aucun message",
        lastTime: last?.date_creation ?? client.date_creation,
        unread: last ? unread : 0,
      };
    })
    .sort((a, b) => new Date(b.lastTime).getTime() - new Date(a.lastTime).getTime());

  const filtered = conversations.filter(
    (c) =>
      c.nom.toLowerCase().includes(search.toLowerCase()) ||
      c.telephone.includes(search)
  );

  return (
    <div className="flex-1 overflow-hidden flex flex-col h-full">
      <div className="flex items-center justify-between p-8 pb-4 shrink-0">
        <div className="flex items-center gap-4">
          <Link href="/" className="p-2 rounded-md hover:bg-white/5 text-gray-400 transition">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Messages</h1>
            <p className="text-gray-500 text-sm mt-0.5">{conversations.length} conversations</p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden px-8 pb-8">

        <div className="w-[320px] xl:w-[380px] bg-bg-card rounded-l-xl border border-border-dark flex flex-col z-10 shadow-xl shrink-0">
          <div className="p-4 border-b border-white/5">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher..."
                className="w-full bg-[#1c1c1c] border border-border-dark rounded-lg py-2 pl-9 pr-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-gray-500 transition"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
            {filtered.length === 0 && (
              <p className="text-center text-gray-600 text-sm py-8">Aucune conversation trouvée</p>
            )}
            {filtered.map((c) => {
              const initials = c.nom.substring(0, 2).toUpperCase();
              const hasUnread = c.unread > 0;
              const statusBadge = statusColor[c.statut_lead] ?? "bg-gray-500/10 text-gray-400";

              return (
                <Link
                  key={c.id}
                  href={`/messages/${c.id}`}
                  className="flex items-start gap-3 p-3 rounded-xl hover:bg-white/5 transition group"
                >
                  <div className="relative shrink-0">
                    <div className="w-11 h-11 rounded-full bg-[#1c1c1c] border border-border-dark text-gray-400 flex items-center justify-center font-bold text-sm group-hover:bg-white group-hover:text-black transition-colors">
                      {initials}
                    </div>
                    {hasUnread && (
                      <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-[#0f0f0f]" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <h3 className={`text-[14px] truncate ${hasUnread ? "font-bold text-white" : "font-medium text-gray-300"}`}>
                        {c.nom}
                      </h3>
                      <span className="text-[10px] text-gray-600 shrink-0 ml-2">{timeAgo(c.lastTime)}</span>
                    </div>

                    <p className={`text-xs truncate mb-1.5 ${hasUnread ? "text-gray-300" : "text-gray-500"}`}>
                      {c.lastMessage === "Aucun message"
                        ? <span className="italic text-gray-600">Aucun message</span>
                        : c.lastMessage
                      }
                    </p>

                    {c.statut_lead && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusBadge}`}>
                        {c.statut_lead}
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="flex-1 bg-[#141414] rounded-r-xl border border-l-0 border-border-dark flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-[#1c1c1c] rounded-full flex items-center justify-center mb-5 border border-border-dark">
            <MessageSquare className="w-6 h-6 text-gray-500" />
          </div>
          <h2 className="text-xl font-bold mb-2">Vos messages</h2>
          <p className="text-gray-500 text-sm max-w-sm leading-relaxed">
            Sélectionnez une conversation pour lire et répondre.
          </p>
        </div>

      </div>
    </div>
  );
}
