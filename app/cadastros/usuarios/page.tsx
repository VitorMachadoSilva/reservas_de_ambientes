import { redirect } from "next/navigation";
import { ReservationWorkspace } from "@/app/components/reservation-workspace";
import { getReservationPageData, loginRequired } from "@/lib/reservation-data";

export default async function UserRegistrationsPage() {
  const data = await getReservationPageData();

  if (data === loginRequired) redirect("/login");
  if (!data) redirect("/setup");

  return <ReservationWorkspace {...data} view="registrations-users" />;
}
