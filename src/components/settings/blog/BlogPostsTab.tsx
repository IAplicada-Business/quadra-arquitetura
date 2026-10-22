import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowLeft, ExternalLink, Pencil, Plus, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BlogArticleBody } from "@/components/blog/BlogArticleBody";
import { SiteImageField } from "@/components/settings/site/SiteFields";
import carousel2 from "@/assets/carousel-2.jpg";
import { useBlogPostsAdmin } from "@/hooks/useBlog";
import { isValidSlug, readingMinutes, slugify, type BlogPostDraft, type BlogPostRow } from "@/lib/blog";

const VAZIO: BlogPostDraft = {
  slug: "",
  title: "",
  excerpt: "",
  content: "",
  cover_url: "",
  category: "",
  author: "",
  status: "draft",
  published_at: null,
};

function toDraft(row: BlogPostRow): BlogPostDraft {
  const { updated_at: _u, ...resto } = row;
  return resto;
}

/**
 * Configurações → Blog: os artigos do Obra sem Surto.
 *
 * Lista e editor na mesma aba. O texto é Markdown (## título, **negrito**,
 * listas, > citação) e a aba Prévia mostra exatamente o que o site renderiza.
 * Rascunho nunca vai ao ar; "Publicar" coloca no site na hora.
 */
export default function BlogPostsTab() {
  const { posts, isLoading, save, remove } = useBlogPostsAdmin();
  const [editing, setEditing] = useState<BlogPostDraft | null>(null);
  const [slugTocado, setSlugTocado] = useState(false);
  const [previa, setPrevia] = useState(false);
  const [excluir, setExcluir] = useState<BlogPostRow | null>(null);

  const abrir = (draft: BlogPostDraft, slugJaDefinido: boolean) => {
    setEditing(draft);
    setSlugTocado(slugJaDefinido);
    setPrevia(false);
  };

  if (editing) {
    const set = (patch: Partial<BlogPostDraft>) => setEditing((d) => (d ? { ...d, ...patch } : d));
    const slugOk = isValidSlug(editing.slug);
    const tituloOk = editing.title.trim().length > 0;
    const podeSalvar = slugOk && tituloOk && !save.isPending;

    const gravar = (status: BlogPostDraft["status"]) =>
      save.mutate(
        { ...editing, status, title: editing.title.trim() },
        { onSuccess: () => setEditing(null) },
      );

    return (
      <div className="space-y-5 max-w-3xl">
        <Button variant="ghost" size="sm" onClick={() => setEditing(null)} className="-ml-2">
          <ArrowLeft className="h-4 w-4 mr-1" /> Voltar para os artigos
        </Button>

        <div className="space-y-2">
          <Label htmlFor="blog-title" className="text-xs font-semibold">Título</Label>
          <Input
            id="blog-title"
            value={editing.title}
            onChange={(e) => {
              const title = e.target.value;
              set(slugTocado ? { title } : { title, slug: slugify(title) });
            }}
            placeholder="O orçamento da sua obra pode estar mentindo para você"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="blog-slug" className="text-xs font-semibold">Endereço (slug)</Label>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground whitespace-nowrap">/blog/</span>
            <Input
              id="blog-slug"
              value={editing.slug}
              onChange={(e) => {
                setSlugTocado(true);
                set({ slug: slugify(e.target.value) });
              }}
              aria-invalid={!slugOk && editing.slug !== ""}
            />
          </div>
          <p className="text-[11px] text-muted-foreground">
            Só letras minúsculas, números e hífen. Trocar o endereço de um artigo no ar quebra os links já compartilhados.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="blog-category" className="text-xs font-semibold">Editoria</Label>
            <Input
              id="blog-category"
              value={editing.category}
              onChange={(e) => set({ category: e.target.value })}
              placeholder="Orçamento, Antes de começar, Olhar Quadra"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="blog-author" className="text-xs font-semibold">Autoria</Label>
            <Input id="blog-author" value={editing.author} onChange={(e) => set({ author: e.target.value })} placeholder="Camilla" />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="blog-excerpt" className="text-xs font-semibold">Resumo</Label>
          <Textarea
            id="blog-excerpt"
            rows={3}
            value={editing.excerpt}
            onChange={(e) => set({ excerpt: e.target.value })}
            placeholder="Aparece no cartão e na busca do Google. Uma ou duas frases."
          />
          <p className="text-[11px] text-muted-foreground">{editing.excerpt.length}/160 (o Google corta depois disso)</p>
        </div>

        <SiteImageField
          id="blog-cover"
          label="Capa"
          value={editing.cover_url}
          defaultSrc={carousel2}
          folder="blog"
          maxWidth={1600}
          onChange={(url) => set({ cover_url: url })}
        />

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="blog-content" className="text-xs font-semibold">
              Texto <span className="font-normal text-muted-foreground">· {readingMinutes(editing.content.length)} min de leitura</span>
            </Label>
            <div className="flex gap-1" role="tablist" aria-label="Modo do texto">
              <Button type="button" size="sm" variant={previa ? "ghost" : "secondary"} className="h-7 text-xs" onClick={() => setPrevia(false)}>
                Escrever
              </Button>
              <Button type="button" size="sm" variant={previa ? "secondary" : "ghost"} className="h-7 text-xs" onClick={() => setPrevia(true)}>
                Prévia
              </Button>
            </div>
          </div>
          {previa ? (
            <div className="rounded-md border bg-brand-creme p-6 min-h-[16rem]">
              {editing.content.trim() ? (
                <BlogArticleBody content={editing.content} />
              ) : (
                <p className="text-sm text-muted-foreground">Nada escrito ainda.</p>
              )}
            </div>
          ) : (
            <Textarea
              id="blog-content"
              rows={18}
              className="font-mono text-sm"
              value={editing.content}
              onChange={(e) => set({ content: e.target.value })}
              placeholder={"## Subtítulo\n\nParágrafo com **negrito** e *itálico*.\n\n- item de lista\n- outro item\n\n> Uma citação em destaque"}
            />
          )}
          <p className="text-[11px] text-muted-foreground">
            Markdown: ## subtítulo, ### sub-subtítulo, **negrito**, *itálico*, - lista, 1. lista numerada, {">"} citação, [texto](link).
            O título do artigo já é o título principal da página: comece os subtítulos em ##.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-2 border-t">
          <Button disabled={!podeSalvar} onClick={() => gravar("published")}>
            {editing.status === "published" ? "Salvar e manter no ar" : "Publicar"}
          </Button>
          <Button variant="outline" disabled={!podeSalvar} onClick={() => gravar("draft")}>
            {editing.status === "published" ? "Tirar do ar (rascunho)" : "Salvar rascunho"}
          </Button>
          {!tituloOk && <span className="text-xs text-muted-foreground">Dê um título para salvar.</span>}
          {tituloOk && !slugOk && <span className="text-xs text-muted-foreground">O endereço precisa ser válido.</span>}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          Artigos do blog Obra sem Surto. Os publicados aparecem em <span className="font-medium">/blog</span> e na dobra
          de blog da landing (os três mais novos).
        </p>
        <Button onClick={() => abrir(VAZIO, false)} className="shrink-0">
          <Plus className="h-4 w-4 mr-1" /> Novo artigo
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      ) : posts.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Nenhum artigo ainda. Enquanto isso, a landing mostra as chamadas da aba Site → Blog.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {posts.map((p) => (
            <Card key={p.id}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium truncate">{p.title}</p>
                    <Badge variant={p.status === "published" ? "default" : "secondary"} className="shrink-0">
                      {p.status === "published" ? "No ar" : "Rascunho"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {[p.category, `/blog/${p.slug}`, `editado ${format(new Date(p.updated_at), "dd/MM/yyyy", { locale: ptBR })}`]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                {p.status === "published" && (
                  <Button asChild size="icon" variant="ghost" aria-label={`Ver ${p.title} no site`}>
                    <a href={`/blog/${p.slug}`} target="_blank" rel="noreferrer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                )}
                <Button size="icon" variant="ghost" aria-label={`Editar ${p.title}`} onClick={() => abrir(toDraft(p), true)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" aria-label={`Excluir ${p.title}`} onClick={() => setExcluir(p)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!excluir} onOpenChange={(o) => !o && setExcluir(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir este artigo?</AlertDialogTitle>
            <AlertDialogDescription>
              “{excluir?.title}” sai do site e não dá para desfazer. Para só tirar do ar, edite e salve como rascunho.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (excluir) remove.mutate(excluir.id);
                setExcluir(null);
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
