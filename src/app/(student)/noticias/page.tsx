import { createClient } from "@/lib/supabase/server";
import { Newspaper } from "lucide-react";

export default async function NoticiasPage() {
  const supabase = await createClient();
  const now = new Date().toISOString();

  const { data: news } = await supabase
    .from("news")
    .select("*")
    .eq("status", "posted")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Noticias</h1>
        <p className="text-muted-foreground text-sm">Novedades del Departamento de Alumnos</p>
      </div>

      {!news || news.length === 0 ? (
        <div className="text-muted-foreground flex flex-col items-center gap-3 py-16">
          <Newspaper className="h-10 w-10 opacity-30" />
          <p className="text-sm">No hay noticias publicadas por el momento.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {news.map((n) => (
            <article key={n.id} className="space-y-2 rounded-xl border bg-white px-5 py-4">
              <h2 className="text-lg leading-tight font-semibold">{n.title}</h2>
              <p className="text-muted-foreground text-sm whitespace-pre-line">{n.description}</p>
              <time className="text-muted-foreground block text-xs">
                {new Date(n.scheduled_at ?? n.created_at).toLocaleDateString("es-AR", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </time>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
