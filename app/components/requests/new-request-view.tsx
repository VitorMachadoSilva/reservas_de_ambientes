"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  GraduationCap,
  Info,
  Lock,
  Send,
  X,
} from "lucide-react";
import { createReservationRequest } from "../../actions";
import { PendingButton } from "../pending-button";

type Entity = {
  id?: string;
  name?: string;
  code?: string;
  email?: string;
  active?: boolean;
  type?: string;
  capacity?: number;
  location?: string;
  resources?: Entity[];
  courseId?: string;
};

type ReservationStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED" | "EXPIRED";

type ReservationRequest = {
  id?: string;
  status?: ReservationStatus | string;
  date?: string | Date;
  startTime?: string;
  endTime?: string;
  startsAt?: string;
  endsAt?: string;
  spaceId?: string;
  space?: Entity | null;
};

type NewRequestViewProps = {
  courses?: Entity[];
  disciplines?: Entity[];
  classGroups?: Entity[];
  spaces?: Entity[];
  resources?: Entity[];
  reservationRequests?: ReservationRequest[];
  currentUser?: Entity & { role?: string };
  currentRequester?: Entity & { role?: string };
  initialDate?: string | Date;
  [key: string]: unknown;
};

const stepLabels = ["Dados academicos", "Criterios", "Ambiente", "Revisao"];
const timeSlots = [
  "07:00",
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
  "19:00",
  "20:00",
  "21:00",
  "22:00",
];

function entityName(entity?: Entity | null, fallback = "Nao informado") {
  return entity?.name || entity?.code || entity?.email || fallback;
}

function dateInputValue(value?: string | Date) {
  if (!value) return new Date().toISOString().slice(0, 10);
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 10);
  return date.toISOString().slice(0, 10);
}

function localDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function nextDayInputValue(now: number) {
  const date = new Date(now);
  date.setDate(date.getDate() + 1);
  return localDateInputValue(date);
}

function formatMinimumAdvanceLabel(now: number) {
  if (!now) return "Carregando regra de antecedencia...";
  const date = new Date(now + 24 * 60 * 60 * 1000);
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(date);
}

function combineDateTime(date: string, time: string) {
  return new Date(`${date}T${time}:00`);
}

function normalizeTime(value?: string) {
  if (!value) return "";
  if (value.includes("T")) return value.split("T")[1]?.slice(0, 5) || "";
  return value.slice(0, 5);
}

function normalizeDate(value?: string | Date) {
  return dateInputValue(value);
}

function overlaps(startA: string, endA: string, startB: string, endB: string) {
  return startA < endB && startB < endA;
}

function violatesMinimumAdvance(date: string, time: string, now: number, isAdmin: boolean) {
  if (isAdmin || !now || !date || !time) return false;
  return combineDateTime(date, time).getTime() - now < 24 * 60 * 60 * 1000;
}

function isExpired(request: ReservationRequest, now: number) {
  if (!now) return false;
  if ((request.status || "PENDING") !== "PENDING") return false;
  const date = normalizeDate(request.date);
  const start = normalizeTime(request.startTime || request.startsAt);
  if (!date || !start) return false;
  return combineDateTime(date, start).getTime() - now <= 60 * 60 * 1000;
}

function slotStatus(
  slot: string,
  date: string,
  requests: ReservationRequest[],
  selectedSpaceId: string,
  now: number
): "free" | "pending" | "approved" {
  const slotEnd = timeSlots[timeSlots.indexOf(slot) + 1] || "23:00";
  const activeRequests = requests.filter((request) => {
    const status = isExpired(request, now) ? "EXPIRED" : request.status;
    if (status !== "PENDING" && status !== "APPROVED") return false;
    if (normalizeDate(request.date) !== date) return false;
    const requestSpaceId = request.spaceId || request.space?.id || "";
    if (selectedSpaceId && requestSpaceId && requestSpaceId !== selectedSpaceId) return false;
    return overlaps(slot, slotEnd, normalizeTime(request.startTime || request.startsAt), normalizeTime(request.endTime || request.endsAt));
  });

  if (activeRequests.some((request) => request.status === "APPROVED")) return "approved";
  if (activeRequests.some((request) => request.status === "PENDING")) return "pending";
  return "free";
}

export function NewRequestPageView({
  courses = [],
  disciplines = [],
  classGroups = [],
  spaces = [],
  resources = [],
  reservationRequests = [],
  currentUser,
  currentRequester,
  initialDate,
}: NewRequestViewProps) {
  const requester = currentRequester || currentUser;
  const isAdmin = currentUser?.role === "ADMIN" || requester?.role === "ADMIN";
  const [step, setStep] = useState(0);
  const [courseId, setCourseId] = useState(courses[0]?.id || "");
  const [disciplineId, setDisciplineId] = useState(disciplines[0]?.id || "");
  const [classGroupId, setClassGroupId] = useState(classGroups[0]?.id || "");
  const [date, setDate] = useState(dateInputValue(initialDate));
  const [startTime, setStartTime] = useState("19:00");
  const [endTime, setEndTime] = useState("21:00");
  const [spaceType, setSpaceType] = useState("Laboratorio");
  const [selectedResourceIds, setSelectedResourceIds] = useState<string[]>([]);
  const [selectedSpaceId, setSelectedSpaceId] = useState("");
  const [purpose, setPurpose] = useState("");
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    setCurrentTime(Date.now());
  }, []);

  const minimumDate = currentTime && !isAdmin ? nextDayInputValue(currentTime) : "";
  const minimumAdvanceLabel = formatMinimumAdvanceLabel(currentTime);
  const violatesAdvanceRule = violatesMinimumAdvance(date, startTime, currentTime, isAdmin);
  const invalidTimeRange = startTime >= endTime;
  const selectedSpace = spaces.find((space) => space.id === selectedSpaceId);

  const visibleDisciplines = disciplines.filter((discipline) => !discipline.courseId || discipline.courseId === courseId);
  const visibleClassGroups = classGroups.filter((group) => !group.courseId || group.courseId === courseId);
  const recommendedSpaces = spaces.filter((space) => {
    if (space.active === false) return false;
    const matchesType = !spaceType || (space.type || "").toLowerCase() === spaceType.toLowerCase();
    const spaceResourceNames = new Set((space.resources || []).map((resource) => resource.id || resource.name));
    const hasResources = selectedResourceIds.every((id) => spaceResourceNames.has(id));
    return matchesType && hasResources;
  });
  const spacesToShow = recommendedSpaces.length > 0 ? recommendedSpaces : spaces.filter((space) => space.active !== false);
  const selectedSlotStatus = slotStatus(startTime, date, reservationRequests, selectedSpaceId, currentTime);
  const cannotSubmit =
    !courseId ||
    !disciplineId ||
    !classGroupId ||
    !selectedSpaceId ||
    !purpose.trim() ||
    violatesAdvanceRule ||
    invalidTimeRange ||
    selectedSlotStatus === "approved" ||
    selectedSlotStatus === "pending";

  function toggleResource(resourceId: string) {
    setSelectedResourceIds((current) =>
      current.includes(resourceId) ? current.filter((id) => id !== resourceId) : [...current, resourceId]
    );
  }

  function toggleSpace(spaceId?: string) {
    if (!spaceId) return;
    setSelectedSpaceId((current) => (current === spaceId ? "" : spaceId));
  }

  useEffect(() => {
    if (!minimumDate || date >= minimumDate) return;
    setDate(minimumDate);
  }, [date, minimumDate]);

  useEffect(() => {
    if (!currentTime) return;

    const currentStatus = slotStatus(startTime, date, reservationRequests, selectedSpaceId, currentTime);
    const currentBlocked =
      violatesMinimumAdvance(date, startTime, currentTime, isAdmin) ||
      currentStatus === "approved" ||
      currentStatus === "pending";

    if (!currentBlocked && startTime < endTime) return;

    const nextSlot = timeSlots.slice(0, -1).find((slot) => {
      const status = slotStatus(slot, date, reservationRequests, selectedSpaceId, currentTime);
      return !violatesMinimumAdvance(date, slot, currentTime, isAdmin) && status !== "approved" && status !== "pending";
    });

    if (!nextSlot) return;

    const nextIndex = timeSlots.indexOf(nextSlot);
    setStartTime(nextSlot);
    setEndTime(timeSlots[nextIndex + 1] || "23:00");
  }, [currentTime, date, endTime, isAdmin, reservationRequests, selectedSpaceId, startTime]);

  return (
    <section className="request-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Docente</span>
          <h1>Encontre um ambiente e envie para aprovacao</h1>
          <p>Preencha os dados, escolha um unico ambiente e acompanhe a avaliacao pela pagina Minhas Reservas.</p>
        </div>
      </div>

      <div className="request-grid">
        <form
          action={createReservationRequest}
          className="request-panel"
          onSubmit={(event) => {
            if (cannotSubmit) event.preventDefault();
          }}
        >
          <div className="step-tabs">
            {stepLabels.map((label, index) => (
              <button
                className={step === index ? "active" : ""}
                key={label}
                type="button"
                onClick={() => setStep(index)}
              >
                <span>{index + 1}</span>
                {label}
              </button>
            ))}
          </div>

          <input type="hidden" name="courseId" value={courseId} />
          <input type="hidden" name="disciplineId" value={disciplineId} />
          <input type="hidden" name="classGroupId" value={classGroupId} />
          <input type="hidden" name="spaceId" value={selectedSpaceId} />
          <input type="hidden" name="date" value={date} />
          <input type="hidden" name="startTime" value={startTime} />
          <input type="hidden" name="endTime" value={endTime} />
          <input type="hidden" name="type" value={spaceType} />
          <input type="hidden" name="purpose" value={purpose} />
          <input type="hidden" name="resourceIds" value={selectedResourceIds.join(",")} />
          <input type="hidden" name="userRole" value={isAdmin ? "ADMIN" : "DOCENTE"} />

          {step === 0 && (
            <div className="form-grid">
              <label>
                Curso
                <select value={courseId} onChange={(event) => setCourseId(event.target.value)}>
                  {courses.map((course) => (
                    <option key={course.id || entityName(course)} value={course.id || entityName(course)}>
                      {entityName(course)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Disciplina
                <select value={disciplineId} onChange={(event) => setDisciplineId(event.target.value)}>
                  {visibleDisciplines.map((discipline) => (
                    <option key={discipline.id || entityName(discipline)} value={discipline.id || entityName(discipline)}>
                      {entityName(discipline)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Turma
                <select value={classGroupId} onChange={(event) => setClassGroupId(event.target.value)}>
                  {visibleClassGroups.map((group) => (
                    <option key={group.id || entityName(group)} value={group.id || entityName(group)}>
                      {entityName(group)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}

          {step === 1 && (
            <div className="criteria-stack">
              <div className="time-planner">
                <div className="time-planner-header">
                  <div>
                    <span className="eyebrow">Criterios</span>
                    <strong>Data, inicio e fim</strong>
                  </div>
                  <div className="time-legend">
                    <span><i className="free" /> Livre</span>
                    <span><i className="pending" /> Pendente</span>
                    <span><i className="approved" /> Reservado</span>
                    <span><i className="locked" /> Menos de 24h</span>
                  </div>
                </div>

                {!isAdmin && (
                  <div className="minimum-advance-card">
                    <Lock size={16} />
                    <div>
                      <strong>Primeiro horario permitido: {minimumAdvanceLabel}</strong>
                      <span>Docentes so podem solicitar reservas com pelo menos 24 horas de antecedencia.</span>
                    </div>
                  </div>
                )}

                <div className="date-time-card">
                  <label>
                    <CalendarDays size={16} />
                    Data
                    <input
                      min={minimumDate || undefined}
                      type="date"
                      value={date}
                      onChange={(event) => setDate(event.target.value)}
                    />
                  </label>
                  <label>
                    <Clock3 size={16} />
                    Inicio
                    <select value={startTime} onChange={(event) => setStartTime(event.target.value)}>
                      {timeSlots.slice(0, -1).map((slot) => {
                        const status = slotStatus(slot, date, reservationRequests, selectedSpaceId, currentTime);
                        const advanceBlocked = violatesMinimumAdvance(date, slot, currentTime, isAdmin);
                        return (
                          <option
                            disabled={advanceBlocked || status === "approved" || status === "pending"}
                            key={slot}
                            value={slot}
                          >
                            {slot}{" "}
                            {advanceBlocked
                              ? "- menos de 24h"
                              : status === "pending"
                                ? "- pendente"
                                : status === "approved"
                                  ? "- reservado"
                                  : ""}
                          </option>
                        );
                      })}
                    </select>
                  </label>
                  <label>
                    <Clock3 size={16} />
                    Fim
                    <select value={endTime} onChange={(event) => setEndTime(event.target.value)}>
                      {timeSlots.slice(1).map((slot) => (
                        <option disabled={slot <= startTime} key={slot} value={slot}>
                          {slot}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="slot-grid">
                  {timeSlots.slice(0, -1).map((slot) => {
                    const status = slotStatus(slot, date, reservationRequests, selectedSpaceId, currentTime);
                    const advanceBlocked = violatesMinimumAdvance(date, slot, currentTime, isAdmin);
                    const active = slot === startTime;
                    return (
                      <button
                        className={`slot-chip ${advanceBlocked ? "locked" : status} ${active ? "active" : ""}`}
                        disabled={advanceBlocked || status === "approved" || status === "pending"}
                        key={slot}
                        type="button"
                        onClick={() => {
                          setStartTime(slot);
                          setEndTime(timeSlots[timeSlots.indexOf(slot) + 1] || "23:00");
                        }}
                      >
                        {slot}
                      </button>
                    );
                  })}
                </div>

                {violatesAdvanceRule && (
                  <div className="inline-warning">
                    <Lock size={16} />
                    Docentes precisam solicitar reservas com pelo menos 24 horas de antecedencia.
                  </div>
                )}
                {(selectedSlotStatus === "approved" || selectedSlotStatus === "pending") && (
                  <div className="inline-warning danger">
                    <AlertTriangle size={16} />
                    Este horario ja esta bloqueado para o ambiente selecionado.
                  </div>
                )}
              </div>

              <div className="form-grid">
                <label>
                  Tipo de ambiente
                  <select value={spaceType} onChange={(event) => setSpaceType(event.target.value)}>
                    <option>Laboratorio</option>
                    <option>Sala</option>
                    <option>Auditorio</option>
                  </select>
                </label>
              </div>
              <div className="resource-picker">
                <span>Recursos desejados</span>
                <div>
                  {resources.map((resource) => {
                    const id = resource.id || entityName(resource);
                    return (
                      <button
                        className={selectedResourceIds.includes(id) ? "active" : ""}
                        key={id}
                        type="button"
                        onClick={() => toggleResource(id)}
                      >
                        {entityName(resource)}
                      </button>
                    );
                  })}
                </div>
              </div>
              <label className="full-field">
                Finalidade
                <textarea value={purpose} onChange={(event) => setPurpose(event.target.value)} name="objective" />
              </label>
            </div>
          )}

          {step === 2 && (
            <div className="space-choice-list compact">
              {spacesToShow.map((space) => {
                const isSelected = selectedSpaceId === space.id;
                const isDisabled = Boolean(selectedSpaceId && !isSelected);
                const status = slotStatus(startTime, date, reservationRequests, space.id || "", currentTime);
                return (
                  <article className={`space-choice-card ${isSelected ? "selected" : ""} ${isDisabled ? "disabled" : ""}`} key={space.id || entityName(space)}>
                    <div>
                      <Building2 size={18} />
                      <section>
                        <strong>{entityName(space)}</strong>
                        <span>{space.location || space.type || "Ambiente cadastrado"}</span>
                      </section>
                    </div>
                    <div className="space-choice-meta">
                      {space.capacity ? <span>{space.capacity} lugares</span> : null}
                      <span className={`availability-dot ${status}`}>{status === "approved" ? "Reservado" : status === "pending" ? "Pendente" : "Livre"}</span>
                    </div>
                    <button
                      className={isSelected ? "selected-action" : ""}
                      disabled={isDisabled || status === "approved" || status === "pending"}
                      type="button"
                      onClick={() => toggleSpace(space.id)}
                    >
                      {isSelected ? (
                        <>
                          <CheckCircle2 size={16} />
                          Selecionado
                        </>
                      ) : (
                        "Escolher"
                      )}
                    </button>
                  </article>
                );
              })}
            </div>
          )}

          {step === 3 && (
            <div className="review-box">
              <Info size={18} />
              <div>
                <strong>{selectedSpace ? entityName(selectedSpace) : "Nenhum ambiente selecionado"}</strong>
                <p>
                  {date} das {startTime} as {endTime}. A solicitacao sera enviada para aprovacao e bloqueara o horario
                  provisoriamente enquanto estiver pendente.
                </p>
                {cannotSubmit && (
                  <small>
                    Verifique ambiente, finalidade, antecedencia minima e disponibilidade antes de enviar.
                  </small>
                )}
              </div>
            </div>
          )}

          <div className="wizard-actions">
            <button disabled={step === 0} type="button" onClick={() => setStep((current) => Math.max(0, current - 1))}>
              Voltar
            </button>
            {step < 3 ? (
              <button type="button" onClick={() => setStep((current) => Math.min(3, current + 1))}>
                Continuar
              </button>
            ) : (
              <PendingButton className="primary-action" disabled={cannotSubmit} pendingText="Enviando...">
                <Send size={16} />
                Enviar solicitacao
              </PendingButton>
            )}
          </div>
        </form>

        <aside className="recommendation-panel">
          <span className="eyebrow">Recomendacao</span>
          <h2>Ambientes encontrados</h2>
          <p>O sistema sugere opcoes, mas o docente escolhe qual ambiente deseja solicitar.</p>
          {selectedSpace ? (
            <div className="selected-space-summary">
              <CheckCircle2 size={18} />
              <div>
                <strong>{entityName(selectedSpace)}</strong>
                <span>Selecionado para esta solicitacao</span>
              </div>
              <button type="button" onClick={() => setSelectedSpaceId("")}>
                <X size={15} />
                Remover
              </button>
            </div>
          ) : (
            <div className="empty-state compact">Escolha um ambiente na etapa Ambiente.</div>
          )}
        </aside>
      </div>
    </section>
  );
}

export const NewRequestView = NewRequestPageView;

export default NewRequestPageView;
