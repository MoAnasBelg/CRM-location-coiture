import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

type ApiMessage = {
  id: string;
  client_id: string;
  contenu_message: string;
  type_expediteur: string;
  date_creation: string;
};

type ApiClient = {
  id: string;
  nom: string;
  telephone: string;
  date_creation: string;
};

function getBearerToken(req: NextRequest) {
  const authHeader = req.headers.get("authorization") || "";
  if (!authHeader.toLowerCase().startsWith("bearer ")) {
    return null;
  }

  return authHeader.slice(7).trim() || null;
}

async function ensureAuthenticated(req: NextRequest) {
  const token = getBearerToken(req);
  if (!token) {
    return false;
  }

  const { data, error } = await supabase.auth.getUser(token);
  return !error && !!data.user;
}

export async function GET(req: NextRequest) {
  const isAuthenticated = await ensureAuthenticated(req);
  if (!isAuthenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clientId = req.nextUrl.searchParams.get("client_id");

  if (clientId) {
    const { data, error } = await supabase
      .from("messages")
      .select("id, client_id, contenu_message, type_expediteur, date_creation")
      .eq("client_id", clientId)
      .order("date_creation", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ messages: data ?? [] });
  }

  const [{ data: clients, error: clientsError }, { data: messages, error: messagesError }] =
    await Promise.all([
      supabase
        .from("clients")
        .select("id, nom, telephone, date_creation")
        .order("date_creation", { ascending: false }),
      supabase
        .from("messages")
        .select("id, client_id, contenu_message, type_expediteur, date_creation")
        .order("date_creation", { ascending: false }),
    ]);

  if (clientsError) {
    return NextResponse.json({ error: clientsError.message }, { status: 500 });
  }

  if (messagesError) {
    return NextResponse.json({ error: messagesError.message }, { status: 500 });
  }

  const lastMessageByClient = new Map<string, ApiMessage>();
  (messages as ApiMessage[] ?? []).forEach((message) => {
    if (!lastMessageByClient.has(message.client_id)) {
      lastMessageByClient.set(message.client_id, message);
    }
  });

  const conversations = ((clients ?? []) as ApiClient[]).map((client) => ({
    client,
    lastMessage: lastMessageByClient.get(client.id) ?? null,
  }));

  conversations.sort((a, b) => {
    const left = a.lastMessage?.date_creation || a.client.date_creation || "";
    const right = b.lastMessage?.date_creation || b.client.date_creation || "";
    return right.localeCompare(left);
  });

  return NextResponse.json({ conversations });
}

export async function POST(req: NextRequest) {
  const isAuthenticated = await ensureAuthenticated(req);
  if (!isAuthenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contentType = req.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    const body = await req.json();
    const client_id = String(body.client_id || "").trim();
    const message = String(body.message || "").trim();
    const type_expediteur = String(body.type_expediteur || "agent");

    if (!client_id || !message) {
      return NextResponse.json({ error: "client_id et message sont obligatoires" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("messages")
      .insert([
        {
          client_id,
          contenu_message: message,
          type_expediteur,
        },
      ])
      .select("id, client_id, contenu_message, type_expediteur, date_creation")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: data }, { status: 201 });
  }

  const formData = await req.formData();
  const client_id = String(formData.get("client_id") || "").trim();
  const message = String(formData.get("message") || "").trim();
  const type_expediteur = String(formData.get("type_expediteur") || "agent");

  if (!client_id || !message) {
    return NextResponse.redirect(new URL("/messages", req.url));
  }

  await supabase.from("messages").insert([
    {
      client_id,
      contenu_message: message,
      type_expediteur,
    },
  ]);

  return NextResponse.redirect(new URL(`/messages/${client_id}`, req.url));
}