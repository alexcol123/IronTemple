import { UserButton } from "@clerk/nextjs";

// Applies to every /influencer page automatically, including ones added
// later — a page-level <UserButton /> (the old approach, still on a few
// pages before this layout existed) only helps whichever page remembers to
// add it. Renders in-flow above each page's own content (rather than a
// fixed overlay) so it stacks cleanly above ReadNav's tab bar on the
// /influencer/me/* pages instead of floating on top of it.
export default function InfluencerLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="flex justify-end px-3 py-1.5 border-b border-border">
        <UserButton />
      </div>
      {children}
    </>
  );
}
