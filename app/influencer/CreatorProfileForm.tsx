"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";

// Shared by two very different entry points:
//  - /influencer/onboarding (admin mode) — pick any phone number, create or
//    edit that creator's profile
//  - /influencer/me (creator mode) — lockedPhone is the creator's own,
//    server-verified phone (see requireCreator in lib/auth-roles.ts); the
//    phone field disappears entirely so there's no way to type in someone
//    else's number and edit their profile instead.

function getYouTubeEmbedUrl(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([\w-]{11})/);
  return match ? `https://www.youtube.com/embed/${match[1]}` : null;
}

// Social fields accept either a full URL or a bare "@handle" — normalize
// either into a real clickable destination.
function socialUrl(value: string, platform: "instagram" | "youtube" | "tiktok"): string {
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  const handle = value.replace(/^@/, "");
  if (platform === "instagram") return `https://instagram.com/${handle}`;
  if (platform === "youtube") return `https://youtube.com/@${handle}`;
  return `https://tiktok.com/@${handle}`;
}

export default function CreatorProfileForm({
  lockedPhone,
  firstTimeSetup,
}: {
  lockedPhone?: string;
  // True only for the self-serve /influencer/join entry point — there's no
  // existing profile to "go back" to yet, so the usual "← Creator Home" link
  // (which would bounce off requireCreator() and loop right back here) is
  // replaced with a one-line intro instead.
  firstTimeSetup?: boolean;
}) {
  const searchParams = useSearchParams();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [stageName, setStageName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [joinCodeStatus, setJoinCodeStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const [phone, setPhone] = useState(lockedPhone ?? "");
  const [photoUrl, setPhotoUrl] = useState("");
  const [bio, setBio] = useState("");
  const [instagram, setInstagram] = useState("");
  const [youtube, setYoutube] = useState("");
  const [tiktok, setTiktok] = useState("");
  const [introVideoUrl, setIntroVideoUrl] = useState("");

  const [loadingLookup, setLoadingLookup] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedUserId, setSavedUserId] = useState<string | null>(null);

  const introEmbedUrl = introVideoUrl ? getYouTubeEmbedUrl(introVideoUrl) : null;
  const publicDisplayName = stageName.trim() || firstName.trim();

  // Creator mode: auto-load their own profile on mount (no way to switch
  // phones, so this always means "my own data"). Admin mode: deep-linked
  // from /influencer/creators' "Edit profile" button (?phone=...).
  useEffect(() => {
    const phoneToLoad = lockedPhone ?? searchParams.get("phone");
    if (phoneToLoad) loadExisting(phoneToLoad);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Live availability check, debounced — same UX as checking a username on
  // any signup form. Skipped entirely if the code hasn't changed from what's
  // already saved for this exact creator (typing back to your own current
  // code shouldn't flash "taken").
  useEffect(() => {
    const code = joinCode.trim();
    if (!code) {
      setJoinCodeStatus("idle");
      return;
    }
    setJoinCodeStatus("checking");
    const timeout = setTimeout(() => {
      fetch(`/api/check-join-code?code=${encodeURIComponent(code)}${savedUserId ? `&excludeUserId=${savedUserId}` : ""}`)
        .then((r) => r.json())
        .then((data) => setJoinCodeStatus(data.available ? "available" : "taken"));
    }, 400);
    return () => clearTimeout(timeout);
  }, [joinCode, savedUserId]);

  async function loadExisting(phoneOverride?: string) {
    const lookupPhone = (phoneOverride ?? phone).trim();
    if (!lookupPhone) return setError("Enter a phone number to look up first.");
    setError("");
    setLoadingLookup(true);
    const data = await fetch(`/api/influencer-profile?phone=${encodeURIComponent(lookupPhone)}`).then((r) => r.json());
    setLoadingLookup(false);
    if (!data.found) {
      if (!lockedPhone) setError("No creator found with that phone number — fill in the form to create one.");
      return;
    }
    setFirstName(data.firstName);
    setLastName(data.lastName);
    setStageName(data.stageName);
    setJoinCode(data.joinCode);
    setPhotoUrl(data.photoUrl);
    setBio(data.bio);
    setInstagram(data.instagramUrl);
    setYoutube(data.youtubeUrl);
    setTiktok(data.tiktokUrl);
    setIntroVideoUrl(data.introVideoUrl);
    setSavedUserId(data.userId);
  }

  async function handleSave() {
    setError("");
    if (!firstName.trim()) return setError("Enter the creator's first name.");
    if (!lastName.trim()) return setError("Enter the creator's last name.");
    if (!phone.trim()) return setError("A phone number is required.");
    if (joinCode.trim() && joinCodeStatus === "taken") return setError("That join code is already taken — pick another.");

    setSaving(true);
    const res = await fetch("/api/influencer-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName,
        lastName,
        stageName,
        joinCode,
        phone: lockedPhone ?? phone,
        photoUrl,
        bio,
        instagramUrl: instagram,
        youtubeUrl: youtube,
        tiktokUrl: tiktok,
        introVideoUrl,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error ?? "Something went wrong.");
      return;
    }
    setSavedUserId(data.userId);
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto p-6 pb-16">
        {!firstTimeSetup && (
          <Link
            href={lockedPhone ? "/influencer/me" : "/influencer"}
            className="text-xs text-muted-foreground hover:text-foreground mb-3 inline-block"
          >
            {lockedPhone ? "← Creator Home" : "← Creator Tools"}
          </Link>
        )}

        <div className="flex items-baseline justify-between pb-4 mb-6 border-b-2 border-border">
          <p className="text-xs font-bold tracking-widest uppercase text-muted-foreground">Iron Temple</p>
          <p className="text-xs text-muted-foreground">
            {firstTimeSetup ? "Get Started" : lockedPhone ? "My Profile" : "Creator Onboarding"}
          </p>
        </div>

        {firstTimeSetup && (
          <div className="mb-6">
            <h1 className="text-xl font-bold text-foreground">Let&apos;s start earning.</h1>
            <p className="text-sm text-muted-foreground mt-1.5">
              A few details about you and your program, then you&apos;re live — your fans can text your code today.
            </p>
          </div>
        )}

        <div className="rounded-xl border border-amber-400/40 bg-amber-50 dark:bg-amber-950/20 px-3 py-2.5 mb-6">
          <p className="text-xs text-amber-700 dark:text-amber-400">
            Prototype stage — this creates a real User + CreatorProfile, but there&apos;s no payment or recruiter
            attribution yet (see CLAUDE.md).
          </p>
        </div>

        {savedUserId && (
          <div className="rounded-xl border border-emerald-400/40 bg-emerald-50 dark:bg-emerald-950/20 px-3 py-2.5 mb-6 flex flex-col gap-2">
            <p className="text-xs text-emerald-700 dark:text-emerald-400">Saved. This creator&apos;s account is live.</p>
            <div className="flex gap-2">
              <Link
                href={`/build/${savedUserId}?from=business`}
                className="text-xs font-medium px-3 py-1.5 rounded-full bg-amber-500 hover:bg-amber-600 text-white"
              >
                Build their plan →
              </Link>
              <Link
                href={`/menu/${savedUserId}`}
                className="text-xs font-medium px-3 py-1.5 rounded-full border border-border hover:bg-muted transition-colors"
              >
                Open their Menu →
              </Link>
            </div>
          </div>
        )}

        {error && <p className="text-xs text-destructive mb-4">{error}</p>}

        <div className="flex flex-col gap-5">
          <div className="flex gap-2">
            <div className="flex-1">
              <p className="text-xs font-medium text-muted-foreground mb-1.5">First Name</p>
              <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Jenny" className="text-sm" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-medium text-muted-foreground mb-1.5">Last Name</p>
              <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Rivera" className="text-sm" />
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5">Stage Name (optional)</p>
            <Input value={stageName} onChange={(e) => setStageName(e.target.value)} placeholder="e.g. CBum — shown publicly instead of their legal name" className="text-sm" />
            <p className="text-xs text-muted-foreground mt-1">
              Legal name is kept private (for banking/tax later). If set, the stage name is what shows on the public plan page.
            </p>
          </div>

          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5">Join Code</p>
            <Input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              placeholder="e.g. LARRY25 — or their Instagram handle, since that's what people already know them as"
              className="text-sm"
            />
            <div className="flex items-center gap-1.5 mt-1">
              {joinCode.trim() && joinCodeStatus === "checking" && (
                <p className="text-xs text-muted-foreground">Checking availability...</p>
              )}
              {joinCode.trim() && joinCodeStatus === "available" && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400">Available — people text JOIN{joinCode.replace(/[^a-zA-Z0-9]/g, "").toUpperCase()} to follow this creator.</p>
              )}
              {joinCode.trim() && joinCodeStatus === "taken" && (
                <p className="text-xs text-destructive">That code is already taken — try another.</p>
              )}
              {!joinCode.trim() && (
                <p className="text-xs text-muted-foreground">Pick a code for people to join — e.g. their Instagram handle, since that&apos;s what people already know them as.</p>
              )}
            </div>
          </div>

          {lockedPhone ? (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1.5">Phone Number</p>
              <p className="text-sm px-3 py-2 rounded-xl border border-border bg-muted text-muted-foreground">{lockedPhone}</p>
            </div>
          ) : (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1.5">Phone Number</p>
              <div className="flex gap-2">
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+15550001234" className="text-sm" />
                <button
                  onClick={() => loadExisting()}
                  disabled={loadingLookup}
                  className="text-xs px-3 py-1.5 rounded-xl border border-border hover:bg-muted transition-colors shrink-0"
                >
                  {loadingLookup ? "..." : "Load"}
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Already onboarded this creator? Enter their phone and tap Load to edit their profile.
              </p>
            </div>
          )}

          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5">Profile Photo URL</p>
            <Input value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} placeholder="https://..." className="text-sm" />
          </div>

          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5">Bio</p>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="A line or two on who you are and what you coach."
              rows={3}
              className="w-full text-sm rounded-xl border border-border bg-background px-3 py-2 resize-none"
            />
          </div>

          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5">Social Media</p>
            <div className="flex flex-col gap-2">
              <Input value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="Instagram — @handle or URL" className="text-sm" />
              <Input value={youtube} onChange={(e) => setYoutube(e.target.value)} placeholder="YouTube — channel URL" className="text-sm" />
              <Input value={tiktok} onChange={(e) => setTiktok(e.target.value)} placeholder="TikTok — @handle or URL" className="text-sm" />
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5">Intro Video (YouTube link)</p>
            <Input value={introVideoUrl} onChange={(e) => setIntroVideoUrl(e.target.value)} placeholder="https://youtube.com/watch?v=..." className="text-sm" />
          </div>

          <button
            onClick={handleSave}
            disabled={saving || joinCodeStatus === "checking" || joinCodeStatus === "taken"}
            className="w-full text-sm text-center px-4 py-2.5 rounded-full bg-amber-500 hover:bg-amber-600 text-white transition-colors disabled:opacity-50"
          >
            {saving ? "Saving..." : savedUserId ? "Save Changes" : "Create Creator"}
          </button>
        </div>

        {/* Live preview — roughly how this would show up on the creator's
            public plan page once these fields are real. */}
        <div className="mt-10 pt-6 border-t-2 border-border">
          <p className="text-xs font-bold tracking-widest uppercase text-muted-foreground mb-4">Preview</p>

          <div className="border border-border rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-14 h-14 rounded-full bg-muted overflow-hidden shrink-0 flex items-center justify-center">
                {photoUrl ? (
                  <img src={photoUrl} alt={publicDisplayName || "Creator photo"} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs text-muted-foreground">Photo</span>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{publicDisplayName || "Creator Name"}</p>
                <p className="text-xs text-muted-foreground truncate">{phone || "No phone set"}</p>
              </div>
            </div>

            {bio && <p className="text-sm text-foreground mb-3">{bio}</p>}

            {(instagram || youtube || tiktok) && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {instagram && (
                  <a
                    href={socialUrl(instagram, "instagram")}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs px-2.5 py-1 rounded-full border border-border text-muted-foreground hover:bg-muted transition-colors"
                  >
                    Instagram
                  </a>
                )}
                {youtube && (
                  <a
                    href={socialUrl(youtube, "youtube")}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs px-2.5 py-1 rounded-full border border-border text-muted-foreground hover:bg-muted transition-colors"
                  >
                    YouTube
                  </a>
                )}
                {tiktok && (
                  <a
                    href={socialUrl(tiktok, "tiktok")}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs px-2.5 py-1 rounded-full border border-border text-muted-foreground hover:bg-muted transition-colors"
                  >
                    TikTok
                  </a>
                )}
              </div>
            )}

            {introEmbedUrl && (
              <div className="rounded-xl overflow-hidden aspect-video">
                <iframe
                  src={introEmbedUrl}
                  title="Intro video"
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            )}
            {introVideoUrl && !introEmbedUrl && (
              <p className="text-xs text-destructive">That doesn&apos;t look like a YouTube link — paste a youtube.com or youtu.be URL.</p>
            )}

            {!photoUrl && !bio && !instagram && !youtube && !tiktok && !introVideoUrl && (
              <p className="text-xs text-muted-foreground">Fill in the fields above to see how this would look.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
