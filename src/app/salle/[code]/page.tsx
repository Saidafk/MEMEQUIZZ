import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Feuille } from "@/components/Feuille";
import { codeSalleSchema } from "@/lib/validation";
import { JeuSalle } from "./JeuSalle";

export const metadata: Metadata = {
  title: "Salle — MEMEQUIZZ",
  robots: { index: false },
};

async function Contenu({ params }: PageProps<"/salle/[code]">) {
  const code = codeSalleSchema.safeParse((await params).code);
  if (!code.success) notFound();
  return <JeuSalle code={code.data} />;
}

export default function PageJeuSalle(props: PageProps<"/salle/[code]">) {
  return (
    <Feuille largeur="large">
      <Suspense fallback={<p role="status">Chargement de la salle…</p>}>
        <Contenu {...props} />
      </Suspense>
    </Feuille>
  );
}
