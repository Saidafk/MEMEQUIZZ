import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { connection } from "next/server";

// Sert les images ajoutées depuis le backoffice : Next ne publie que les fichiers de public/
// présents au démarrage. Les images déjà présentes restent servies directement par Next ; cette
// route ne reçoit que les autres. Le nom est contrôlé (pas de sortie de public/memes).
export async function GET(_: Request, { params }: RouteContext<"/memes/[fichier]">) {
  await connection();
  const { fichier } = await params;
  if (!/^[a-z0-9]+(-[a-z0-9]+)*\.webp$/.test(fichier)) return new Response(null, { status: 404 });
  try {
    const contenu = await readFile(join(process.cwd(), "public", "memes", fichier));
    return new Response(new Uint8Array(contenu), {
      headers: { "Content-Type": "image/webp", "Cache-Control": "public, max-age=3600" },
    });
  } catch {
    return new Response(null, { status: 404 });
  }
}
