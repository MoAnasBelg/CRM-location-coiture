import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
  const formData = await req.formData();

  const client_id = String(formData.get("client_id") || "");
  const voiture_id = String(formData.get("voiture_id") || "");
  const date_debut = String(formData.get("date_debut") || "");
  const date_fin = String(formData.get("date_fin") || "");
  const statut_reservation = String(formData.get("statut_reservation") || "en_attente");
  const statut_paiement = String(formData.get("statut_paiement") || "en_attente");

  if (!client_id || !voiture_id || !date_debut || !date_fin) {
    return NextResponse.json(
      { error: "Champs obligatoires manquants" },
      { status: 400 }
    );
  }

  const { data: voiture, error: voitureError } = await supabase
    .from("voitures")
    .select("prix_par_jour")
    .eq("id", voiture_id)
    .single();

  if (voitureError || !voiture) {
    return NextResponse.json(
      { error: "Voiture introuvable" },
      { status: 400 }
    );
  }

  const start = new Date(date_debut);
  const end = new Date(date_fin);
  const diffDays = Math.max(
    1,
    Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  );

  const prix_total = diffDays * Number(voiture.prix_par_jour);

  const { error: reservationError } = await supabase.from("reservations").insert([
    {
      client_id,
      voiture_id,
      date_debut,
      date_fin,
      prix_total,
      statut_reservation,
      statut_paiement,
    },
  ]);

  if (reservationError) {
    return NextResponse.json(
      { error: reservationError.message },
      { status: 500 }
    );
  }

  await supabase
    .from("voitures")
    .update({ statut_disponibilite: "reservee" })
    .eq("id", voiture_id);

  if (statut_reservation === "confirmee") {
    await supabase
      .from("clients")
      .update({ statut_lead: "reserve" })
      .eq("id", client_id);
  }

  return NextResponse.redirect(new URL("/reservations", req.url));
}