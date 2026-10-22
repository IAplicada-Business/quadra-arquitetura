import { ArrowLeft } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { BlogCard, PostMeta } from "@/components/blog/BlogCard";
import { BlogArticleBody } from "@/components/blog/BlogArticleBody";
import { BlogShell } from "@/components/blog/BlogShell";
import { FOTOS_PADRAO } from "@/components/blog/fotos";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import { Revelar, Sequencia } from "@/components/landing/Motion";
import { usePublicBlogPost, usePublicBlogPosts } from "@/hooks/useBlog";
import { readingMinutes } from "@/lib/blog";
import NotFound from "@/pages/NotFound";

const LABEL = { fontFamily: "'Jost', sans-serif", fontSize: "11px", letterSpacing: "0.14em", textTransform: "uppercase" } as const;

/** Página de um artigo: leitura em coluna estreita, fecho com convite e mais leitura. */
export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const { post, isLoading } = usePublicBlogPost(slug);
  const { posts } = usePublicBlogPosts();

  const naoExiste = !isLoading && !post;
  useDocumentMeta(post?.title ?? "", post?.excerpt || post?.content.replace(/[#*_>`[\]]/g, "").slice(0, 160), naoExiste);

  if (naoExiste) return <NotFound />;

  if (isLoading || !post) {
    return (
      <BlogShell>
        <div className="max-w-2xl mx-auto px-6 py-16" aria-busy="true">
          <div className="h-10 w-3/4 bg-brand-pedra/60 animate-pulse" />
          <div className="h-4 w-1/3 bg-brand-pedra/60 animate-pulse mt-6" />
        </div>
      </BlogShell>
    );
  }

  const outros = posts.filter((p) => p.slug !== post.slug).slice(0, 2);
  const minutos = readingMinutes(post.content.length);

  return (
    <BlogShell>
      <article>
        <header className="max-w-3xl mx-auto px-6 md:px-10 min-w-0">
          <Link
            to="/blog"
            className="group inline-flex items-center gap-2 text-brand-navy/75 hover:text-brand-navy transition-colors mb-10"
            style={LABEL}
          >
            <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
            Todos os artigos
          </Link>
          <Revelar>
            {post.category && (
              <p className="text-brand-terracota mb-4" style={{ ...LABEL, letterSpacing: "0.22em", fontWeight: 500 }}>
                {post.category}
              </p>
            )}
            <h1
              className="title-balance text-brand-navy"
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontWeight: 400,
                fontSize: "clamp(2rem, 4.6vw, 3.25rem)",
                lineHeight: 1.12,
                letterSpacing: "-0.02em",
              }}
            >
              {post.title}
            </h1>
            <PostMeta
              post={{ ...post, readingChars: post.content.length }}
              className="text-brand-navy/65 mt-5"
            />
            {post.author && (
              <p className="text-brand-navy/65 mt-1" style={{ fontFamily: "'Jost', sans-serif", fontSize: "12px", fontWeight: 300 }}>
                Por {post.author}
              </p>
            )}
          </Revelar>
        </header>

        <Revelar className="max-w-5xl mx-auto px-6 md:px-10 mt-10 md:mt-12">
          <div className="aspect-[16/8] overflow-hidden bg-brand-pedra">
            <img src={post.coverUrl || FOTOS_PADRAO[0]} alt="" className="w-full h-full object-cover" />
          </div>
        </Revelar>

        <div className="max-w-2xl mx-auto px-6 md:px-10 mt-10 md:mt-14">
          <BlogArticleBody content={post.content} />
          <p className="sr-only">{minutos} minutos de leitura</p>
        </div>
      </article>

      {/* Fecho: o artigo termina num convite, não num beco. */}
      <section className="bg-brand-navy mt-20 md:mt-28">
        <div className="max-w-3xl mx-auto px-6 md:px-10 py-16 md:py-20 text-center">
          <p className="text-brand-terracota mb-4" style={{ ...LABEL, letterSpacing: "0.22em", fontWeight: 500 }}>
            Fale com a Quadra
          </p>
          <h2
            className="title-balance text-brand-creme"
            style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 400, fontSize: "clamp(1.75rem, 3.4vw, 2.5rem)", lineHeight: 1.2 }}
          >
            Sua obra merece alguém que trabalha só para você.
          </h2>
          <Link
            to="/#contato"
            className="inline-block mt-8 bg-brand-areia text-brand-navy px-8 py-3 transition-colors hover:bg-brand-rosa focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-areia focus-visible:ring-offset-2 focus-visible:ring-offset-brand-navy"
            style={{ ...LABEL, letterSpacing: "0.2em", fontWeight: 500 }}
          >
            Falar com a Quadra
          </Link>
        </div>
      </section>

      {outros.length > 0 && (
        <section className="max-w-6xl mx-auto px-6 md:px-10 py-16 md:py-24 min-w-0">
          <p className="text-brand-terracota mb-8" style={{ ...LABEL, letterSpacing: "0.22em", fontWeight: 500 }}>
            Continue lendo
          </p>
          <Sequencia className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-12">
            {outros.map((p, i) => (
              <BlogCard key={p.slug} post={p} index={i + 1} />
            ))}
          </Sequencia>
        </section>
      )}
    </BlogShell>
  );
}
