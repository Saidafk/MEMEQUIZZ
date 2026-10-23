import { connection } from "next/server";

import { clePubliqueVapid } from "@/lib/web-push";

// Clé publique VAPID : le navigateur en a besoin pour s'abonner (elle n'est pas secrète).
export async function GET() {
  await connection();
  const cle = clePubliqueVapid();
  if (!cle) return Response.json({ erreur: "push_indisponible" }, { status: 503 });
  return Response.json({ cle });
}
