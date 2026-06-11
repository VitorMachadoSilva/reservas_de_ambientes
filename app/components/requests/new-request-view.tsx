"use client";

import { createReservationRequest } from "@/app/actions";
import {
  Building2,
  Check,
  DoorOpen,
  Filter,
  GraduationCap,
  Send,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import { PendingButton } from "../pending-button";
import { spaceTypeLabels } from "../reservations/constants";
import { hasOverlap, parseDateTime } from "../reservations/date-utils";
import type { ReservationWorkspaceProps } from "../reservations/types";
import { CustomSelect } from "../ui/custom-select";

export function NewRequestPageView({
  classGroups,
  courses,
  currentRequester,
  disciplines,
  initialDate,
  reservationRequests,
  resources,
  spaces,
}: ReservationWorkspaceProps) {
  const [courseId, setCourseId] = useState(courses[0]?.id ?? "");
  const [selectedType, setSelectedType] = useState("LABORATORIO");
  const [date, setDate] = useState(initialDate);
  const [startTime, setStartTime] = useState("19:00");
  const [endTime, setEndTime] = useState("21:00");
  const [estimatedStudents, setEstimatedStudents] = useState("30");
  const [purpose, setPurpose] = useState("");
  const [selectedResourceIds, setSelectedResourceIds] = useState<string[]>([]);
  const [selectedSpaceId, setSelectedSpaceId] = useState("");
  const [disciplineId, setDisciplineId] = useState(
    disciplines.find((discipline) => discipline.courseId === courses[0]?.id)?.id ?? "",
  );
  const [classGroupId, setClassGroupId] = useState(
    classGroups.find((classGroup) => classGroup.courseId === courses[0]?.id)?.id ?? "",
  );
  const [requestStep, setRequestStep] = useState(1);

  const filteredDisciplines = disciplines.filter(
    (discipline) => discipline.courseId === courseId,
  );
  const filteredClassGroups = classGroups.filter(
    (classGroup) => classGroup.courseId === courseId,
  );
  const selectedCourse = courses.find((course) => course.id === courseId);
  const selectedDiscipline = disciplines.find(
    (discipline) => discipline.id === disciplineId,
  );
  const selectedClassGroup = classGroups.find(
    (classGroup) => classGroup.id === classGroupId,
  );
  const selectedSpace = spaces.find((space) => space.id === selectedSpaceId);
  const startAt = parseDateTime(date, startTime);
  const endAt = parseDateTime(date, endTime);
  const capacity = Number(estimatedStudents) || 0;
  const canAdvanceFromAcademic =
    Boolean(courseId && disciplineId && classGroupId) && capacity > 0;
  const canAdvanceFromCriteria = Boolean(
    date &&
      startTime &&
      endTime &&
      startAt &&
      endAt &&
      endAt > startAt &&
      purpose.trim().length > 0,
  );
  const canReview = Boolean(selectedSpaceId);
  const selectedResourceNames = resources
    .filter((resource) => selectedResourceIds.includes(resource.id))
    .map((resource) => resource.name);

  const recommendations = useMemo(() => {
    return spaces
      .map((space) => {
        const spaceResourceIds = space.resources.map(({ resource }) => resource.id);
        const missingResources = selectedResourceIds.filter(
          (resourceId) => !spaceResourceIds.includes(resourceId),
        );
        const hasConflict = reservationRequests.some((request) =>
          hasOverlap(request, space.id, startAt, endAt),
        );
        const typeMatches = !selectedType || space.type === selectedType;
        const capacityMatches = space.capacity >= capacity;
        const resourcesMatch = missingResources.length === 0;
        const compatible =
          !hasConflict && typeMatches && capacityMatches && resourcesMatch;
        const partial =
          !hasConflict && typeMatches && (!capacityMatches || !resourcesMatch);

        return {
          ...space,
          hasConflict,
          capacityMatches,
          resourcesMatch,
          level: compatible ? "COMPATIVEL" : partial ? "PARCIAL" : "INDISPONIVEL",
        };
      })
      .sort((a, b) => {
        const order: Record<string, number> = {
          COMPATIVEL: 0,
          PARCIAL: 1,
          INDISPONIVEL: 2,
        };
        return order[a.level] - order[b.level] || b.capacity - a.capacity;
      });
  }, [
    capacity,
    endAt,
    reservationRequests,
    selectedResourceIds,
    selectedType,
    spaces,
    startAt,
  ]);

  function toggleResource(resourceId: string) {
    setSelectedResourceIds((current) =>
      current.includes(resourceId)
        ? current.filter((id) => id !== resourceId)
        : [...current, resourceId],
    );
  }

  return (
    <section className="workspace-grid">
      <form className="request-panel" action={createReservationRequest}>
        <input type="hidden" name="requesterId" value={currentRequester.id} />
        <input type="hidden" name="courseId" value={courseId} />
        <input type="hidden" name="disciplineId" value={disciplineId} />
        <input type="hidden" name="classGroupId" value={classGroupId} />
        <input type="hidden" name="spaceId" value={selectedSpaceId} />

        <div className="section-heading">
          <div>
            <p className="eyebrow">Docente</p>
            <h2>Dados da solicitacao</h2>
          </div>
          <GraduationCap size={22} />
        </div>

        <div className="stepper" aria-label="Etapas da solicitacao">
          {[
            "Dados academicos",
            "Criterios",
            "Ambiente",
            "Revisao",
          ].map((label, index) => {
            const step = index + 1;
            const disabled =
              (step === 2 && !canAdvanceFromAcademic) ||
              (step === 3 && (!canAdvanceFromAcademic || !canAdvanceFromCriteria)) ||
              (step === 4 &&
                (!canAdvanceFromAcademic || !canAdvanceFromCriteria || !canReview));

            return (
              <button
                key={label}
                type="button"
                className={`step-button ${requestStep === step ? "active" : ""}`}
                disabled={disabled}
                onClick={() => setRequestStep(step)}
              >
                <span>{step}</span>
                <strong>{label}</strong>
              </button>
            );
          })}
        </div>

        <div className={`wizard-step ${requestStep === 1 ? "active" : ""}`}>
          <div className="field-grid">
            <CustomSelect
              label="Curso"
              value={courseId}
              options={courses.map((course) => ({
                value: course.id,
                label: course.name,
              }))}
              onChange={(nextCourseId) => {
                const nextDiscipline = disciplines.find(
                  (discipline) => discipline.courseId === nextCourseId,
                );
                const nextClassGroup = classGroups.find(
                  (classGroup) => classGroup.courseId === nextCourseId,
                );

                setCourseId(nextCourseId);
                setDisciplineId(nextDiscipline?.id ?? "");
                setClassGroupId(nextClassGroup?.id ?? "");
                setSelectedSpaceId("");
              }}
            />

            <CustomSelect
              label="Disciplina"
              value={disciplineId}
              options={filteredDisciplines.map((discipline) => ({
                value: discipline.id,
                label: discipline.name,
              }))}
              onChange={setDisciplineId}
            />

            <CustomSelect
              label="Turma"
              value={classGroupId}
              options={filteredClassGroups.map((classGroup) => ({
                value: classGroup.id,
                label: `${classGroup.name} - ${classGroup.period}`,
              }))}
              onChange={setClassGroupId}
            />

            <label>
              Alunos previstos
              <input
                name="estimatedStudents"
                type="number"
                min="1"
                value={estimatedStudents}
                onChange={(event) => setEstimatedStudents(event.target.value)}
                required
              />
            </label>
          </div>
        </div>

        <div className={`wizard-step ${requestStep === 2 ? "active" : ""}`}>
          <div className="field-grid">
            <label>
              Data
              <input
                name="date"
                type="date"
                value={date}
                onChange={(event) => {
                  setDate(event.target.value);
                  setSelectedSpaceId("");
                }}
                required
              />
            </label>

            <label>
              Inicio
              <input
                name="startTime"
                type="time"
                value={startTime}
                onChange={(event) => {
                  setStartTime(event.target.value);
                  setSelectedSpaceId("");
                }}
                required
              />
            </label>

            <label>
              Fim
              <input
                name="endTime"
                type="time"
                value={endTime}
                onChange={(event) => {
                  setEndTime(event.target.value);
                  setSelectedSpaceId("");
                }}
                required
              />
            </label>

            <CustomSelect
              label="Tipo de ambiente"
              value={selectedType}
              options={[
                { value: "LABORATORIO", label: "Laboratorio" },
                { value: "SALA", label: "Sala" },
                { value: "AUDITORIO", label: "Auditorio" },
                { value: "OUTRO", label: "Outro" },
              ]}
              onChange={(value) => {
                setSelectedType(value);
                setSelectedSpaceId("");
              }}
            />
          </div>

          <fieldset className="resource-selector">
            <legend>
              <Filter size={18} />
              Recursos desejados
            </legend>
            <div className="chip-grid">
              {resources.map((resource) => (
                <label key={resource.id} className="chip">
                  <input
                    type="checkbox"
                    checked={selectedResourceIds.includes(resource.id)}
                    onChange={() => {
                      toggleResource(resource.id);
                      setSelectedSpaceId("");
                    }}
                  />
                  <span>{resource.name}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <label>
            Finalidade
            <textarea
              name="purpose"
              rows={4}
              value={purpose}
              onChange={(event) => setPurpose(event.target.value)}
              placeholder="Ex.: aula pratica, avaliacao, oficina, apresentacao de projeto..."
              required
            />
          </label>
        </div>

        <div className={`wizard-step ${requestStep === 3 ? "active" : ""}`}>
          <div className="selected-space">
            <span>Ambiente escolhido</span>
            <strong>
              {selectedSpace?.name ?? "Selecione uma recomendacao abaixo"}
            </strong>
          </div>
          <p className="helper-text">
            As recomendacoes ficam abaixo. O sistema apenas sugere ambientes
            compativeis; a escolha final e do docente.
          </p>
        </div>

        <div className={`wizard-step ${requestStep === 4 ? "active" : ""}`}>
          <div className="review-panel">
            <div>
              <span>Curso</span>
              <strong>{selectedCourse?.name ?? "Nao informado"}</strong>
            </div>
            <div>
              <span>Disciplina</span>
              <strong>{selectedDiscipline?.name ?? "Nao informada"}</strong>
            </div>
            <div>
              <span>Turma</span>
              <strong>{selectedClassGroup?.name ?? "Nao informada"}</strong>
            </div>
            <div>
              <span>Periodo</span>
              <strong>
                {date} - {startTime} as {endTime}
              </strong>
            </div>
            <div>
              <span>Alunos previstos</span>
              <strong>{estimatedStudents}</strong>
            </div>
            <div>
              <span>Ambiente</span>
              <strong>{selectedSpace?.name ?? "Nao selecionado"}</strong>
            </div>
            <div className="review-wide">
              <span>Recursos desejados</span>
              <strong>
                {selectedResourceNames.length > 0
                  ? selectedResourceNames.join(", ")
                  : "Nenhum recurso especifico"}
              </strong>
            </div>
            <div className="review-wide">
              <span>Finalidade</span>
              <strong>{purpose || "Nao informada"}</strong>
            </div>
          </div>
        </div>

        <div className="wizard-actions">
          <button
            className="secondary-button"
            type="button"
            disabled={requestStep === 1}
            onClick={() => setRequestStep((step) => Math.max(step - 1, 1))}
          >
            Voltar
          </button>

          {requestStep < 4 && (
            <button
              className="primary-button"
              type="button"
              disabled={
                (requestStep === 1 && !canAdvanceFromAcademic) ||
                (requestStep === 2 && !canAdvanceFromCriteria) ||
                (requestStep === 3 && !canReview)
              }
              onClick={() => setRequestStep((step) => Math.min(step + 1, 4))}
            >
              Continuar
            </button>
          )}

          {requestStep === 4 && (
            <PendingButton
              className="primary-button"
              disabled={!selectedSpaceId}
              pendingLabel="Enviando..."
              title={
                !selectedSpaceId
                  ? "Escolha um ambiente recomendado"
                  : "Enviar solicitacao"
              }
            >
              <Send size={18} />
              Enviar para aprovacao
            </PendingButton>
          )}
        </div>
      </form>

      <section className="recommendation-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Recomendacao</p>
            <h2>Ambientes encontrados</h2>
          </div>
          <DoorOpen size={22} />
        </div>

        <p className="helper-text">
          O sistema sugere opcoes, mas o docente escolhe qual ambiente deseja
          solicitar.
        </p>

        <div className="recommendation-list">
          {requestStep < 3 && (
            <p className="empty-state">
              Complete os dados academicos e os criterios da reserva para ver os
              ambientes recomendados.
            </p>
          )}

          {requestStep >= 3 &&
            recommendations.map((space) => {
              const canSelect = space.level !== "INDISPONIVEL";
              return (
                <article
                  className={`space-card ${selectedSpaceId === space.id ? "selected" : ""}`}
                  key={space.id}
                >
                  <div className="space-card-header">
                    <div>
                      <span className={`status-pill ${space.level.toLowerCase()}`}>
                        {space.level === "COMPATIVEL"
                          ? "Compativel"
                          : space.level === "PARCIAL"
                            ? "Parcial"
                            : "Indisponivel"}
                      </span>
                      <h3>{space.name}</h3>
                    </div>
                    <button
                      type="button"
                      className="ghost-button"
                      disabled={!canSelect}
                      onClick={() => setSelectedSpaceId(space.id)}
                      title={
                        canSelect
                          ? "Escolher este ambiente"
                          : "Ambiente indisponivel no horario"
                      }
                    >
                      <Check size={17} />
                      Escolher
                    </button>
                  </div>

                  <div className="space-facts">
                    <span>
                      <Users size={16} />
                      {space.capacity} lugares
                    </span>
                    <span>
                      <Building2 size={16} />
                      {space.location}
                    </span>
                    <span>
                      <DoorOpen size={16} />
                      {spaceTypeLabels[space.type]}
                    </span>
                  </div>

                  <div className="tag-row">
                    {space.resources.map(({ resource }) => (
                      <span key={resource.id}>{resource.name}</span>
                    ))}
                  </div>

                  {space.level !== "COMPATIVEL" && (
                    <ul className="warning-list">
                      {space.hasConflict && <li>Ja existe bloqueio nesse horario.</li>}
                      {!space.capacityMatches && (
                        <li>Capacidade menor que a quantidade informada.</li>
                      )}
                      {!space.resourcesMatch && (
                        <li>Nem todos os recursos desejados estao disponiveis.</li>
                      )}
                    </ul>
                  )}
                </article>
              );
            })}
        </div>
      </section>
    </section>
  );
}
