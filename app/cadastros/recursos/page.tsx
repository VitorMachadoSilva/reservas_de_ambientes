import { redirect } from "next/navigation";
import { ReservationWorkspace } from "@/app/components/reservation-workspace";
import { getReservationPageData, loginRequired } from "@/lib/reservation-data";
import { getInitialSidebarCollapsed } from "@/lib/sidebar-state";

export default async function ResourceRegistrationsPage() {
  const data = await getReservationPageData();

  if (data === loginRequired) redirect("/login");
  if (!data) redirect("/setup");

  const initialSidebarCollapsed = await getInitialSidebarCollapsed();

  return (
    <ReservationWorkspace
      {...data}
      view="registrations-resources"
      initialSidebarCollapsed={initialSidebarCollapsed}
    />
  );
}
