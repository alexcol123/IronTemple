"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type LibraryExercise = {
  id: string;
  name: string;
  displayName: string | null;
  sets: number;
  reps: number;
  type: string;
  gifUrl: string | null;
  instructions: string[];
  videoUrls: string[];
  imageUrls: string[];
  featured: boolean;
};
type LibraryBodyPart = { name: string; exercises: LibraryExercise[] };

// =============================================================================
// /admin/exercises — content-gap dashboard for ExerciseLibrary. Shows every
// exercise across all body parts with a badge for whatever's still missing
// (gif/instructions/video/images), and a simple inline editor to fill it in.
// Nothing here is required up front — every field defaults to empty/null.
// =============================================================================

function missingBadges(ex: LibraryExercise): string[] {
  const missing: string[] = [];
  if (!ex.gifUrl) missing.push("No GIF");
  if (ex.instructions.length === 0) missing.push("No instructions");
  if (ex.videoUrls.length === 0) missing.push("No video");
  if (ex.imageUrls.length === 0) missing.push("No images");
  return missing;
}

// Turns a normal youtube.com/watch, youtu.be, or youtube.com/shorts link into
// the /embed/ form needed for an inline iframe preview.
function getYouTubeEmbedUrl(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([\w-]{11})/);
  return match ? `https://www.youtube.com/embed/${match[1]}` : null;
}

export default function AdminExercisesPage() {
  const [bodyParts, setBodyParts] = useState<LibraryBodyPart[]>([]);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [gifUrl, setGifUrl] = useState("");
  const [instructions, setInstructions] = useState("");
  const [videoUrls, setVideoUrls] = useState("");
  const [imageUrls, setImageUrls] = useState("");
  const [featured, setFeatured] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    fetch("/api/exercise-library")
      .then((r) => r.json())
      .then((data) => setBodyParts(data.bodyParts ?? []));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function startEdit(ex: LibraryExercise) {
    setEditingId(ex.id);
    setGifUrl(ex.gifUrl ?? "");
    setInstructions(ex.instructions.join("\n"));
    setVideoUrls(ex.videoUrls.join("\n"));
    setImageUrls(ex.imageUrls.join("\n"));
    setFeatured(ex.featured);
    setDisplayName(ex.displayName ?? "");
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function save(id: string) {
    setSaving(true);
    await fetch(`/api/admin/exercise-library/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        gifUrl: gifUrl.trim() || null,
        instructions: instructions.split("\n").map((s) => s.trim()).filter(Boolean),
        videoUrls: videoUrls.split("\n").map((s) => s.trim()).filter(Boolean),
        imageUrls: imageUrls.split("\n").map((s) => s.trim()).filter(Boolean),
        featured,
        displayName: displayName.trim() || null,
      }),
    });
    setSaving(false);
    setEditingId(null);
    load();
  }

  const totalExercises = bodyParts.reduce((sum, bp) => sum + bp.exercises.length, 0);
  const totalMissing = bodyParts.reduce(
    (sum, bp) => sum + bp.exercises.filter((ex) => missingBadges(ex).length > 0).length,
    0,
  );

  return (
    <div className="min-h-screen bg-background p-6 max-w-2xl mx-auto">
      <Link href="/admin" className="text-xs text-muted-foreground">← Dev Reference</Link>
      <h1 className="text-2xl font-bold text-foreground mt-2">Exercise Library</h1>
      <p className="text-sm text-muted-foreground mt-1 mb-6">
        {totalMissing} of {totalExercises} exercises still need at least one piece of content (gif, instructions, video, or images).
      </p>

      <div className="flex flex-col gap-6">
        {bodyParts.map((bp) => (
          <div key={bp.name}>
            <p className="text-sm font-semibold text-foreground mb-2">{bp.name}</p>
            <div className="flex flex-col gap-2">
              {bp.exercises.map((ex) => {
                const badges = missingBadges(ex);
                const isEditing = editingId === ex.id;
                const isPreviewing = previewId === ex.id;
                return (
                  <div key={ex.id} className="border border-border rounded-xl p-3">
                    <div className="w-full flex items-center justify-between gap-2">
                      <button
                        onClick={() => setPreviewId(isPreviewing ? null : ex.id)}
                        className="flex items-start gap-2 text-left flex-1 min-w-0"
                      >
                        <span className="text-xs text-muted-foreground mt-0.5 shrink-0">
                          {isPreviewing ? "▼" : "▶"}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground">
                            {ex.featured && <span className="text-amber-500 mr-1">★</span>}
                            {ex.displayName || ex.name}
                          </p>
                          {ex.displayName && (
                            <p className="text-xs text-muted-foreground/60">{ex.name}</p>
                          )}
                          {badges.length > 0 ? (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {badges.map((b) => (
                                <span
                                  key={b}
                                  className="text-xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400"
                                >
                                  {b}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-emerald-600 dark:text-emerald-400">Complete</span>
                          )}
                        </div>
                      </button>
                      {!isEditing && (
                        <button
                          onClick={() => startEdit(ex)}
                          className="text-xs text-muted-foreground shrink-0"
                        >
                          Edit
                        </button>
                      )}
                    </div>

                    {isPreviewing && (ex.gifUrl || ex.videoUrls.length > 0) && (
                      <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
                        {ex.gifUrl && (
                          <img src={ex.gifUrl} alt={ex.name} className="w-full rounded-lg bg-black" />
                        )}
                        {ex.videoUrls.map((url, i) => {
                          const embedUrl = getYouTubeEmbedUrl(url);
                          return embedUrl ? (
                            <div key={i} className="rounded-lg overflow-hidden aspect-video">
                              <iframe
                                src={embedUrl}
                                title={`${ex.name} video ${i + 1}`}
                                className="w-full h-full"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                              />
                            </div>
                          ) : (
                            <a
                              key={i}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-center px-4 py-2 rounded-full border hover:bg-muted transition-colors"
                            >
                              Watch video {i + 1}
                            </a>
                          );
                        })}
                        {!isEditing && (
                          <button
                            onClick={() => startEdit(ex)}
                            className="text-sm font-medium px-4 py-3 rounded-lg bg-black text-white hover:bg-neutral-800 transition-colors"
                          >
                            Edit
                          </button>
                        )}
                      </div>
                    )}

                    {isEditing && (
                      <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">GIF URL</p>
                          <Input value={gifUrl} onChange={(e) => setGifUrl(e.target.value)} placeholder="https://..." className="text-sm" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Instructions (one step per line)</p>
                          <textarea
                            value={instructions}
                            onChange={(e) => setInstructions(e.target.value)}
                            rows={4}
                            className="w-full text-sm rounded-md border border-border bg-background px-3 py-2"
                          />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Video URLs (one per line)</p>
                          <textarea
                            value={videoUrls}
                            onChange={(e) => setVideoUrls(e.target.value)}
                            rows={2}
                            className="w-full text-sm rounded-md border border-border bg-background px-3 py-2"
                          />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Image URLs (one per line)</p>
                          <textarea
                            value={imageUrls}
                            onChange={(e) => setImageUrls(e.target.value)}
                            rows={2}
                            className="w-full text-sm rounded-md border border-border bg-background px-3 py-2"
                          />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">
                            Display Name (optional — only if commonly called something else, e.g. &quot;RDL&quot;)
                          </p>
                          <Input
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            placeholder={ex.name}
                            className="text-sm"
                          />
                        </div>
                        <label className="flex items-center gap-2 text-sm text-foreground">
                          <input
                            type="checkbox"
                            checked={featured}
                            onChange={(e) => setFeatured(e.target.checked)}
                          />
                          Featured
                        </label>
                        <div className="flex gap-2">
                          <Button variant="outline" onClick={cancelEdit} className="flex-1 rounded-full">
                            Cancel
                          </Button>
                          <Button onClick={() => save(ex.id)} disabled={saving} className="flex-1 rounded-full">
                            {saving ? "Saving..." : "Save"}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
