"use client";

import {
  Building2,
  CalendarDays,
  Check,
  Clock3,
  DoorOpen,
  LayoutDashboard,
  Send,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { statusLabels } from "../reservations/constants";
import {
  formatTimeRange,
  getDailyOperationalStatus,
  inputDateFromValue,
  minutesFromDateTime,
} from "../reservations/date-utils";
import type {
  ReservationRequest,
  ReservationWorkspaceProps,
} from "../reservations/types";

export function DashboardPageView({
  initialDate,
  reservationRequests,
  spaces,
}: ReservationWorkspaceProps) {
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const todayRequests = reservationRequests.filter(
    (request) => inputDateFromValue(request.startAt) === initialDate,
  );
  const pendingRequests = reservationRequests.filter(
    (request) => request.status === "PENDENTE",
  );
  const approvedRequests = reservationRequests.filter(
    (request) => request.status === "APROVADA",
  );
  const rejectedRequests = reservationRequests.filter(
    (request) => request.status === "RECUSADA",
  );
  const todayApprovedRequests = todayRequests.filter(
    (request) => request.status === "APROVADA",
  );
  const todayPendingRequests = todayRequests.filter(
    (request) => request.status === "PENDENTE",
  );
  const currentRequests = todayRequests.filter((request) => {
    const startMinutes = minutesFromDateTime(request.startAt);
    const endMinutes = minutesFromDateTime(request.endAt);

    return (
      ["PENDENTE", "APROVADA"].includes(request.status) &&
      startMinutes <= nowMinutes &&
      endMinutes >= nowMinutes
    );
  });
  const occupiedTodaySpaceIds = new Set(
    todayRequests
      .filter((request) => ["PENDENTE", "APROVADA"].includes(request.status))
      .map((request) => request.space.id),
  );
  const occupiedNowSpaceIds = new Set(
    currentRequests.map((request) => request.space.id),
  );
  const availableTodaySpaces = Math.max(spaces.length - occupiedTodaySpaceIds.size, 0);
  const availableNowSpaces = Math.max(spaces.length - occupiedNowSpaceIds.size, 0);
  const adminQueueRequests = pendingRequests.filter(
    (request) => !request.assignedApprover,
  );
  const filteredApprovedRequests = todayRequests.filter(
    (request) => request.status === "APROVADA",
  );
  const filteredPendingRequests = todayRequests.filter(
    (request) => request.status === "PENDENTE",
  );

  return (
    <>
      <section className="metrics-grid" aria-label="Resumo operacional">
        <Metric icon={CalendarDays} label="Reservas hoje" value={todayApprovedRequests.length} />
        <Metric icon={Clock3} label="Pendentes hoje" value={todayPendingRequests.length} />
        <Metric icon={DoorOpen} label="Livres agora" value={availableNowSpaces} />
        <Metric icon={Building2} label="Ocupados agora" value={occupiedNowSpaceIds.size} />
      </section>

      <section className="daily-grid">
        <section className="today-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Agora</p>
              <h2>Ambientes em uso neste momento</h2>
            </div>
            <CalendarDays size={22} />
          </div>

          <div className="today-list">
            {currentRequests.length === 0 && (
              <p className="empty-state">
                Nenhum ambiente aparece ocupado neste momento.
              </p>
            )}

            {currentRequests.slice(0, 6).map((request) => (
              <TodayMainItem
                key={request.id}
                request={request}
                nowMinutes={nowMinutes}
              />
            ))}
          </div>
        </section>

        <aside className="context-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Sua area</p>
              <h2>Acoes importantes</h2>
            </div>
            <LayoutDashboard size={22} />
          </div>

          <div className="action-stack">
            <Link className="quick-action primary" href="/nova-solicitacao">
              <Send size={18} />
              <span>
                <strong>Nova solicitacao</strong>
                <small>Encontrar ambiente e enviar para aprovacao</small>
              </span>
            </Link>
            <Link className="quick-action" href="/aprovacoes">
              <Check size={18} />
              <span>
                <strong>Fila de aprovacao</strong>
                <small>{pendingRequests.length} solicitacao(oes) aguardando decisao</small>
              </span>
            </Link>
            <Link className="quick-action" href="/agenda">
              <CalendarDays size={18} />
              <span>
                <strong>Agenda completa</strong>
                <small>Ver reservas recentes e seus status</small>
              </span>
            </Link>
          </div>

          <div className="alert-box">
            <span>Fila administrativa geral</span>
            <strong>{adminQueueRequests.length}</strong>
            <p>
              Solicitacoes de cursos sem aprovador configurado aparecem aqui para
              tratamento administrativo.
            </p>
          </div>
        </aside>
      </section>

      <section className="dashboard-lists">
        <section className="today-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Confirmadas</p>
              <h2>Reservas aprovadas do dia</h2>
            </div>
            <Check size={22} />
          </div>

          <div className="today-list">
            {filteredApprovedRequests.length === 0 && (
              <p className="empty-state">Nenhuma reserva aprovada para hoje.</p>
            )}
            {filteredApprovedRequests.map((request) => (
              <TodayCompactItem
                key={request.id}
                request={request}
                nowMinutes={nowMinutes}
              />
            ))}
          </div>
        </section>

        <section className="today-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Em analise</p>
              <h2>Solicitacoes pendentes do dia</h2>
            </div>
            <Clock3 size={22} />
          </div>

          <div className="today-list">
            {filteredPendingRequests.length === 0 && (
              <p className="empty-state">Nenhuma pendencia para hoje.</p>
            )}
            {filteredPendingRequests.map((request) => (
              <TodayCompactItem
                key={request.id}
                request={request}
                nowMinutes={nowMinutes}
              />
            ))}
          </div>
        </section>
      </section>

      <section className="metrics-grid compact" aria-label="Resumo geral">
        <Metric icon={Clock3} label="Pendentes totais" value={pendingRequests.length} />
        <Metric icon={Check} label="Aprovadas totais" value={approvedRequests.length} />
        <Metric icon={X} label="Recusadas totais" value={rejectedRequests.length} />
        <Metric icon={DoorOpen} label="Livres no dia" value={availableTodaySpaces} />
      </section>
    </>
  );
}

function TodayMainItem({
  request,
  nowMinutes,
}: {
  request: ReservationRequest;
  nowMinutes: number;
}) {
  const operationalStatus = getDailyOperationalStatus(request, nowMinutes);

  return (
    <article className={`today-item ${operationalStatus.className}`}>
      <div className="today-time">
        <Clock3 size={16} />
        <strong>{formatTimeRange(request.startAt, request.endAt)}</strong>
      </div>
      <div>
        <span className={`status-pill ${operationalStatus.className}`}>
          {operationalStatus.label}
        </span>
        <h3>{request.space.name}</h3>
        <p>
          {request.course.code} - {request.discipline.name} -{" "}
          {request.classGroup.name}
        </p>
      </div>
      <div className="today-owner">
        <span>Docente</span>
        <strong>{request.requester.name}</strong>
      </div>
    </article>
  );
}

function TodayCompactItem({
  request,
  nowMinutes,
}: {
  request: ReservationRequest;
  nowMinutes: number;
}) {
  const operationalStatus = getDailyOperationalStatus(request, nowMinutes);

  return (
    <article className={`compact-day-item ${operationalStatus.className}`}>
      <div>
        <span className={`status-pill ${operationalStatus.className}`}>
          {operationalStatus.label}
        </span>
        <h3>{request.space.name}</h3>
        <p>
          {request.course.code} - {request.discipline.name} -{" "}
          {request.classGroup.name} ({statusLabels[request.status]})
        </p>
      </div>
      <strong>{formatTimeRange(request.startAt, request.endAt)}</strong>
    </article>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
}) {
  return (
    <article className="metric">
      <Icon size={20} />
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}
