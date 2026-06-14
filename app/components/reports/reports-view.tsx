"use client";

import { useMemo, useState } from "react";
import {
  BarChart3,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  ShieldAlert,
  TrendingUp,
  XCircle,
} from "lucide-react";

type Entity = {
  id?: string;
  name?: string;
  code?: string;
  email?: string;
  role?: string;
};

type ReservationRequest = {
  id?: string;
  status?: string;
  date?: string | Date;
  startTime?: string;
  endTime?: string;
  startsAt?: string;
  endsAt?: string;
  spaceId?: string;
  courseId?: string;
  requesterId?: string;
  space?: Entity | null;
  course?: Entity | null;
  requester?: Entity | null;
};

type ReportsPageViewProps = {
  reservationRequests?: ReservationRequest[];
  requests?: ReservationRequest[];
  courses?: Entity[];
  spaces?: Entity[];
  currentUser?: Entity | null;
  [key: string]: unknown;
};

const periodOptions = [
  { value: "30", label: "30 dias" },
  { value: "90", label: "90 dias" },
  { value: "180", label: "180 dias" },
  { value: "365", label: "12 meses" },
] as const;

const statusLabels: Record<string, string> = {
  PENDING: "Pendentes",
  PENDENTE: "Pendentes",
  APPROVED: "Aprovadas",
  APROVADA: "Aprovadas",
  REJECTED: "Recusadas",
  RECUSADA: "Recusadas",
  CANCELLED: "Canceladas",
  CANCELADA: "Canceladas",
  EXPIRED: "Expiradas",
  EXPIRADA: "Expiradas",
};

const statusTones: Record<string, string> = {
  Pendentes: "warning",
  Aprovadas: "success",
  Recusadas: "danger",
  Canceladas: "muted",
  Expiradas: "danger",
};

function entityName(entity?: Entity | null, fallback = "Nao informado") {
  return entity?.name || entity?.code || entity?.email || fallback;
}

function normalizeStatus(status?: string) {
  return statusLabels[status || "PENDING"] || status || "Pendentes";
}

function dateValue(value?: string | Date) {
  if (!value) return null;
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return new Date(`${value.slice(0, 10)}T00:00:00`);
  }
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatPercent(value: number) {
  if (!Number.isFinite(value)) return "0%";
  return `${Math.round(value)}%`;
}

function countBy<T>(items: T[], getKey: (item: T) => string) {
  return items.reduce<Record<string, number>>((acc, item) => {
    const key = getKey(item);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function topEntries(record: Record<string, number>, limit = 5) {
  return Object.entries(record)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);
}

export function ReportsPageView({
  reservationRequests,
  requests,
  courses = [],
  spaces = [],
  currentUser,
}: ReportsPageViewProps) {
  const allRequests = requests ?? reservationRequests ?? [];
  const [period, setPeriod] = useState("90");
  const canViewReports = currentUser?.role === "ADMIN" || currentUser?.role === "APROVADOR";

  const filteredRequests = useMemo(() => {
    const days = Number(period);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    return allRequests.filter((request) => {
      const date = dateValue(request.date);
      return !date || date >= cutoff;
    });
  }, [allRequests, period]);

  const statusCounts = useMemo(() => {
    return countBy(filteredRequests, (request) => normalizeStatus(request.status));
  }, [filteredRequests]);

  const total = filteredRequests.length;
  const approved = statusCounts.Aprovadas || 0;
  const rejected = statusCounts.Recusadas || 0;
  const pending = statusCounts.Pendentes || 0;
  const expired = statusCounts.Expiradas || 0;
  const approvalRate = total > 0 ? (approved / total) * 100 : 0;
  const riskRate = total > 0 ? ((rejected + expired) / total) * 100 : 0;

  const spaceRanking = topEntries(
    countBy(filteredRequests, (request) => entityName(request.space, request.spaceId || "Sem ambiente"))
  );
  const courseRanking = topEntries(
    countBy(filteredRequests, (request) => entityName(request.course, request.courseId || "Sem curso"))
  );
  const requesterRanking = topEntries(
    countBy(filteredRequests, (request) => entityName(request.requester, request.requesterId || "Sem docente"))
  );
  const maxSpaceCount = Math.max(...spaceRanking.map(([, count]) => count), 1);
  const maxCourseCount = Math.max(...courseRanking.map(([, count]) => count), 1);
  const maxRequesterCount = Math.max(...requesterRanking.map(([, count]) => count), 1);

  if (!canViewReports) {
    return (
      <section className="reports-page">
        <div className="permission-state">
          <ShieldAlert size={24} />
          <div>
            <h1>Relatorios indisponiveis</h1>
            <p>Apenas aprovadores e administradores podem visualizar indicadores institucionais.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="reports-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Gestao</span>
          <h1>Relatorios</h1>
          <p>Analise reservas, gargalos de aprovacao, ambientes mais usados e comportamento das solicitacoes.</p>
        </div>
        <label className="report-period-select">
          Periodo
          <select value={period} onChange={(event) => setPeriod(event.target.value)}>
            {periodOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="report-kpi-grid">
        <article>
          <FileText size={19} />
          <span>Total de solicitacoes</span>
          <strong>{total}</strong>
        </article>
        <article>
          <CheckCircle2 size={19} />
          <span>Taxa de aprovacao</span>
          <strong>{formatPercent(approvalRate)}</strong>
        </article>
        <article>
          <Clock3 size={19} />
          <span>Pendentes</span>
          <strong>{pending}</strong>
        </article>
        <article>
          <XCircle size={19} />
          <span>Recusadas/expiradas</span>
          <strong>{formatPercent(riskRate)}</strong>
        </article>
      </div>

      <div className="reports-grid">
        <article className="report-panel">
          <div className="report-panel-header">
            <div>
              <span className="eyebrow">Status</span>
              <h2>Distribuicao das solicitacoes</h2>
            </div>
            <BarChart3 size={19} />
          </div>
          <div className="status-bars">
            {["Aprovadas", "Pendentes", "Recusadas", "Canceladas", "Expiradas"].map((label) => {
              const count = statusCounts[label] || 0;
              const width = total > 0 ? (count / total) * 100 : 0;

              return (
                <div className="status-bar-row" key={label}>
                  <div>
                    <span>{label}</span>
                    <strong>{count}</strong>
                  </div>
                  <div className="status-bar-track">
                    <span className={statusTones[label] || "muted"} style={{ width: `${width}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </article>

        <article className="report-panel">
          <div className="report-panel-header">
            <div>
              <span className="eyebrow">Ambientes</span>
              <h2>Mais solicitados</h2>
            </div>
            <Building2 size={19} />
          </div>
          <div className="ranking-list">
            {spaceRanking.length === 0 ? (
              <div className="empty-state compact">Nenhuma reserva no periodo.</div>
            ) : (
              spaceRanking.map(([name, count], index) => (
                <div className="ranking-item" key={name}>
                  <span>{index + 1}</span>
                  <div>
                    <strong>{name}</strong>
                    <div>
                      <i style={{ width: `${(count / maxSpaceCount) * 100}%` }} />
                    </div>
                  </div>
                  <small>{count}</small>
                </div>
              ))
            )}
          </div>
        </article>

        <article className="report-panel">
          <div className="report-panel-header">
            <div>
              <span className="eyebrow">Cursos</span>
              <h2>Maior demanda</h2>
            </div>
            <CalendarDays size={19} />
          </div>
          <div className="ranking-list">
            {courseRanking.length === 0 ? (
              <div className="empty-state compact">Nenhuma reserva no periodo.</div>
            ) : (
              courseRanking.map(([name, count], index) => (
                <div className="ranking-item" key={name}>
                  <span>{index + 1}</span>
                  <div>
                    <strong>{name}</strong>
                    <div>
                      <i style={{ width: `${(count / maxCourseCount) * 100}%` }} />
                    </div>
                  </div>
                  <small>{count}</small>
                </div>
              ))
            )}
          </div>
        </article>

        <article className="report-panel">
          <div className="report-panel-header">
            <div>
              <span className="eyebrow">Docentes</span>
              <h2>Quem mais solicita</h2>
            </div>
            <TrendingUp size={19} />
          </div>
          <div className="ranking-list">
            {requesterRanking.length === 0 ? (
              <div className="empty-state compact">Nenhuma reserva no periodo.</div>
            ) : (
              requesterRanking.map(([name, count], index) => (
                <div className="ranking-item" key={name}>
                  <span>{index + 1}</span>
                  <div>
                    <strong>{name}</strong>
                    <div>
                      <i style={{ width: `${(count / maxRequesterCount) * 100}%` }} />
                    </div>
                  </div>
                  <small>{count}</small>
                </div>
              ))
            )}
          </div>
        </article>
      </div>

      <div className="report-footnote">
        <ShieldAlert size={16} />
        <span>
          Relatorios sao indicadores de gestao. Nesta primeira versao eles usam as solicitacoes ja carregadas no sistema.
        </span>
      </div>
    </section>
  );
}

export const ReportsView = ReportsPageView;

export default ReportsPageView;
