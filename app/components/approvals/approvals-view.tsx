"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  Filter,
  History,
  Search,
  UserRound,
  XCircle,
} from "lucide-react";
import { approveReservationRequest, expireStaleReservationRequests, rejectReservationRequest } from "../../actions";
import { PendingButton } from "../pending-button";

type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED" | "EXPIRED";

type RelatedEntity = {
  id?: string;
  name?: string;
  code?: string;
  email?: string;
};

type ApprovalRequest = {
  id: string;
  status?: ApprovalStatus | string;
  date?: string | Date;
  startTime?: string;
  endTime?: string;
  startsAt?: string;
  endsAt?: string;
  purpose?: string;
  objective?: string;
  reason?: string | null;
  rejectionReason?: string | null;
  cancelReason?: string | null;
  observation?: string | null;
  notes?: string | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  approvedAt?: string | Date | null;
  rejectedAt?: string | Date | null;
  cancelledAt?: string | Date | null;
  course?: RelatedEntity | null;
  discipline?: RelatedEntity | null;
  classGroup?: RelatedEntity | null;
  space?: RelatedEntity | null;
  requester?: RelatedEntity | null;
  approver?: RelatedEntity | null;
  approvedBy?: RelatedEntity | null;
  rejectedBy?: RelatedEntity | null;
  cancelledBy?: RelatedEntity | null;
};

type ApprovalsViewProps = {
  reservationRequests?: ApprovalRequest[];
  requests?: ApprovalRequest[];
  approvalRequests?: ApprovalRequest[];
  pendingRequests?: ApprovalRequest[];
  courses?: RelatedEntity[];
  allCourses?: RelatedEntity[];
  spaces?: RelatedEntity[];
  allSpaces?: RelatedEntity[];
  currentUser?: RelatedEntity;
  [key: string]: unknown;
};

const statusOptions = [
  { value: "PENDING", label: "Pendentes" },
  { value: "APPROVED", label: "Aprovadas" },
  { value: "REJECTED", label: "Recusadas" },
  { value: "CANCELLED", label: "Canceladas" },
  { value: "EXPIRED", label: "Expiradas" },
] as const;

const statusLabels: Record<string, string> = {
  PENDING: "Pendente",
  APPROVED: "Aprovada",
  REJECTED: "Recusada",
  CANCELLED: "Cancelada",
  EXPIRED: "Expirada",
  EXPIRADA: "Expirada",
};

const statusTone: Record<string, string> = {
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "danger",
  CANCELLED: "muted",
  EXPIRED: "danger",
  EXPIRADA: "danger",
};

function entityName(entity?: RelatedEntity | null, fallback = "Nao informado") {
  return entity?.name || entity?.code || entity?.email || fallback;
}

function formatDate(value?: string | Date) {
  if (!value) return "Sem data";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Sao_Paulo",
    year: "numeric",
  }).format(date);
}

function formatDateTime(value?: string | Date) {
  if (!value) return "Data nao informada";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "Data nao informada";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
    timeZone: "America/Sao_Paulo",
    year: "numeric",
  }).format(date);
}

function formatTime(value?: string) {
  if (!value) return "--:--";
  if (value.includes("T")) return value.split("T")[1]?.slice(0, 5) || "--:--";
  return value.slice(0, 5);
}

function requestTime(request: ApprovalRequest) {
  const start = request.startTime || request.startsAt;
  const end = request.endTime || request.endsAt;
  return `${formatTime(start)} - ${formatTime(end)}`;
}

function requestText(request: ApprovalRequest) {
  return [
    entityName(request.course, ""),
    entityName(request.discipline, ""),
    entityName(request.classGroup, ""),
    entityName(request.space, ""),
    entityName(request.requester, ""),
    request.purpose || request.objective || "",
    formatDate(request.date),
  ]
    .join(" ")
    .toLowerCase();
}

function dateInputValue(value?: string | Date) {
  if (!value) return "";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toISOString().slice(0, 10);
}

function normalizeTime(value?: string) {
  if (!value) return "";
  if (value.includes("T")) return value.split("T")[1]?.slice(0, 5) || "";
  return value.slice(0, 5);
}

function isExpiredRequest(request: ApprovalRequest, now: number) {
  if (!now) return false;
  if ((request.status || "PENDING") !== "PENDING") return false;
  const date = dateInputValue(request.date);
  const start = normalizeTime(request.startTime || request.startsAt);
  if (!date || !start) return false;

  return new Date(`${date}T${start}:00`).getTime() - now <= 60 * 60 * 1000;
}

function effectiveRequestStatus(request: ApprovalRequest, now: number) {
  const status = request.status || "PENDING";
  if (status === "EXPIRADA") return "EXPIRED";
  return isExpiredRequest(request, now) ? "EXPIRED" : status;
}

function minutesUntilStart(request: ApprovalRequest, now: number) {
  if (!now) return null;
  const date = dateInputValue(request.date);
  const start = normalizeTime(request.startTime || request.startsAt);
  if (!date || !start) return null;

  return Math.floor((new Date(`${date}T${start}:00`).getTime() - now) / 60000);
}

function approvalDeadlineLabel(request: ApprovalRequest, now: number) {
  const minutes = minutesUntilStart(request, now);
  if (minutes === null) return "Prazo nao informado";
  const minutesToDeadline = minutes - 60;
  if (minutesToDeadline <= 0) return "Prazo expirado";

  const hours = Math.floor(minutesToDeadline / 60);
  const rest = minutesToDeadline % 60;
  if (hours <= 0) return `Expira em ${rest} min`;
  if (rest === 0) return `Expira em ${hours}h`;
  return `Expira em ${hours}h ${rest}min`;
}

function buildRequestHistory(request: ApprovalRequest, now: number) {
  const status = effectiveRequestStatus(request, now);
  const history = [
    {
      title: "Solicitacao enviada",
      description: `${entityName(request.requester, "Docente")} solicitou ${entityName(
        request.space,
        "o ambiente"
      )}.`,
      date: formatDateTime(request.createdAt || request.date),
      tone: "neutral",
    },
  ];

  if (status === "PENDING") {
    history.push({
      title: "Horario bloqueado provisoriamente",
      description: "A reserva aguarda avaliacao e impede novas solicitacoes para o mesmo horario.",
      date: formatDateTime(request.updatedAt || request.createdAt || request.date),
      tone: "warning",
    });
  }

  if (status === "EXPIRED") {
    history.push({
      title: "Solicitacao expirada",
      description: "Ninguem aprovou a solicitacao ate 1 hora antes do inicio. O horario foi liberado.",
      date: formatDateTime(request.updatedAt || request.createdAt || request.date),
      tone: "danger",
    });
  }

  if (status === "APPROVED") {
    history.push({
      title: "Solicitacao aprovada",
      description: `${entityName(request.approvedBy || request.approver, "Aprovador")} confirmou a reserva.`,
      date: formatDateTime(request.approvedAt || request.updatedAt),
      tone: "success",
    });
  }

  if (status === "REJECTED") {
    history.push({
      title: "Solicitacao recusada",
      description:
        request.rejectionReason ||
        request.observation ||
        "A solicitacao foi recusada pelo aprovador responsavel.",
      date: formatDateTime(request.rejectedAt || request.updatedAt),
      tone: "danger",
    });
  }

  if (status === "CANCELLED") {
    history.push({
      title: "Solicitacao cancelada",
      description:
        request.cancelReason ||
        request.observation ||
        `${entityName(request.cancelledBy || request.requester, "Usuario")} cancelou a solicitacao.`,
      date: formatDateTime(request.cancelledAt || request.updatedAt),
      tone: "muted",
    });
  }

  return history;
}

export function ApprovalsPageView({
  reservationRequests,
  requests,
  approvalRequests,
  pendingRequests,
  courses = [],
  allCourses = [],
  spaces = [],
  allSpaces = [],
}: ApprovalsViewProps) {
  const allRequests = requests ?? reservationRequests ?? approvalRequests ?? pendingRequests ?? [];
  const router = useRouter();
  const [activeStatus, setActiveStatus] = useState<ApprovalStatus>("PENDING");
  const [search, setSearch] = useState("");
  const [courseFilter, setCourseFilter] = useState("ALL");
  const [spaceFilter, setSpaceFilter] = useState("ALL");
  const [dateFilter, setDateFilter] = useState("");
  const [selectedId, setSelectedId] = useState(allRequests[0]?.id ?? "");
  const [rejectReasons, setRejectReasons] = useState<Record<string, string>>({});
  const [approvalNotes, setApprovalNotes] = useState<Record<string, string>>({});
  const [currentTime, setCurrentTime] = useState(0);

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

  const statusCounts = useMemo(() => {
    return allRequests.reduce<Record<string, number>>((acc, request) => {
      const status = effectiveRequestStatus(request, currentTime);
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});
  }, [allRequests, currentTime]);

  const courseOptions = useMemo(() => {
    if (courses.length > 0) return courses;
    if (allCourses.length > 0) return allCourses;
    const byId = new Map<string, RelatedEntity>();
    allRequests.forEach((request) => {
      const course = request.course;
      const id = course?.id || entityName(course, "");
      if (id) byId.set(id, course || { id, name: id });
    });
    return Array.from(byId.values());
  }, [allCourses, allRequests, courses]);

  const spaceOptions = useMemo(() => {
    if (spaces.length > 0) return spaces;
    if (allSpaces.length > 0) return allSpaces;
    const byId = new Map<string, RelatedEntity>();
    allRequests.forEach((request) => {
      const space = request.space;
      const id = space?.id || entityName(space, "");
      if (id) byId.set(id, space || { id, name: id });
    });
    return Array.from(byId.values());
  }, [allRequests, allSpaces, spaces]);

  const filteredRequests = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return allRequests.filter((request) => {
      const status = effectiveRequestStatus(request, currentTime);
      const matchesStatus = status === activeStatus;
      const matchesSearch = !normalizedSearch || requestText(request).includes(normalizedSearch);
      const requestCourseId = request.course?.id || entityName(request.course, "");
      const requestSpaceId = request.space?.id || entityName(request.space, "");
      const matchesCourse = courseFilter === "ALL" || requestCourseId === courseFilter;
      const matchesSpace = spaceFilter === "ALL" || requestSpaceId === spaceFilter;
      const matchesDate = !dateFilter || dateInputValue(request.date) === dateFilter;

      return matchesStatus && matchesSearch && matchesCourse && matchesSpace && matchesDate;
    });
  }, [activeStatus, allRequests, courseFilter, currentTime, dateFilter, search, spaceFilter]);

  const selectedRequest =
    filteredRequests.find((request) => request.id === selectedId) ?? filteredRequests[0] ?? null;

  const pendingBlockingCount = statusCounts.PENDING || 0;
  const selectedRejectReason = selectedRequest ? rejectReasons[selectedRequest.id] || "" : "";
  const selectedApprovalNote = selectedRequest ? approvalNotes[selectedRequest.id] || "" : "";

  return (
    <section className="approval-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Aprovador</span>
          <h1>Aprovar reservas</h1>
          <p>
            Analise as solicitacoes, confirme os dados academicos e registre a decisao com
            clareza para o docente.
          </p>
        </div>
        <div className="approval-summary">
          <AlertTriangle size={18} />
          <div>
            <strong>{pendingBlockingCount}</strong>
            <span>horario(s) bloqueado(s) provisoriamente</span>
          </div>
        </div>
      </div>

      <div className="approval-status-tabs">
        {statusOptions.map((option) => (
          <button
            key={option.value}
            className={activeStatus === option.value ? "active" : ""}
            type="button"
            onClick={() => {
              setActiveStatus(option.value);
              setSelectedId("");
            }}
          >
            {option.label}
            <span>{statusCounts[option.value] || 0}</span>
          </button>
        ))}
      </div>

      <div className="approval-filters">
        <label className="filter-field wide">
          <Search size={16} />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar docente, curso, disciplina ou ambiente"
          />
        </label>
        <label className="filter-field">
          <Filter size={16} />
          <select value={courseFilter} onChange={(event) => setCourseFilter(event.target.value)}>
            <option value="ALL">Todos os cursos</option>
            {courseOptions.map((course) => (
              <option key={course.id || entityName(course)} value={course.id || entityName(course)}>
                {entityName(course)}
              </option>
            ))}
          </select>
        </label>
        <label className="filter-field">
          <Filter size={16} />
          <select value={spaceFilter} onChange={(event) => setSpaceFilter(event.target.value)}>
            <option value="ALL">Todos os ambientes</option>
            {spaceOptions.map((space) => (
              <option key={space.id || entityName(space)} value={space.id || entityName(space)}>
                {entityName(space)}
              </option>
            ))}
          </select>
        </label>
        <label className="filter-field">
          <CalendarDays size={16} />
          <input type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} />
        </label>
      </div>

      <div className="approval-workspace">
        <div className="approval-list">
          <div className="approval-list-header">
            <strong>{filteredRequests.length} solicitacao(oes)</strong>
            <span>{statusLabels[activeStatus]}</span>
          </div>

          {filteredRequests.length === 0 ? (
            <div className="empty-state compact">
              Nenhuma solicitacao encontrada com os filtros atuais.
            </div>
          ) : (
            filteredRequests.map((request) => {
              const status = effectiveRequestStatus(request, currentTime);
              const isSelected = selectedRequest?.id === request.id;

              return (
                <button
                  key={request.id}
                  className={`approval-request-card ${isSelected ? "active" : ""}`}
                  type="button"
                  onClick={() => setSelectedId(request.id)}
                >
                  <div>
                    <strong>{entityName(request.space, "Ambiente nao definido")}</strong>
                    <span>{entityName(request.requester, "Docente nao informado")}</span>
                  </div>
                  <div className="approval-card-meta">
                    <span>
                      <CalendarDays size={14} />
                      {formatDate(request.date)}
                    </span>
                    <span>
                      <Clock3 size={14} />
                      {requestTime(request)}
                    </span>
                  </div>
                  <div className="approval-card-footer">
                    <span>{entityName(request.course, "Curso nao informado")}</span>
                    <span className={`status-pill ${statusTone[status] || "muted"}`}>
                      {statusLabels[status] || status}
                    </span>
                  </div>
                  {(status === "PENDING" || status === "EXPIRED") && (
                    <div className={`approval-deadline-chip ${status === "EXPIRED" ? "expired" : ""}`}>
                      {approvalDeadlineLabel(request, currentTime)}
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>

        <aside className="approval-detail-panel">
          {!selectedRequest ? (
            <div className="empty-state">
              Selecione uma solicitacao para visualizar os detalhes.
            </div>
          ) : (
            <>
              <div className="approval-detail-header">
                <div>
                  <span className="eyebrow">Detalhe da solicitacao</span>
                  <h2>{entityName(selectedRequest.space, "Ambiente nao definido")}</h2>
                </div>
                <span className={`status-pill ${statusTone[effectiveRequestStatus(selectedRequest, currentTime)] || "muted"}`}>
                  {statusLabels[effectiveRequestStatus(selectedRequest, currentTime)] || effectiveRequestStatus(selectedRequest, currentTime)}
                </span>
              </div>

              {(effectiveRequestStatus(selectedRequest, currentTime) === "PENDING" ||
                effectiveRequestStatus(selectedRequest, currentTime) === "EXPIRED") && (
                <div
                  className={`approval-deadline-banner ${
                    effectiveRequestStatus(selectedRequest, currentTime) === "EXPIRED" ? "expired" : ""
                  }`}
                >
                  <Clock3 size={17} />
                  <div>
                    <strong>{approvalDeadlineLabel(selectedRequest, currentTime)}</strong>
                    <span>
                      Solicitacoes pendentes expiram se nao forem aprovadas ate 1 hora antes do inicio.
                    </span>
                  </div>
                </div>
              )}

              <div className="detail-grid">
                <div>
                  <UserRound size={16} />
                  <span>Docente</span>
                  <strong>{entityName(selectedRequest.requester, "Nao informado")}</strong>
                </div>
                <div>
                  <CalendarDays size={16} />
                  <span>Data</span>
                  <strong>{formatDate(selectedRequest.date)}</strong>
                </div>
                <div>
                  <Clock3 size={16} />
                  <span>Horario</span>
                  <strong>{requestTime(selectedRequest)}</strong>
                </div>
                <div>
                  <FileText size={16} />
                  <span>Curso</span>
                  <strong>{entityName(selectedRequest.course, "Nao informado")}</strong>
                </div>
                <div>
                  <FileText size={16} />
                  <span>Disciplina</span>
                  <strong>{entityName(selectedRequest.discipline, "Nao informado")}</strong>
                </div>
                <div>
                  <FileText size={16} />
                  <span>Turma</span>
                  <strong>{entityName(selectedRequest.classGroup, "Nao informado")}</strong>
                </div>
              </div>

              <div className="approval-note-box">
                <span>Finalidade</span>
                <p>{selectedRequest.purpose || selectedRequest.objective || "Sem finalidade informada."}</p>
              </div>

              <div className="approval-history">
                <div className="approval-history-title">
                  <History size={16} />
                  <span>Historico da solicitacao</span>
                </div>
                {buildRequestHistory(selectedRequest, currentTime).map((item) => (
                  <div className={`approval-history-item ${item.tone}`} key={`${item.title}-${item.date}`}>
                    <div />
                    <section>
                      <strong>{item.title}</strong>
                      <p>{item.description}</p>
                      <small>{item.date}</small>
                    </section>
                  </div>
                ))}
              </div>

              {(selectedRequest.rejectionReason ||
                selectedRequest.cancelReason ||
                selectedRequest.observation ||
                selectedRequest.notes) && (
                <div className="approval-note-box muted">
                  <span>Historico / observacao</span>
                  <p>
                    {selectedRequest.rejectionReason ||
                      selectedRequest.cancelReason ||
                      selectedRequest.observation ||
                      selectedRequest.notes}
                  </p>
                </div>
              )}

              {effectiveRequestStatus(selectedRequest, currentTime) === "PENDING" && (
                <div className="approval-actions">
                  <form action={approveReservationRequest} className="approval-action-form">
                    <input type="hidden" name="id" value={selectedRequest.id} />
                    <input type="hidden" name="requestId" value={selectedRequest.id} />
                    <input type="hidden" name="reservationId" value={selectedRequest.id} />
                    <input type="hidden" name="reservationRequestId" value={selectedRequest.id} />
                    <textarea
                      value={selectedApprovalNote}
                      onChange={(event) =>
                        setApprovalNotes((current) => ({
                          ...current,
                          [selectedRequest.id]: event.target.value,
                        }))
                      }
                      name="observation"
                      placeholder="Observacao opcional para o docente"
                    />
                    <input type="hidden" name="note" value={selectedApprovalNote} />
                    <input type="hidden" name="approvalNote" value={selectedApprovalNote} />
                    <PendingButton className="primary-action" pendingText="Aprovando...">
                      <CheckCircle2 size={16} />
                      Aprovar solicitacao
                    </PendingButton>
                  </form>

                  <form action={rejectReservationRequest} className="approval-action-form">
                    <input type="hidden" name="id" value={selectedRequest.id} />
                    <input type="hidden" name="requestId" value={selectedRequest.id} />
                    <input type="hidden" name="reservationId" value={selectedRequest.id} />
                    <input type="hidden" name="reservationRequestId" value={selectedRequest.id} />
                    <textarea
                      required
                      minLength={8}
                      value={selectedRejectReason}
                      onChange={(event) =>
                        setRejectReasons((current) => ({
                          ...current,
                          [selectedRequest.id]: event.target.value,
                        }))
                      }
                      name="reason"
                      placeholder="Motivo obrigatorio da recusa"
                    />
                    <input type="hidden" name="rejectionReason" value={selectedRejectReason} />
                    <input type="hidden" name="observation" value={selectedRejectReason} />
                    <input type="hidden" name="note" value={selectedRejectReason} />
                    <PendingButton className="danger-action" pendingText="Recusando...">
                      <XCircle size={16} />
                      Recusar solicitacao
                    </PendingButton>
                  </form>
                </div>
              )}
            </>
          )}
        </aside>
      </div>
    </section>
  );
}

export const ApprovalsView = ApprovalsPageView;

export default ApprovalsPageView;
