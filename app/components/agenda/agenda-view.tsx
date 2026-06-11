"use client";

import { CalendarDays } from "lucide-react";
import { useState } from "react";
import {
  formatDateTime,
  getDailyOperationalStatus,
  inputDateFromValue,
} from "../reservations/date-utils";
import type { ReservationWorkspaceProps } from "../reservations/types";

export function AgendaPageView({
  initialDate,
  reservationRequests,
}: ReservationWorkspaceProps) {
  const [dateFilter, setDateFilter] = useState(initialDate);
  const [statusFilter, setStatusFilter] = useState("TODOS");
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const filteredRequests = reservationRequests.filter((request) => {
    const dateMatches = inputDateFromValue(request.startAt) === dateFilter;
    const statusMatches = statusFilter === "TODOS" || request.status === statusFilter;

    return dateMatches && statusMatches;
  });

  return (
    <section className="calendar-panel single-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Calendario</p>
          <h2>Agenda recente</h2>
        </div>
        <CalendarDays size={22} />
      </div>

      <div className="agenda-controls">
        <label>
          Data
          <input
            type="date"
            value={dateFilter}
            onChange={(event) => setDateFilter(event.target.value)}
          />
        </label>
        <div className="segmented-group">
          {[
            ["TODOS", "Todos"],
            ["APROVADA", "Aprovadas"],
            ["PENDENTE", "Pendentes"],
            ["RECUSADA", "Recusadas"],
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

      <div className="timeline">
        {filteredRequests.length === 0 && (
          <p className="empty-state">Nenhuma reserva encontrada para este filtro.</p>
        )}

        {filteredRequests.map((request) => {
          const operationalStatus = getDailyOperationalStatus(request, nowMinutes);

          return (
            <article className={`timeline-item ${operationalStatus.className}`} key={request.id}>
              <span className={`timeline-dot ${operationalStatus.className}`} />
              <div>
                <strong>{request.space.name}</strong>
                <span>{formatDateTime(request.startAt)}</span>
                <p>
                  {request.course.code} - {request.discipline.name} (
                  {operationalStatus.label})
                </p>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
