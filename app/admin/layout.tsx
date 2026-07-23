import { UserButton } from "@clerk/nextjs";

// Applies to every /admin page automatically, including ones added later —
// a page-level <UserButton /> (the old approach, still on a few pages before
// this layout existed) only helps whichever page remembers to add it.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="flex justify-end px-3 py-1.5 border-b border-border">
        <UserButton />
      </div>
      {children}
    </>
  );
}
