"use client";

import {
  Building2,
  CalendarDays,
  Check,
  Clock3,
  DoorOpen,
  LayoutDashboard,
  MapPin,
  Maximize2,
  Minimize2,
  Send,
  Users,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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
  currentUser,
  initialDate,
  reservationRequests,
  spaces,
}: ReservationWorkspaceProps) {
  const [now, setNow] = useState(() => new Date());
  const [isFullscreenPanelOpen, setIsFullscreenPanelOpen] = useState(false);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    function syncFullscreenState() {
      if (!document.fullscreenElement) {
        setIsFullscreenPanelOpen(false);
      }
    }

    document.addEventListener("fullscreenchange", syncFullscreenState);
    return () => document.removeEventListener("fullscreenchange", syncFullscreenState);
  }, []);

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
  const canAccessApprovals = ["APROVADOR", "ADMIN"].includes(currentUser.role);
  const publicPanelRequests = useMemo(
    () =>
      todayApprovedRequests
        .filter((request) => minutesFromDateTime(request.endAt) >= nowMinutes)
        .sort(
          (firstRequest, secondRequest) =>
            new Date(firstRequest.startAt).getTime() -
            new Date(secondRequest.startAt).getTime(),
        ),
    [nowMinutes, todayApprovedRequests],
  );

  async function openFullscreenPanel() {
    setIsFullscreenPanelOpen(true);

    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen().catch(() => undefined);
    }
  }

  return (
    <>
      <section className="dashboard-display-control" aria-label="Painel publico">
        <div>
          <p className="eyebrow">Modo exibicao</p>
          <h2>Painel em tempo real</h2>
        </div>
        <button
          type="button"
          className="dashboard-display-button"
          onClick={openFullscreenPanel}
        >
          <Maximize2 size={18} />
          Tela cheia
        </button>
      </section>

      {isFullscreenPanelOpen && (
        <FullscreenDashboardPanel
          now={now}
          nowMinutes={nowMinutes}
          requests={publicPanelRequests}
          spacesCount={spaces.length}
          onClose={() => {
            setIsFullscreenPanelOpen(false);
            if (document.fullscreenElement) {
              document.exitFullscreen().catch(() => undefined);
            }
          }}
        />
      )}

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
            {canAccessApprovals && (
              <Link className="quick-action" href="/aprovacoes">
                <Check size={18} />
                <span>
                  <strong>Fila de aprovacao</strong>
                  <small>{pendingRequests.length} solicitacao(oes) aguardando decisao</small>
                </span>
              </Link>
            )}
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

function FullscreenDashboardPanel({
  now,
  nowMinutes,
  requests,
  spacesCount,
  onClose,
}: {
  now: Date;
  nowMinutes: number;
  requests: ReservationRequest[];
  spacesCount: number;
  onClose: () => void;
}) {
  const currentRequests = requests.filter((request) => {
    const startMinutes = minutesFromDateTime(request.startAt);
    const endMinutes = minutesFromDateTime(request.endAt);

    return startMinutes <= nowMinutes && endMinutes >= nowMinutes;
  });
  const upcomingRequests = requests.filter(
    (request) => minutesFromDateTime(request.startAt) > nowMinutes,
  );
  const occupiedSpaceIds = new Set(currentRequests.map((request) => request.space.id));
  const formattedDate = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(now);
  const formattedTime = new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(now);

  return (
    <section className="fullscreen-dashboard" aria-label="Painel publico de reservas">
      <header className="fullscreen-dashboard-header">
        <div>
          <p className="eyebrow">Reservas de hoje</p>
          <h1>Painel em tempo real</h1>
          <span>{formattedDate}</span>
        </div>
        <div className="fullscreen-dashboard-clock">
          <strong>{formattedTime}</strong>
          <button type="button" onClick={onClose} aria-label="Sair da tela cheia">
            <Minimize2 size={22} />
          </button>
        </div>
      </header>

      <div className="fullscreen-dashboard-summary" aria-label="Resumo do painel">
        <article>
          <span>Em andamento</span>
          <strong>{currentRequests.length}</strong>
        </article>
        <article>
          <span>Proximas</span>
          <strong>{upcomingRequests.length}</strong>
        </article>
        <article>
          <span>Ambientes livres</span>
          <strong>{Math.max(spacesCount - occupiedSpaceIds.size, 0)}</strong>
        </article>
      </div>

      <div className="fullscreen-dashboard-grid">
        <section>
          <div className="fullscreen-section-heading">
            <h2>Ocorrendo agora</h2>
            <span>{currentRequests.length} reserva(s)</span>
          </div>
          <div className="fullscreen-reservation-list">
            {currentRequests.length === 0 && (
              <p className="fullscreen-empty-state">Nenhuma reserva em andamento.</p>
            )}
            {currentRequests.map((request) => (
              <FullscreenReservationCard
                key={request.id}
                request={request}
                nowMinutes={nowMinutes}
              />
            ))}
          </div>
        </section>

        <section>
          <div className="fullscreen-section-heading">
            <h2>Proximas reservas</h2>
            <span>{upcomingRequests.length} reserva(s)</span>
          </div>
          <div className="fullscreen-reservation-list">
            {upcomingRequests.length === 0 && (
              <p className="fullscreen-empty-state">Nao ha novas reservas previstas para hoje.</p>
            )}
            {upcomingRequests.slice(0, 8).map((request) => (
              <FullscreenReservationCard
                key={request.id}
                request={request}
                nowMinutes={nowMinutes}
              />
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}

function FullscreenReservationCard({
  request,
  nowMinutes,
}: {
  request: ReservationRequest;
  nowMinutes: number;
}) {
  const operationalStatus = getDailyOperationalStatus(request, nowMinutes);

  return (
    <article className={`fullscreen-reservation-card ${operationalStatus.className}`}>
      <div className="fullscreen-reservation-time">
        <Clock3 size={20} />
        <strong>{formatTimeRange(request.startAt, request.endAt)}</strong>
      </div>
      <div className="fullscreen-reservation-main">
        <span className={`status-pill ${operationalStatus.className}`}>
          {operationalStatus.label}
        </span>
        <h3>{request.space.name}</h3>
        <p>
          {request.course.code} - {request.discipline.name} - {request.classGroup.name}
        </p>
      </div>
      <div className="fullscreen-reservation-meta">
        <span>
          <MapPin size={16} />
          {request.space.location}
        </span>
        <span>
          <Users size={16} />
          {request.estimatedStudents} alunos
        </span>
      </div>
    </article>
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
