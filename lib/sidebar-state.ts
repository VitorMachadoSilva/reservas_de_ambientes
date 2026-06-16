import { cookies } from "next/headers";

export const sidebarStateCookie = "reservation-sidebar-collapsed";

export async function getInitialSidebarCollapsed() {
  return (await cookies()).get(sidebarStateCookie)?.value === "true";
}
