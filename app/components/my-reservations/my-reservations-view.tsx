"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CalendarDays, Clock3, FileText, XCircle } from "lucide-react";
import { cancelOwnPendingReservation, expireStaleReservationRequests } from "../../actions";
import { PendingButton } from "../pending-button";
import { PaginationControls } from "../ui/pagination-controls";

type Entity = {
  id?: string;
  name?: string;
  code?: string;
  email?: string;
};

type ReservationRequest = {
  id: string;
  status?: string;
  date?: string | Date;
  startTime?: string;
  endTime?: string;
  startAt?: string | Date;
  endAt?: string | Date;
  startsAt?: string;
  endsAt?: string;
  purpose?: string;
  objective?: string;
  reason?: string | null;
  rejectionReason?: string | null;
  cancelReason?: string | null;
  decisionNote?: string | null;
  observation?: string | null;
  updatedAt?: string | Date;
  space?: Entity | null;
  course?: Entity | null;
  discipline?: Entity | null;
  classGroup?: Entity | null;
};

type MyReservationsPageViewProps = {
  reservationRequests?: ReservationRequest[];
  requests?: ReservationRequest[];
  myReservations?: ReservationRequest[];
  [key: string]: unknown;
};

const PAGE_SIZE = 5;

const statusLabel: Record<string, string> = {
  PENDING: "Pendente",
  PENDENTE: "Pendente",
  APPROVED: "Aprovada",
  APROVADA: "Aprovada",
  REJECTED: "Recusada",
  RECUSADA: "Recusada",
  CANCELLED: "Cancelada",
  CANCELADA: "Cancelada",
  EXPIRED: "Expirada",
  EXPIRADA: "Expirada",
};

const statusTone: Record<string, string> = {
  PENDING: "warning",
  PENDENTE: "warning",
  APPROVED: "success",
  APROVADA: "success",
  REJECTED: "danger",
  RECUSADA: "danger",
  CANCELLED: "muted",
  CANCELADA: "muted",
  EXPIRED: "danger",
  EXPIRADA: "danger",
};
const approvalDeadlineMinutes = 120;

const statusFilters = [
  { value: "ALL", label: "Todas" },
  { value: "PENDING", label: "Pendentes" },
  { value: "APPROVED", label: "Aprovadas" },
  { value: "REJECTED", label: "Recusadas" },
  { value: "CANCELLED", label: "Canceladas" },
  { value: "EXPIRED", label: "Expiradas" },
] as const;

function entityName(entity?: Entity | null, fallback = "Nao informado") {
  return entity?.name || entity?.code || entity?.email || fallback;
}

function dateInputValue(value?: string | Date) {
  if (!value) return "";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function formatDate(value?: string | Date) {
  const normalized = dateInputValue(value);
  if (!normalized) return "Sem data";
  const [year, month, day] = normalized.split("-");
  return `${day}/${month}/${year}`;
}

function formatTime(value?: string | Date) {
  if (!value) return "--:--";
  if (value instanceof Date) return value.toISOString().split("T")[1]?.slice(0, 5) || "--:--";
  if (value.includes("T")) return value.split("T")[1]?.slice(0, 5) || "--:--";
  return value.slice(0, 5);
}

function normalizeStatus(status?: string) {
  if (status === "PENDENTE") return "PENDING";
  if (status === "APROVADA") return "APPROVED";
  if (status === "RECUSADA") return "REJECTED";
  if (status === "CANCELADA") return "CANCELLED";
  if (status === "EXPIRADA") return "EXPIRED";
  return status || "PENDING";
}

function requestDateValue(request: ReservationRequest) {
  return request.date || request.startAt || request.startsAt;
}

function requestStartValue(request: ReservationRequest) {
  return request.startTime || request.startAt || request.startsAt;
}

function requestEndValue(request: ReservationRequest) {
  return request.endTime || request.endAt || request.endsAt;
}

function isExpired(request: ReservationRequest, now: number) {
  if (!now) return false;
  if (normalizeStatus(request.status) !== "PENDING") return false;
  const date = dateInputValue(requestDateValue(request));
  const start = formatTime(requestStartValue(request));
  if (!date || start === "--:--") return false;
  return new Date(`${date}T${start}:00`).getTime() - now <= approvalDeadlineMinutes * 60 * 1000;
}

function effectiveStatus(request: ReservationRequest, now: number) {
  const status = normalizeStatus(request.status);
  return isExpired(request, now) ? "EXPIRED" : status;
}

export function MyReservationsPageView({
  reservationRequests,
  requests,
  myReservations,
}: MyReservationsPageViewProps) {
  const allReservations = myReservations ?? requests ?? reservationRequests ?? [];
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [cancelingId, setCancelingId] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [currentTime, setCurrentTime] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  useEffect(() => {
    setCurrentTime(Date.now());
  }, []);

  useEffect(() => {
    expireStaleReservationRequests()
      .then((expiredCount) => {
        if (expiredCount > 0) router.refresh();
      })
      .catch(() => undefined);
  }, [router]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  const sortedReservations = useMemo(() => {
    return [...allReservations].sort((a, b) => {
      const dateA = `${dateInputValue(requestDateValue(a))} ${formatTime(requestStartValue(a))}`;
      const dateB = `${dateInputValue(requestDateValue(b))} ${formatTime(requestStartValue(b))}`;
      return dateB.localeCompare(dateA);
    });
  }, [allReservations]);

  const filteredReservations = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return sortedReservations.filter((request) => {
      const status = effectiveStatus(request, currentTime);
      const matchesStatus = statusFilter === "ALL" || status === statusFilter;
      const matchesSearch =
        !normalizedSearch ||
        [
          entityName(request.space, ""),
          entityName(request.course, ""),
          entityName(request.discipline, ""),
          entityName(request.classGroup, ""),
          request.purpose || request.objective || "",
          formatDate(requestDateValue(request)),
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedSearch);

      return matchesStatus && matchesSearch;
    });
  }, [currentTime, search, sortedReservations, statusFilter]);

  const statusCounts = useMemo(() => {
    return sortedReservations.reduce<Record<string, number>>(
      (acc, request) => {
        const status = effectiveStatus(request, currentTime);
        acc.ALL += 1;
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      },
      { ALL: 0 }
    );
  }, [currentTime, sortedReservations]);

  const expiredCount = sortedReservations.filter((request) => isExpired(request, currentTime)).length;
  const visibleReservations = filteredReservations.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <section className="my-reservations-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Docente</span>
          <h1>Minhas reservas</h1>
          <p>Acompanhe suas solicitacoes, aprovacoes, recusas e cancelamentos.</p>
        </div>
      </div>

      {expiredCount > 0 && (
        <div className="expired-notice">
          <AlertTriangle size={18} />
          <div>
            <strong>{expiredCount} solicitacao(oes) expirada(s)</strong>
            <span>Elas nao foram aprovadas ate 2 horas antes do inicio e foram invalidadas automaticamente.</span>
          </div>
        </div>
      )}

      <div className="my-reservations-toolbar">
        <input
          aria-label="Buscar minhas reservas"
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por ambiente, curso, disciplina ou finalidade"
        />
        <div className="my-reservations-status-tabs">
          {statusFilters.map((filter) => (
            <button
              className={statusFilter === filter.value ? "active" : ""}
              key={filter.value}
              type="button"
              onClick={() => setStatusFilter(filter.value)}
            >
              {filter.label}
              <span>{statusCounts[filter.value] || 0}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="reservation-list">
        {visibleReservations.length === 0 ? (
          <div className="empty-state">Nenhuma reserva encontrada com os filtros atuais.</div>
        ) : (
          visibleReservations.map((request) => {
            const status = effectiveStatus(request, currentTime);
            const isPending = status === "PENDING";
            const isCanceling = cancelingId === request.id;
            const note =
              request.rejectionReason ||
              request.cancelReason ||
              request.decisionNote ||
              request.observation ||
              request.reason ||
              (status === "EXPIRED" ? "Solicitacao expirada por falta de aprovacao ate 2 horas antes do inicio." : "");

            return (
              <article className="my-reservation-card" key={request.id}>
                <div className="my-reservation-main">
                  <div>
                    <strong>{entityName(request.space, "Ambiente nao informado")}</strong>
                    <span>
                      {entityName(request.course, "Curso")} - {entityName(request.discipline, "Disciplina")} -{" "}
                      {entityName(request.classGroup, "Turma")}
                    </span>
                  </div>
                  <span className={`status-pill ${statusTone[status] || "muted"}`}>{statusLabel[status] || status}</span>
                </div>

                <div className="reservation-meta-row">
                  <span>
                    <CalendarDays size={15} />
                    {formatDate(requestDateValue(request))}
                  </span>
                  <span>
                    <Clock3 size={15} />
                    {formatTime(requestStartValue(request))} - {formatTime(requestEndValue(request))}
                  </span>
                </div>

                <div className="reservation-purpose">
                  <FileText size={15} />
                  <p>{request.purpose || request.objective || "Sem finalidade informada."}</p>
                </div>

                {note && <div className={`reservation-note ${status === "APPROVED" ? "success" : statusTone[status] || "muted"}`}>{note}</div>}

                {isPending && (
                  <div className="reservation-cancel-area">
                    {isCanceling ? (
                      <form action={cancelOwnPendingReservation}>
                        <input type="hidden" name="id" value={request.id} />
                        <input type="hidden" name="requestId" value={request.id} />
                        <input type="hidden" name="reservationId" value={request.id} />
                        <input type="hidden" name="reservationRequestId" value={request.id} />
                        <textarea
                          minLength={8}
                          name="reason"
                          onChange={(event) => setCancelReason(event.target.value)}
                          placeholder="Informe o motivo do cancelamento"
                          required
                          value={cancelReason}
                        />
                        <div>
                          <button type="button" onClick={() => { setCancelingId(""); setCancelReason(""); }}>
                            Manter reserva
                          </button>
                          <PendingButton className="danger-action" pendingText="Cancelando...">
                            <XCircle size={16} />
                            Cancelar solicitacao
                          </PendingButton>
                        </div>
                      </form>
                    ) : (
                      <button className="soft-danger-button" type="button" onClick={() => setCancelingId(request.id)}>
                        <XCircle size={16} />
                        Cancelar pendente
                      </button>
                    )}
                  </div>
                )}
              </article>
            );
          })
        )}
      </div>

      <PaginationControls
        page={page}
        pageSize={PAGE_SIZE}
        total={filteredReservations.length}
        onChange={setPage}
      />
    </section>
  );
}

export const MyReservationsView = MyReservationsPageView;

export default MyReservationsPageView;
