"use client";

import {
  approveReservationRequest,
  rejectReservationRequest,
} from "@/app/actions";
import { Check, Clock3, X } from "lucide-react";
import { PendingButton } from "../pending-button";
import { formatTimeRange } from "../reservations/date-utils";
import type {
  ReservationRequest,
  ReservationWorkspaceProps,
  User,
} from "../reservations/types";

export function ApprovalsPageView(props: ReservationWorkspaceProps) {
  const pendingRequests = props.reservationRequests.filter(
    (request) => request.status === "PENDENTE",
  );
  const userCourseIds = new Set(
    props.courses
      .filter((course) =>
        course.approvers.some(({ user }) => user.id === props.currentUser.id),
      )
      .map((course) => course.id),
  );
  const courseRequests = pendingRequests.filter((request) =>
    userCourseIds.has(request.course.id),
  );
  const adminQueueRequests = pendingRequests.filter(
    (request) => !request.assignedApprover,
  );
  const visibleRequests =
    props.currentUser.role === "ADMIN" ? pendingRequests : courseRequests;

  return (
    <section className="approvals-page">
      <section className="approval-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Coordenacao</p>
            <h2>Solicitacoes para decisao</h2>
          </div>
          <Check size={22} />
        </div>

        <div className="request-list">
          {visibleRequests.length === 0 && (
            <p className="empty-state">Nenhuma solicitacao pendente para seu perfil.</p>
          )}

          {visibleRequests.map((request) => (
            <ApprovalCard
              key={request.id}
              request={request}
              currentApprover={props.currentUser}
            />
          ))}
        </div>
      </section>

      {props.currentUser.role === "ADMIN" && (
        <section className="approval-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Administrativo</p>
              <h2>Fila geral sem aprovador</h2>
            </div>
            <Clock3 size={22} />
          </div>

          <div className="request-list">
            {adminQueueRequests.length === 0 && (
              <p className="empty-state">
                Nenhuma solicitacao sem aprovador configurado.
              </p>
            )}

            {adminQueueRequests.map((request) => (
              <ApprovalCard
                key={request.id}
                request={request}
                currentApprover={props.currentUser}
              />
            ))}
          </div>
        </section>
      )}
    </section>
  );
}

function ApprovalCard({
  request,
  currentApprover,
}: {
  request: ReservationRequest;
  currentApprover: User;
}) {
  return (
    <article className="request-card">
      <div className="request-card-header">
        <div>
          <span className="status-pill pendente">Pendente</span>
          <h3>{request.space.name}</h3>
        </div>
        <span className="date-badge">
          <Clock3 size={15} />
          {formatTimeRange(request.startAt, request.endAt)}
        </span>
      </div>

      <p>
        {request.discipline.name} - {request.classGroup.name}
      </p>
      <p>{request.purpose}</p>

      <div className="request-meta">
        <span>{request.course.name}</span>
        <span>{request.estimatedStudents} alunos</span>
        <span>{request.space.location}</span>
        <span>Docente: {request.requester.name}</span>
        <span>
          {request.assignedApprover
            ? `Aprovador: ${request.assignedApprover.name}`
            : "Fila administrativa geral"}
        </span>
      </div>

      <div className="approval-actions">
        <form action={approveReservationRequest}>
          <input type="hidden" name="requestId" value={request.id} />
          <input type="hidden" name="decidedById" value={currentApprover.id} />
          <PendingButton className="approve-button" pendingLabel="Aprovando...">
            <Check size={17} />
            Aprovar
          </PendingButton>
        </form>

        <form action={rejectReservationRequest}>
          <input type="hidden" name="requestId" value={request.id} />
          <input type="hidden" name="decidedById" value={currentApprover.id} />
          <input
            name="decisionNote"
            placeholder="Motivo da recusa"
            aria-label="Motivo da recusa"
            required
          />
          <PendingButton className="reject-button" pendingLabel="Recusando...">
            <X size={17} />
            Recusar
          </PendingButton>
        </form>
      </div>
    </article>
  );
}
