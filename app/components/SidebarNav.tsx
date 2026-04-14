"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  LayoutDashboard,
  Inbox,
  Users,
  Calendar,
  CarFront,
  Clock,
  Square,
  Settings,
} from "lucide-react";

export default function SidebarNav() {
  const pathname = usePathname();
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [pendingReservations, setPendingReservations] = useState(0);

  useEffect(() => {
    supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("type_expediteur", "client")
      .then(({ count }) => setUnreadMessages(count || 0));

    supabase
      .from("reservations")
      .select("id", { count: "exact", head: true })
      .eq("statut_reservation", "en_attente")
      .then(({ count }) => setPendingReservations(count || 0));

    const channel = supabase
      .channel("sidebar-badges")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => {
        supabase.from("messages").select("id", { count: "exact", head: true }).eq("type_expediteur", "client")
          .then(({ count }) => setUnreadMessages(count || 0));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "reservations" }, () => {
        supabase.from("reservations").select("id", { count: "exact", head: true }).eq("statut_reservation", "en_attente")
          .then(({ count }) => setPendingReservations(count || 0));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  function navClass(href: string) {
    return isActive(href)
      ? "flex items-center gap-3 px-3 py-2.5 rounded-md bg-[#2d2d2d] text-white border-l-2 border-brand-green font-medium"
      : "flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-[#2d2d2d] text-gray-300 hover:text-white transition-colors font-medium";
  }

  return (
    <aside className="w-[200px] bg-bg-sidebar border-r border-border-dark flex-col justify-between hidden md:flex h-full shrink-0">
      <div>
        <div className="p-6 mb-2 flex items-center gap-3">
          <Square className="w-5 h-5 fill-brand-green text-brand-green" />
          <h1 className="text-xl font-bold tracking-tight">RentalCRM</h1>
        </div>

        <nav className="flex flex-col gap-1 px-3">
          <Link href="/" className={navClass("/")}>
            <LayoutDashboard className="w-4 h-4" />
            Dashboard
          </Link>

          <Link
            href="/messages"
            className={`${isActive("/messages") ? "bg-[#2d2d2d] text-white border-l-2 border-brand-green" : "text-gray-300 hover:bg-[#2d2d2d] hover:text-white transition-colors"} flex items-center justify-between px-3 py-2.5 rounded-md font-medium`}
          >
            <div className="flex items-center gap-3">
              <Inbox className="w-4 h-4" />
              Inbox
            </div>
            {unreadMessages > 0 && (
              <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                {unreadMessages > 99 ? "99+" : unreadMessages}
              </span>
            )}
          </Link>

          <Link href="/clients" className={navClass("/clients")}>
            <Users className="w-4 h-4" />
            Clients
          </Link>

          <Link href="/reservations" className={navClass("/reservations")}>
            <Calendar className="w-4 h-4" />
            Réservations
          </Link>

          <Link href="/voitures" className={navClass("/voitures")}>
            <CarFront className="w-4 h-4" />
            Voitures
          </Link>
        </nav>
      </div>

      <div className="p-3 mb-2 flex flex-col gap-1">
        <Link
          href="/reminders"
          className={`flex items-center justify-between px-3 py-2.5 rounded-md font-medium ${
            isActive("/reminders")
              ? "bg-[#2d2d2d] text-white border-l-2 border-brand-green"
              : "hover:bg-[#2d2d2d] text-gray-300 hover:text-white transition-colors"
          }`}
        >
          <div className="flex items-center gap-3">
            <Clock className="w-4 h-4" />
            Reminders
          </div>
          {pendingReservations > 0 && (
            <span className="bg-yellow-500 text-black text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
              {pendingReservations}
            </span>
          )}
        </Link>

        <Link href="/parametres" className={navClass("/parametres")}>
          <Settings className="w-4 h-4" />
          Paramètres
        </Link>
      </div>
    </aside>
  );
}
