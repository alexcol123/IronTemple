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

  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newBodyPart, setNewBodyPart] = useState("");
  const [newType, setNewType] = useState("weighted");
  const [newSets, setNewSets] = useState("3");
  const [newReps, setNewReps] = useState("10");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(() => {
    // ?full=true — this dashboard's whole job is reviewing content gaps on
    // non-featured exercises, so it needs their real gif/instructions/videos,
    // not the stripped payload the athlete-facing pickers use.
    fetch("/api/exercise-library?full=true")
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

  async function createExercise() {
    setCreateError("");
    if (!newName.trim() || !newBodyPart) {
      setCreateError("Name and body part are required.");
      return;
    }
    setCreating(true);
    const res = await fetch("/api/admin/exercise-library", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newName.trim(),
        bodyPart: newBodyPart,
        type: newType,
        defaultSets: parseInt(newSets) || 3,
        defaultReps: parseInt(newReps) || 10,
      }),
    });
    setCreating(false);
    if (!res.ok) {
      const data = await res.json();
      setCreateError(data.error ?? "Something went wrong.");
      return;
    }
    const { exercise } = await res.json();
    setNewName("");
    setNewBodyPart("");
    setNewType("weighted");
    setNewSets("3");
    setNewReps("10");
    setShowAddForm(false);
    load();
    setEditingId(exercise.id);
    setGifUrl("");
    setInstructions("");
    setVideoUrls("");
    setImageUrls("");
    setFeatured(false);
    setDisplayName("");
  }

  function startDelete(id: string) {
    setDeletingId(id);
    setDeleteConfirmText("");
    setDeleteError("");
  }

  function cancelDelete() {
    setDeletingId(null);
    setDeleteConfirmText("");
    setDeleteError("");
  }

  async function confirmDelete(id: string) {
    if (deleteConfirmText.trim().toLowerCase() !== "yes") return;
    setDeleting(true);
    setDeleteError("");
    const res = await fetch(`/api/admin/exercise-library/${id}`, { method: "DELETE" });
    setDeleting(false);
    if (!res.ok) {
      const data = await res.json();
      setDeleteError(data.error ?? "Something went wrong.");
      return;
    }
    setDeletingId(null);
    setDeleteConfirmText("");
    if (editingId === id) setEditingId(null);
    if (previewId === id) setPreviewId(null);
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
      <p className="text-sm text-muted-foreground mt-1 mb-4">
        {totalMissing} of {totalExercises} exercises still need at least one piece of content (gif, instructions, video, or images).
      </p>

      <div className="mb-6 border border-border rounded-xl p-3">
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="w-full text-sm font-medium text-left"
        >
          {showAddForm ? "▼" : "▶"} Add New Exercise
        </button>
        {showAddForm && (
          <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Name</p>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Cable Fly" className="text-sm" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Body Part</p>
              <select
                value={newBodyPart}
                onChange={(e) => setNewBodyPart(e.target.value)}
                className="w-full text-sm rounded-md border border-border bg-background px-3 py-2"
              >
                <option value="">Select a body part...</option>
                {bodyParts.map((bp) => (
                  <option key={bp.name} value={bp.name}>{bp.name}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <p className="text-xs font-medium text-muted-foreground mb-1">Type</p>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  className="w-full text-sm rounded-md border border-border bg-background px-3 py-2"
                >
                  <option value="weighted">Weighted</option>
                  <option value="bodyweight">Bodyweight</option>
                  <option value="cardio">Cardio</option>
                </select>
              </div>
              <div className="w-20">
                <p className="text-xs font-medium text-muted-foreground mb-1">Sets</p>
                <Input value={newSets} onChange={(e) => setNewSets(e.target.value)} className="text-sm" />
              </div>
              <div className="w-20">
                <p className="text-xs font-medium text-muted-foreground mb-1">Reps</p>
                <Input value={newReps} onChange={(e) => setNewReps(e.target.value)} className="text-sm" />
              </div>
            </div>
            {createError && <p className="text-xs text-red-600">{createError}</p>}
            <Button onClick={createExercise} disabled={creating} className="rounded-full">
              {creating ? "Creating..." : "Create"}
            </Button>
          </div>
        )}
      </div>

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
                      {deletingId !== ex.id && (
                        <button
                          onClick={() => startDelete(ex.id)}
                          className="text-xs text-red-600 dark:text-red-400 shrink-0"
                        >
                          Delete
                        </button>
                      )}
                    </div>

                    {deletingId === ex.id && (
                      <div className="mt-3 flex flex-col gap-2 border-t border-red-200 dark:border-red-900 pt-3">
                        <p className="text-sm text-red-600 dark:text-red-400">
                          Are you sure you want to delete <strong>{ex.displayName || ex.name}</strong>? This cannot be undone.
                        </p>
                        <p className="text-xs text-muted-foreground">Type &quot;yes&quot; to confirm.</p>
                        <Input
                          value={deleteConfirmText}
                          onChange={(e) => setDeleteConfirmText(e.target.value)}
                          placeholder="yes"
                          className="text-sm"
                        />
                        {deleteError && <p className="text-xs text-red-600">{deleteError}</p>}
                        <div className="flex gap-2">
                          <Button variant="outline" onClick={cancelDelete} className="flex-1 rounded-full">
                            Cancel
                          </Button>
                          <Button
                            onClick={() => confirmDelete(ex.id)}
                            disabled={deleting || deleteConfirmText.trim().toLowerCase() !== "yes"}
                            className="flex-1 rounded-full bg-red-600 hover:bg-red-700 text-white"
                          >
                            {deleting ? "Deleting..." : "Confirm Delete"}
                          </Button>
                        </div>
                      </div>
                    )}

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
