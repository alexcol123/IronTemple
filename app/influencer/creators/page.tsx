import { requireAdmin } from "@/lib/auth-roles";
import CreatorsListPage from "./CreatorsListClient";

export default async function Page() {
  await requireAdmin();
  return <CreatorsListPage />;
}
