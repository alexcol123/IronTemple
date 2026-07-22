import { requireAdmin } from "@/lib/auth-roles";
import AdminExercisesPage from "./ExercisesClient";

export default async function Page() {
  await requireAdmin();
  return <AdminExercisesPage />;
}
