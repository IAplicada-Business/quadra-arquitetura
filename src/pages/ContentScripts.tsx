import { useState, useCallback } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { useContentPosts, STATUS_LABELS } from "@/hooks/useContentPosts";
import { useContentSeries } from "@/hooks/useContentSeries";
import ContentPostCard from "@/components/content/ContentPostCard";
import ContentPostSheet from "@/components/content/ContentPostSheet";
import type { ContentPost } from "@/hooks/useContentPosts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import { PageTitle } from "@/components/layout/PageTitle";

const COLUMN_STYLES: Record<string, { header: string; border: string }> = {
  ideia:      { header: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/50 dark:text-slate-300 dark:border-slate-700", border: "border-slate-200 dark:border-slate-700" },
  roteiro:    { header: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800", border: "border-blue-200 dark:border-blue-800" },
  gravando:   { header: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800", border: "border-amber-200 dark:border-amber-800" },
  editando:   { header: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800", border: "border-purple-200 dark:border-purple-800" },
  agendado:   { header: "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-300 dark:border-cyan-800", border: "border-cyan-200 dark:border-cyan-800" },
  publicado:  { header: "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800", border: "border-green-200 dark:border-green-800" },
};

const COLUMNS = ["ideia", "roteiro", "gravando", "editando", "agendado", "publicado"] as const;

export default function ContentScripts() {
  const { posts, update, create } = useContentPosts();
  const { series } = useContentSeries();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<ContentPost | null>(null);

  const seriesMap = Object.fromEntries(series.map((s) => [s.id, s]));

  const columns = COLUMNS.map((status) => ({
    status,
    label: STATUS_LABELS[status],
    posts: posts.filter((p) => p.status === status),
  }));

  const handleDragEnd = useCallback((result: DropResult) => {
    if (!result.destination) return;
    const postId = result.draggableId;
    const newStatus = result.destination.droppableId;
    update.mutate({ id: postId, status: newStatus });
  }, [update]);

  const handleEdit = (post: ContentPost) => {
    setSelectedPost(post);
    setSheetOpen(true);
  };

  const handleSave = (values: any) => {
    if (values.id) {
      update.mutate(values);
    } else {
      create.mutate(values);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <PageTitle title="Roteiros" description="Fluxo de produção de conteúdo" />
        <Button size="sm" onClick={() => { setSelectedPost(null); setSheetOpen(true); }}>
          <Plus className="h-4 w-4 mr-1" /> Novo Roteiro
        </Button>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-4" style={{ minHeight: "calc(100vh - 240px)" }}>
          {columns.map((col) => {
            const styles = COLUMN_STYLES[col.status] ?? COLUMN_STYLES["ideia"];
            return (
              <div key={col.status} className="flex-shrink-0 w-60 flex flex-col">
                {/* Column header */}
                <div className={`rounded-t-lg px-3 py-2 border font-medium text-sm flex items-center justify-between ${styles.header}`}>
                  <span>{col.label}</span>
                  <Badge variant="outline" className="text-xs">{col.posts.length}</Badge>
                </div>
                {/* Column body */}
                <Droppable droppableId={col.status}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`border border-t-0 rounded-b-lg flex-1 p-2 space-y-2 overflow-y-auto transition-colors ${styles.border} ${snapshot.isDraggingOver ? "bg-accent/20" : "bg-muted/30"}`}
                    >
                      {col.posts.map((post, index) => (
                        <Draggable key={post.id} draggableId={post.id} index={index}>
                          {(provided) => (
                            <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}>
                              <ContentPostCard
                                post={post}
                                seriesColor={post.series_id ? seriesMap[post.series_id]?.color : undefined}
                                onEdit={handleEdit}
                              />
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>

      <ContentPostSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        post={selectedPost}
        series={series}
        onSave={handleSave}
      />
    </div>
  );
}
