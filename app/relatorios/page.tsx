import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ReportsPageView } from "../components/reports/reports-view";
import { getReservationPageData, loginRequired } from "../../lib/reservation-data";

export default async function ReportsPage() {
  const data = await getReservationPageData();

  if (data === loginRequired) redirect("/login");
  if (!data) redirect("/setup");

  return (
    <main className="standalone-page-shell">
      <div className="standalone-page-inner">
        <Link className="standalone-back-link" href="/painel">
          <ArrowLeft size={16} />
          Voltar ao painel
        </Link>
        <ReportsPageView {...data} />
      </div>
    </main>
  );
}
