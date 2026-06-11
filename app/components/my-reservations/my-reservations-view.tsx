"use client";

import { cancelOwnPendingReservation } from "@/app/actions";
import { GraduationCap, X } from "lucide-react";
import { useState } from "react";
import { PendingButton } from "../pending-button";
import { statusLabels } from "../reservations/constants";
import { formatDateTime, formatTimeRange } from "../reservations/date-utils";
import type {
  ReservationRequest,
  ReservationWorkspaceProps,
  User,
} from "../reservations/types";

export function MyReservationsPageView({
  currentRequester,
  reservationRequests,
}: ReservationWorkspaceProps) {
  const [statusFilter, setStatusFilter] = useState("TODOS");
  const now = new Date();
  const myRequests = reservationRequests.filter(
    (request) => request.requester.id === currentRequester.id,
  );
  const filteredRequests = myRequests.filter(
    (request) => statusFilter === "TODOS" || request.status === statusFilter,
  );
  const upcomingRequests = filteredRequests.filter(
    (request) => new Date(request.endAt) >= now,
  );
  const historyRequests = filteredRequests.filter(
    (request) => new Date(request.endAt) < now,
  );

  return (
    <section className="calendar-panel single-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Docente</p>
          <h2>Minhas reservas</h2>
        </div>
        <GraduationCap size={22} />
      </div>

      <div className="agenda-controls">
        <div>
          <p className="eyebrow">Filtros</p>
          <h2>Acompanhar solicitacoes</h2>
        </div>
        <div className="segmented-group">
          {[
            ["TODOS", "Todas"],
            ["PENDENTE", "Pendentes"],
            ["APROVADA", "Aprovadas"],
            ["RECUSADA", "Recusadas"],
            ["CANCELADA", "Canceladas"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={statusFilter === value ? "active" : ""}
              onClick={() => setStatusFilter(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="section-heading compact-heading">
        <div>
          <p className="eyebrow">Proximas</p>
          <h2>Solicitacoes em andamento ou futuras</h2>
        </div>
      </div>
      <div className="reservation-table">
        {upcomingRequests.length === 0 && (
          <p className="empty-state">Voce ainda nao possui solicitacoes.</p>
        )}

        {upcomingRequests.map((request) => (
          <MyReservationCard
            currentRequester={currentRequester}
            key={request.id}
            request={request}
          />
        ))}
      </div>

      <div className="section-heading compact-heading">
        <div>
          <p className="eyebrow">Historico</p>
          <h2>Reservas encerradas</h2>
        </div>
      </div>
      <div className="reservation-table">
        {historyRequests.length === 0 && (
          <p className="empty-state">Nenhuma reserva encerrada para este filtro.</p>
        )}

        {historyRequests.map((request) => (
          <MyReservationCard
            currentRequester={currentRequester}
            key={request.id}
            request={request}
          />
        ))}
      </div>
    </section>
  );
}

function MyReservationCard({
  currentRequester,
  request,
}: {
  currentRequester: User;
  request: ReservationRequest;
}) {
  const decisionNoteLabel =
    request.status === "APROVADA"
      ? "Observacao da aprovacao"
      : request.status === "RECUSADA"
        ? "Motivo da recusa"
        : request.status === "CANCELADA"
          ? "Motivo do cancelamento"
          : "Motivo/observacao";

  return (
    <article className="reservation-row">
      <div>
        <span className={`status-pill ${request.status.toLowerCase()}`}>
          {statusLabels[request.status]}
        </span>
        <h3>{request.space.name}</h3>
        <p>
          {request.course.name} - {request.discipline.name} - {request.classGroup.name}
        </p>
      </div>
      <div>
        <span>Periodo</span>
        <strong>
          {formatDateTime(request.startAt)} | {formatTimeRange(request.startAt, request.endAt)}
        </strong>
      </div>
      <div>
        <span>Alunos</span>
        <strong>{request.estimatedStudents}</strong>
      </div>
      <div>
        <span>Aprovador</span>
        <strong>{request.assignedApprover?.name ?? "Fila administrativa geral"}</strong>
      </div>
      <div className="reservation-note">
        <span>Finalidade</span>
        <strong>{request.purpose}</strong>
      </div>

      {request.decisionNote && (
        <div
          className={`reservation-note decision-note ${request.status.toLowerCase()}`}
        >
          <span>{decisionNoteLabel}</span>
          <strong>{request.decisionNote}</strong>
        </div>
      )}

      {request.status === "PENDENTE" && (
        <form className="cancel-reservation-form" action={cancelOwnPendingReservation}>
          <input type="hidden" name="requestId" value={request.id} />
          <input type="hidden" name="requesterId" value={currentRequester.id} />
          <input
            name="decisionNote"
            placeholder="Motivo do cancelamento"
            required
          />
          <PendingButton className="reject-button" pendingLabel="Cancelando...">
            <X size={17} />
            Cancelar solicitacao
          </PendingButton>
        </form>
      )}
    </article>
  );
}
