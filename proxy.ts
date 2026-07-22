import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Only /admin and /influencer require login — every athlete-facing route
// (/menu, /today, /build, /progress, /prs, /plan, /history, etc.) stays
// link-based with no auth, per the "link for athletes, login for creator/
// admin tooling" decision.
const isProtectedRoute = createRouteMatcher(["/admin(.*)", "/influencer(.*)"]);

export default clerkMiddleware(async (auth, request) => {
  if (isProtectedRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/:path*",
  ],
};
