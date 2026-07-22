import { requireAdmin } from "@/lib/auth-roles";
import AdminWorkoutPlansPage from "./WorkoutPlansClient";

export default async function Page() {
  await requireAdmin();
  return <AdminWorkoutPlansPage />;
}
