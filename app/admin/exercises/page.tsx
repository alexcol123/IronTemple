"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type LibraryExercise = {
  id: string;
  name: string;
  sets: number;
  reps: number;
  type: string;
  gifUrl: string | null;
  instructions: string[];
  videoUrls: string[];
  imageUrls: string[];
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

export default function AdminExercisesPage() {
  const [bodyParts, setBodyParts] = useState<LibraryBodyPart[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [gifUrl, setGifUrl] = useState("");
  const [instructions, setInstructions] = useState("");
  const [videoUrls, setVideoUrls] = useState("");
  const [imageUrls, setImageUrls] = useState("");
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
                return (
                  <div key={ex.id} className="border border-border rounded-xl p-3">
                    <button
                      onClick={() => {
                        if (!isEditing) startEdit(ex);
                      }}
                      className="w-full flex items-center justify-between text-left"
                    >
                      <div>
                        <p className="text-sm font-medium text-foreground">{ex.name}</p>
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
                      <span className="text-xs text-muted-foreground">{isEditing ? "▲" : "Edit"}</span>
                    </button>

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
