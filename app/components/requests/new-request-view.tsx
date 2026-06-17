"use client";

import { Fragment, useEffect, useState } from "react";
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
  resources?: ResourceEntity[];
  courseId?: string;
};

type ResourceEntity = Entity | { resource: Entity };

type ReservationStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED" | "EXPIRED";

type ReservationRequest = {
  id?: string;
  status?: ReservationStatus | string;
  date?: string | Date;
  startTime?: string;
  endTime?: string;
  startAt?: string | Date;
  endAt?: string | Date;
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
const durationOptions = [
  { value: 60, label: "1 hora" },
  { value: 90, label: "1h30" },
  { value: 120, label: "2 horas" },
  { value: 180, label: "3 horas" },
  { value: 240, label: "4 horas" },
];
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const timePattern = /^\d{2}:\d{2}$/;
const positiveIntegerPattern = /^[1-9]\d*$/;
const purposePattern = /^[\s\S]{8,}$/;
const approvalDeadlineMinutes = 120;

function entityName(entity?: Entity | null, fallback = "Nao informado") {
  return entity?.name || entity?.code || entity?.email || fallback;
}

function resourceKey(resource: ResourceEntity) {
  if ("resource" in resource) return resource.resource.id || resource.resource.name;
  return resource.id || resource.name;
}

function resourceName(resource: ResourceEntity) {
  if ("resource" in resource) return entityName(resource.resource);
  return entityName(resource);
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

function requestDate(request: ReservationRequest) {
  return normalizeDate(request.date || request.startAt || request.startsAt);
}

function requestStartTime(request: ReservationRequest) {
  const value = request.startTime || request.startAt || request.startsAt;
  return normalizeTime(value instanceof Date ? value.toISOString() : value);
}

function requestEndTime(request: ReservationRequest) {
  const value = request.endTime || request.endAt || request.endsAt;
  return normalizeTime(value instanceof Date ? value.toISOString() : value);
}

function normalizeStatus(status?: string) {
  if (status === "PENDENTE") return "PENDING";
  if (status === "APROVADA") return "APPROVED";
  if (status === "RECUSADA") return "REJECTED";
  if (status === "CANCELADA") return "CANCELLED";
  if (status === "EXPIRADA") return "EXPIRED";
  return status || "PENDING";
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
  if (normalizeStatus(request.status) !== "PENDING") return false;
  const date = requestDate(request);
  const start = requestStartTime(request);
  if (!date || !start) return false;
  return combineDateTime(date, start).getTime() - now <= approvalDeadlineMinutes * 60 * 1000;
}

function addMinutesToTime(time: string, minutesToAdd: number) {
  const [hour, minute] = time.split(":").map(Number);
  const total = hour * 60 + minute + minutesToAdd;
  const nextHour = Math.floor(total / 60);
  const nextMinute = total % 60;

  return `${String(nextHour).padStart(2, "0")}:${String(nextMinute).padStart(2, "0")}`;
}

function rangeSlots(startTime: string, endTime: string) {
  return timeSlots
    .slice(0, -1)
    .filter((slot) => slot >= startTime && slot < endTime);
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
    const status = isExpired(request, now) ? "EXPIRED" : normalizeStatus(request.status);
    if (status !== "PENDING" && status !== "APPROVED") return false;
    if (requestDate(request) !== date) return false;
    const requestSpaceId = request.spaceId || request.space?.id || "";
    if (selectedSpaceId && requestSpaceId && requestSpaceId !== selectedSpaceId) return false;
    return overlaps(slot, slotEnd, requestStartTime(request), requestEndTime(request));
  });

  if (activeRequests.some((request) => normalizeStatus(request.status) === "APPROVED")) return "approved";
  if (activeRequests.some((request) => normalizeStatus(request.status) === "PENDING")) return "pending";
  return "free";
}

function rangeStatus(
  date: string,
  startTime: string,
  endTime: string,
  requests: ReservationRequest[],
  selectedSpaceId: string,
  now: number,
) {
  const statuses = rangeSlots(startTime, endTime).map((slot) =>
    slotStatus(slot, date, requests, selectedSpaceId, now),
  );

  if (statuses.includes("approved")) return "approved";
  if (statuses.includes("pending")) return "pending";
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
  const [durationMinutes, setDurationMinutes] = useState(120);
  const [spaceType, setSpaceType] = useState("Laboratorio");
  const [estimatedStudents, setEstimatedStudents] = useState("");
  const [selectedResourceIds, setSelectedResourceIds] = useState<string[]>([]);
  const [selectedSpaceId, setSelectedSpaceId] = useState("");
  const [purpose, setPurpose] = useState("");
  const [currentTime, setCurrentTime] = useState(0);
  const [submittedStepAttempt, setSubmittedStepAttempt] = useState<number | null>(null);

  useEffect(() => {
    setCurrentTime(Date.now());
  }, []);

  const minimumDate = currentTime && !isAdmin ? nextDayInputValue(currentTime) : "";
  const minimumAdvanceLabel = formatMinimumAdvanceLabel(currentTime);
  const violatesAdvanceRule = violatesMinimumAdvance(date, startTime, currentTime, isAdmin);
  const invalidTimeRange = startTime >= endTime;
  const studentsNumber = Number(estimatedStudents);
  const selectedSpace = spaces.find((space) => space.id === selectedSpaceId);

  const visibleDisciplines = disciplines.filter((discipline) => !discipline.courseId || discipline.courseId === courseId);
  const visibleClassGroups = classGroups.filter((group) => !group.courseId || group.courseId === courseId);
  const rankedSpaces = spaces
    .filter((space) => space.active !== false)
    .map((space) => {
      const status = rangeStatus(date, startTime, endTime, reservationRequests, space.id || "", currentTime);
      const matchesType = !spaceType || (space.type || "").toLowerCase() === spaceType.toLowerCase();
      const hasCapacity = !studentsNumber || !space.capacity || space.capacity >= studentsNumber;
      const spaceResourceIds = new Set((space.resources || []).map(resourceKey));
      const matchedResourceIds = selectedResourceIds.filter((id) => spaceResourceIds.has(id));
      const missingResourceNames = selectedResourceIds
        .filter((id) => !spaceResourceIds.has(id))
        .map((id) => resources.find((resource) => resource.id === id)?.name || id);
      const resourceScore =
        selectedResourceIds.length === 0
          ? 1
          : matchedResourceIds.length / selectedResourceIds.length;
      const score =
        (matchesType ? 30 : 0) +
        (hasCapacity ? 30 : 0) +
        Math.round(resourceScore * 40);
      const fullMatch =
        status === "free" &&
        matchesType &&
        hasCapacity &&
        matchedResourceIds.length === selectedResourceIds.length;
      const missingCriteria = [
        ...(!matchesType ? ["tipo de ambiente"] : []),
        ...(!hasCapacity ? ["capacidade"] : []),
        ...(status !== "free" ? ["disponibilidade no horario"] : []),
        ...missingResourceNames,
      ];

      return {
        ...space,
        availabilityStatus: status,
        fullMatch,
        matchedResourceIds,
        missingCriteria,
        score,
      };
    })
    .sort((a, b) => {
      if (a.availabilityStatus !== b.availabilityStatus) {
        return a.availabilityStatus === "free" ? -1 : 1;
      }
      if (a.fullMatch !== b.fullMatch) return a.fullMatch ? -1 : 1;
      return b.score - a.score || entityName(a).localeCompare(entityName(b));
    });
  const selectedSlotStatus = selectedSpaceId
    ? rangeStatus(date, startTime, endTime, reservationRequests, selectedSpaceId, currentTime)
    : "free";
  const stepErrors = [
    [
      !courseId ? "Selecione um curso." : "",
      !disciplineId ? "Selecione uma disciplina." : "",
      !classGroupId ? "Selecione uma turma." : "",
    ].filter(Boolean),
    [
      !datePattern.test(date) ? "Informe uma data valida." : "",
      !timePattern.test(startTime) || !timePattern.test(endTime)
        ? "Informe inicio e fim validos."
        : "",
      invalidTimeRange ? "O horario final precisa ser depois do inicio." : "",
      !positiveIntegerPattern.test(estimatedStudents)
        ? "Informe a quantidade estimada de alunos."
        : "",
      !purposePattern.test(purpose.trim())
        ? "Informe a finalidade com pelo menos 8 caracteres."
        : "",
      violatesAdvanceRule
        ? "Docentes precisam solicitar reservas com pelo menos 24 horas de antecedencia."
        : "",
    ].filter(Boolean),
    [
      !selectedSpaceId ? "Escolha um ambiente." : "",
      selectedSlotStatus === "approved" || selectedSlotStatus === "pending"
        ? "O ambiente escolhido nao esta livre durante todo o periodo."
        : "",
    ].filter(Boolean),
    [],
  ];
  const canOpenStep = (targetStep: number) =>
    stepErrors.slice(0, targetStep).every((errors) => errors.length === 0);
  const cannotSubmit =
    stepErrors.slice(0, 3).some((errors) => errors.length > 0);

  function showStepErrors(stepIndex: number) {
    return submittedStepAttempt === stepIndex && stepErrors[stepIndex].length > 0;
  }

  function toggleResource(resourceId: string) {
    setSelectedResourceIds((current) =>
      current.includes(resourceId) ? current.filter((id) => id !== resourceId) : [...current, resourceId]
    );
  }

  function toggleSpace(spaceId?: string) {
    if (!spaceId) return;
    setSelectedSpaceId((current) => (current === spaceId ? "" : spaceId));
  }

  function setStartAndDuration(nextStartTime: string, nextDuration = durationMinutes) {
    setStartTime(nextStartTime);
    setEndTime(addMinutesToTime(nextStartTime, nextDuration));
  }

  function changeDuration(nextDuration: number) {
    setDurationMinutes(nextDuration);
    setEndTime(addMinutesToTime(startTime, nextDuration));
  }

  function goToStep(nextStep: number) {
    if (nextStep <= step) {
      setStep(nextStep);
      return;
    }

    const firstInvalidStep = stepErrors.findIndex(
      (errors, index) => index < nextStep && errors.length > 0,
    );

    if (firstInvalidStep >= 0) {
      setSubmittedStepAttempt(firstInvalidStep);
      setStep(firstInvalidStep);
      return;
    }

    setSubmittedStepAttempt(null);
    setStep(nextStep);
  }

  useEffect(() => {
    if (!minimumDate || date >= minimumDate) return;
    setDate(minimumDate);
  }, [date, minimumDate]);

  useEffect(() => {
    if (!currentTime) return;

    const currentStatus = selectedSpaceId
      ? rangeStatus(date, startTime, endTime, reservationRequests, selectedSpaceId, currentTime)
      : "free";
    const currentBlocked =
      violatesMinimumAdvance(date, startTime, currentTime, isAdmin) ||
      currentStatus === "approved" ||
      currentStatus === "pending";

    if (!currentBlocked && startTime < endTime) return;

    const nextSlot = timeSlots.slice(0, -1).find((slot) => {
      const status = selectedSpaceId
        ? rangeStatus(date, slot, addMinutesToTime(slot, durationMinutes), reservationRequests, selectedSpaceId, currentTime)
        : slotStatus(slot, date, reservationRequests, selectedSpaceId, currentTime);
      return !violatesMinimumAdvance(date, slot, currentTime, isAdmin) && status !== "approved" && status !== "pending";
    });

    if (!nextSlot) return;

    setStartAndDuration(nextSlot);
  }, [currentTime, date, durationMinutes, endTime, isAdmin, reservationRequests, selectedSpaceId, startTime]);

  return (
    <section className="request-page">
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
                className={`${step === index ? "active" : ""} ${!canOpenStep(index) ? "blocked" : ""}`}
                disabled={!canOpenStep(index)}
                key={label}
                type="button"
                onClick={() => goToStep(index)}
              >
                <span>{index + 1}</span>
                {label}
              </button>
            ))}
          </div>

          <input type="hidden" name="requesterId" value={requester?.id || ""} />
          <input type="hidden" name="courseId" value={courseId} />
          <input type="hidden" name="disciplineId" value={disciplineId} />
          <input type="hidden" name="classGroupId" value={classGroupId} />
          <input type="hidden" name="spaceId" value={selectedSpaceId} />
          <input type="hidden" name="date" value={date} />
          <input type="hidden" name="startTime" value={startTime} />
          <input type="hidden" name="endTime" value={endTime} />
          <input type="hidden" name="estimatedStudents" value={estimatedStudents} />
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
              {showStepErrors(0) && (
                <div className="validation-alert">
                  <AlertTriangle size={16} />
                  <span>{stepErrors[0].join(" ")}</span>
                </div>
              )}
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
                    <select value={startTime} onChange={(event) => setStartAndDuration(event.target.value)}>
                      {timeSlots.slice(0, -1).map((slot) => {
                        const status = selectedSpaceId
                          ? rangeStatus(date, slot, addMinutesToTime(slot, durationMinutes), reservationRequests, selectedSpaceId, currentTime)
                          : slotStatus(slot, date, reservationRequests, selectedSpaceId, currentTime);
                        const advanceBlocked = violatesMinimumAdvance(date, slot, currentTime, isAdmin);
                        const durationBlocked = addMinutesToTime(slot, durationMinutes) > timeSlots[timeSlots.length - 1];
                        return (
                          <option
                            disabled={durationBlocked || advanceBlocked || status === "approved" || status === "pending"}
                            key={slot}
                            value={slot}
                          >
                            {slot}{" "}
                            {durationBlocked
                              ? "- duracao excede expediente"
                              : advanceBlocked
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
                    Duracao
                    <select
                      value={durationMinutes}
                      onChange={(event) => changeDuration(Number(event.target.value))}
                    >
                      {durationOptions.map((option) => (
                        <option
                          disabled={addMinutesToTime(startTime, option.value) > timeSlots[timeSlots.length - 1]}
                          key={option.value}
                          value={option.value}
                        >
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <Clock3 size={16} />
                    Fim
                    <input readOnly value={endTime} />
                  </label>
                </div>

                <div className="slot-grid">
                  {timeSlots.slice(0, -1).map((slot) => {
                    const status = selectedSpaceId
                      ? rangeStatus(date, slot, addMinutesToTime(slot, durationMinutes), reservationRequests, selectedSpaceId, currentTime)
                      : slotStatus(slot, date, reservationRequests, selectedSpaceId, currentTime);
                    const advanceBlocked = violatesMinimumAdvance(date, slot, currentTime, isAdmin);
                    const durationBlocked = addMinutesToTime(slot, durationMinutes) > timeSlots[timeSlots.length - 1];
                    const active = slot === startTime;
                    return (
                      <button
                        className={`slot-chip ${advanceBlocked ? "locked" : status} ${active ? "active" : ""}`}
                        disabled={durationBlocked || advanceBlocked || status === "approved" || status === "pending"}
                        key={slot}
                        type="button"
                        onClick={() => setStartAndDuration(slot)}
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
              <div className="form-grid">
                <label className={!positiveIntegerPattern.test(estimatedStudents) && showStepErrors(1) ? "field-invalid" : ""}>
                  Alunos estimados
                  <input
                    inputMode="numeric"
                    pattern={positiveIntegerPattern.source}
                    placeholder="Ex.: 32"
                    value={estimatedStudents}
                    onChange={(event) => setEstimatedStudents(event.target.value.replace(/\D/g, ""))}
                  />
                </label>
              </div>
              <label className="full-field">
                Finalidade
                <textarea
                  className={!purposePattern.test(purpose.trim()) && showStepErrors(1) ? "field-invalid" : ""}
                  value={purpose}
                  onChange={(event) => setPurpose(event.target.value)}
                  name="objective"
                  placeholder="Descreva a finalidade da reserva"
                />
              </label>
              {showStepErrors(1) && (
                <div className="validation-alert">
                  <AlertTriangle size={16} />
                  <span>{stepErrors[1].join(" ")}</span>
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-choice-list compact">
              {rankedSpaces.length === 0 && (
                <div className="empty-state compact">Nenhum ambiente ativo cadastrado.</div>
              )}
              {rankedSpaces.some((space) => space.fullMatch) && (
                <div className="match-section-label">Atendem 100% do pedido</div>
              )}
              {rankedSpaces.map((space, index) => {
                const isSelected = selectedSpaceId === space.id;
                const isDisabled = Boolean(selectedSpaceId && !isSelected);
                const status = space.availabilityStatus;
                const previousSpace = rankedSpaces[index - 1];
                const startsPartialSection =
                  !space.fullMatch && (!previousSpace || previousSpace.fullMatch);
                return (
                  <Fragment key={space.id || entityName(space)}>
                    {startsPartialSection && (
                      <div className="match-section-label partial">
                        Atendem parcialmente
                      </div>
                    )}
                    <article
                      className={`space-choice-card ${space.fullMatch ? "full-match" : "partial-match"} ${isSelected ? "selected" : ""} ${isDisabled ? "disabled" : ""}`}
                      key={space.id || entityName(space)}
                    >
                      <div>
                        <Building2 size={18} />
                        <section>
                          <strong>{entityName(space)}</strong>
                          <span>{space.location || space.type || "Ambiente cadastrado"}</span>
                          <div className="match-tags">
                            <span>{space.score}% aderente</span>
                            {space.fullMatch ? <span>100% do pedido</span> : null}
                            {space.matchedResourceIds.length > 0 ? (
                              <span>{space.matchedResourceIds.length} recurso(s)</span>
                            ) : null}
                          </div>
                          {!space.fullMatch && space.missingCriteria.length > 0 && (
                            <small>Falta: {space.missingCriteria.join(", ")}</small>
                          )}
                        </section>
                      </div>
                      <div className="space-choice-meta">
                        {space.capacity ? <span>{space.capacity} lugares</span> : null}
                        <span className={`availability-dot ${status}`}>
                          {status === "approved" ? "Reservado" : status === "pending" ? "Pendente" : "Livre"}
                        </span>
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
                  </Fragment>
                );
              })}
              {showStepErrors(2) && (
                <div className="validation-alert">
                  <AlertTriangle size={16} />
                  <span>{stepErrors[2].join(" ")}</span>
                </div>
              )}
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
            <button disabled={step === 0} type="button" onClick={() => goToStep(Math.max(0, step - 1))}>
              Voltar
            </button>
            {step < 3 ? (
              <button type="button" onClick={() => goToStep(Math.min(3, step + 1))}>
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
