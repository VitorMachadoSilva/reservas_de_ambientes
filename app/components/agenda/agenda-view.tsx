"use client";

import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  formatDateTime,
  getDailyOperationalStatus,
  inputDateFromValue,
} from "../reservations/date-utils";
import type { ReservationRequest, ReservationWorkspaceProps } from "../reservations/types";

const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];
const reservationStatusOrder = ["programada", "pendente", "recusada", "cancelada", "expirada"] as const;

type CalendarReservationStatus = (typeof reservationStatusOrder)[number];

function parseInputDate(value: string) {
  return new Date(`${value}T00:00:00`);
}

function formatInputDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatReadableDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(parseInputDate(value));
}

function formatMonthTitle(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(date);
}

type AgendaDatePickerProps = {
  value: string;
  reservationStatusesByDate: Map<string, CalendarReservationStatus[]>;
  onChange: (date: string) => void;
};

function calendarStatusFromRequest(status: ReservationRequest["status"]): CalendarReservationStatus {
  if (status === "PENDENTE") return "pendente";
  if (status === "RECUSADA") return "recusada";
  if (status === "CANCELADA") return "cancelada";
  if (status === "EXPIRADA") return "expirada";

  return "programada";
}

function AgendaDatePicker({ value, reservationStatusesByDate, onChange }: AgendaDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => parseInputDate(value));
  const pickerRef = useRef<HTMLDivElement>(null);
  const selectedDate = parseInputDate(value);
  const today = formatInputDate(new Date());

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!pickerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const calendarDays = useMemo(() => {
    const year = visibleMonth.getFullYear();
    const month = visibleMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    return [
      ...Array.from({ length: firstDay }, () => null),
      ...Array.from({ length: daysInMonth }, (_, index) => new Date(year, month, index + 1)),
    ];
  }, [visibleMonth]);

  const moveMonth = (offset: number) => {
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  };

  const selectDate = (date: Date) => {
    onChange(formatInputDate(date));
    setIsOpen(false);
  };

  return (
    <div className="agenda-date-picker" ref={pickerRef}>
      <span>Data</span>
      <button
        type="button"
        className="agenda-date-trigger"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        onClick={() => {
          setVisibleMonth(selectedDate);
          setIsOpen((current) => !current);
        }}
      >
        <strong>{formatReadableDate(value)}</strong>
        <CalendarDays size={18} />
      </button>

      {isOpen && (
        <div className="agenda-calendar-popover" role="dialog" aria-label="Selecionar data">
          <div className="agenda-calendar-header">
            <button type="button" aria-label="Mes anterior" onClick={() => moveMonth(-1)}>
              <ChevronLeft size={18} />
            </button>
            <strong>{formatMonthTitle(visibleMonth)}</strong>
            <button type="button" aria-label="Proximo mes" onClick={() => moveMonth(1)}>
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="agenda-calendar-weekdays">
            {weekDays.map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>

          <div className="agenda-calendar-grid">
            {calendarDays.map((date, index) => {
              if (!date) return <span className="agenda-calendar-empty" key={`empty-${index}`} />;

              const inputDate = formatInputDate(date);
              const dayStatuses = reservationStatusesByDate.get(inputDate) ?? [];
              const hasReservation = dayStatuses.length > 0;
              const isSelected = inputDate === value;
              const isToday = inputDate === today;

              return (
                <button
                  type="button"
                  key={inputDate}
                  className={[
                    "agenda-calendar-day",
                    hasReservation ? "has-reservation" : "",
                    isSelected ? "selected" : "",
                    isToday ? "today" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  aria-pressed={isSelected}
                  aria-label={`${date.getDate()} de ${formatMonthTitle(date)}${
                    hasReservation ? ", possui reserva" : ""
                  }`}
                  onClick={() => selectDate(date)}
                >
                  <span>{date.getDate()}</span>
                  {hasReservation && (
                    <span className="agenda-calendar-markers" aria-hidden="true">
                      {dayStatuses.map((status) => (
                        <span className={`agenda-calendar-marker ${status}`} key={status} />
                      ))}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export function AgendaPageView({
  initialDate,
  reservationRequests,
}: ReservationWorkspaceProps) {
  const [dateFilter, setDateFilter] = useState(initialDate);
  const [statusFilter, setStatusFilter] = useState("TODOS");
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const reservationStatusesByDate = useMemo(() => {
    const statusesByDate = new Map<string, Set<CalendarReservationStatus>>();

    reservationRequests.forEach((request) => {
      const date = inputDateFromValue(request.startAt);
      const statuses = statusesByDate.get(date) ?? new Set<CalendarReservationStatus>();

      statuses.add(calendarStatusFromRequest(request.status));
      statusesByDate.set(date, statuses);
    });

    return new Map(
      [...statusesByDate.entries()].map(([date, statuses]) => [
        date,
        reservationStatusOrder.filter((status) => statuses.has(status)),
      ]),
    );
  }, [reservationRequests]);
  const filteredRequests = reservationRequests.filter((request) => {
    const dateMatches = inputDateFromValue(request.startAt) === dateFilter;
    const statusMatches =
      statusFilter === "TODOS" ||
      request.status === statusFilter ||
      (statusFilter === "RECUSADA" && request.status === "EXPIRADA");

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
        <AgendaDatePicker
          value={dateFilter}
          reservationStatusesByDate={reservationStatusesByDate}
          onChange={setDateFilter}
        />
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
