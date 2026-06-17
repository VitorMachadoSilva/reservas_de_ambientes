"use client";

import {
  assignCourseApprover,
  createClassGroup,
  createCourse,
  createDiscipline,
  createResource,
  createSpace,
  createUser,
  removeCourseApprover,
  setClassGroupActive,
  setCourseActive,
  setDisciplineActive,
  setResourceActive,
  setSpaceActive,
  setUserActive,
  updateClassGroup,
  updateCourse,
  updateDiscipline,
  updateResource,
  updateSpace,
  updateUser,
} from "@/app/actions";
import {
  Building2,
  Check,
  DoorOpen,
  Edit3,
  Filter,
  GraduationCap,
  LayoutDashboard,
  Users,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { PendingButton } from "../pending-button";
import { roleLabels, spaceTypeLabels } from "../reservations/constants";
import type {
  ClassGroup,
  Course,
  Discipline,
  ReservationWorkspaceProps,
  Resource,
  Space,
} from "../reservations/types";
import { CustomSelect } from "../ui/custom-select";
import { PaginationControls } from "../ui/pagination-controls";

type RegistrationsViewProps = ReservationWorkspaceProps & {
  section: "academic" | "spaces" | "approvers" | "users" | "resources";
};

type AcademicItem = Course | Discipline | ClassGroup;

export function RegistrationsPageView({
  allClassGroups,
  allCourses,
  allDisciplines,
  allSpaces,
  allResources,
  courses,
  resources,
  section,
  spaces,
  users,
}: RegistrationsViewProps) {
  const [activeAcademicBase, setActiveAcademicBase] = useState<
    "course" | "discipline" | "classGroup"
  >("course");
  const [academicPage, setAcademicPage] = useState(1);
  const [spaceStatusFilter, setSpaceStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");
  const [spacePage, setSpacePage] = useState(1);
  const [approverCoursePage, setApproverCoursePage] = useState(1);
  const [userPage, setUserPage] = useState(1);
  const [resourcePage, setResourcePage] = useState(1);
  const [academicSearch, setAcademicSearch] = useState("");
  const [spaceSearch, setSpaceSearch] = useState("");
  const [approverSearch, setApproverSearch] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [resourceSearch, setResourceSearch] = useState("");
  const [newUserRole, setNewUserRole] = useState("DOCENTE");
  const [disciplineCourseId, setDisciplineCourseId] = useState(courses[0]?.id ?? "");
  const [classGroupCourseId, setClassGroupCourseId] = useState(courses[0]?.id ?? "");
  const [approverCourseId, setApproverCourseId] = useState(courses[0]?.id ?? "");
  const [approverUserId, setApproverUserId] = useState(
    users.find((user) => user.role === "APROVADOR" || user.role === "ADMIN")?.id ?? "",
  );
  const [spaceType, setSpaceType] = useState("LABORATORIO");
  const pageSize = 6;
  const courseOptions = courses.map((course) => ({
    value: course.id,
    label: course.name,
  }));
  const approverOptions = users
    .filter((user) => user.role === "APROVADOR" || user.role === "ADMIN")
    .map((user) => ({
      value: user.id,
      label: `${user.name} (${roleLabels[user.role] ?? user.role})`,
    }));
  const coursesWithoutApprover = courses.filter(
    (course) => course.approvers.length === 0,
  );
  const academicSections = {
    course: {
      items: allCourses,
      label: "Cursos",
      type: "course" as const,
    },
    discipline: {
      items: allDisciplines,
      label: "Disciplinas",
      type: "discipline" as const,
    },
    classGroup: {
      items: allClassGroups,
      label: "Turmas",
      type: "classGroup" as const,
    },
  };
  const activeAcademicSection = academicSections[activeAcademicBase];
  const filteredAcademicItems = activeAcademicSection.items.filter((item) => {
    const search = academicSearch.trim().toLowerCase();
    if (!search) return true;

    const secondaryValue =
      activeAcademicBase === "classGroup"
        ? (item as ClassGroup).period
        : (item as Course | Discipline).code;

    return `${item.name} ${secondaryValue}`.toLowerCase().includes(search);
  });
  const visibleAcademicItems = filteredAcademicItems.slice(
    (academicPage - 1) * pageSize,
    academicPage * pageSize,
  );
  const filteredManagedSpaces = allSpaces.filter((space) => {
    if (spaceStatusFilter === "active") return space.active;
    if (spaceStatusFilter === "inactive") return !space.active;

    return true;
  }).filter((space) => {
    const search = spaceSearch.trim().toLowerCase();
    if (!search) return true;

    return `${space.name} ${space.location} ${space.type}`.toLowerCase().includes(search);
  });
  const visibleManagedSpaces = filteredManagedSpaces.slice(
    (spacePage - 1) * pageSize,
    spacePage * pageSize,
  );
  const filteredApproverCourses = courses.filter((course) => {
    const search = approverSearch.trim().toLowerCase();
    if (!search) return true;

    return `${course.name} ${course.code}`.toLowerCase().includes(search);
  });
  const visibleApproverCourses = filteredApproverCourses.slice(
    (approverCoursePage - 1) * pageSize,
    approverCoursePage * pageSize,
  );
  const filteredUsers = users.filter((user) => {
    const search = userSearch.trim().toLowerCase();
    if (!search) return true;

    return `${user.name} ${user.email} ${roleLabels[user.role] ?? user.role}`
      .toLowerCase()
      .includes(search);
  });
  const visibleUsers = filteredUsers.slice((userPage - 1) * pageSize, userPage * pageSize);
  const filteredResources = allResources.filter((resource) => {
    const search = resourceSearch.trim().toLowerCase();
    if (!search) return true;

    return resource.name.toLowerCase().includes(search);
  });
  const visibleResources = filteredResources.slice(
    (resourcePage - 1) * pageSize,
    resourcePage * pageSize,
  );
  const spaceTypeOptions = [
    { value: "LABORATORIO", label: "Laboratorio" },
    { value: "SALA", label: "Sala" },
    { value: "AUDITORIO", label: "Auditorio" },
    { value: "OUTRO", label: "Outro" },
  ];
  const roleOptions = [
    { value: "DOCENTE", label: "Docente" },
    { value: "APROVADOR", label: "Aprovador" },
    { value: "ADMIN", label: "Administrador" },
    { value: "DISCENTE", label: "Discente" },
  ];

  useEffect(() => {
    setAcademicPage(1);
  }, [activeAcademicBase, academicSearch]);

  useEffect(() => {
    setSpacePage(1);
  }, [spaceStatusFilter, spaceSearch]);

  useEffect(() => {
    setApproverCoursePage(1);
  }, [approverSearch]);

  useEffect(() => {
    setUserPage(1);
  }, [userSearch]);

  useEffect(() => {
    setResourcePage(1);
  }, [resourceSearch]);

  return (
    <section className="registrations-page">
      <div className="registration-tabs">
        {[
          ["/cadastros/academico", "academic", "Academico"],
          ["/cadastros/ambientes", "spaces", "Ambientes"],
          ["/cadastros/aprovadores", "approvers", "Aprovadores"],
          ["/cadastros/usuarios", "users", "Usuarios"],
          ["/cadastros/recursos", "resources", "Recursos"],
        ].map(([href, value, label]) => (
          <Link
            href={href}
            key={value}
            className={section === value ? "active" : ""}
          >
            {label}
          </Link>
        ))}
      </div>

      {section === "academic" && (
        <div className="registration-grid">
          <form className="registration-card" action={createCourse}>
            <div className="section-heading">
              <div>
                <p className="eyebrow">Academico</p>
                <h2>Novo curso</h2>
              </div>
              <GraduationCap size={22} />
            </div>

            <label>
              Nome do curso
              <input name="name" placeholder="Ex.: Engenharia de Software" required />
            </label>
            <label>
              Codigo
              <input name="code" placeholder="Ex.: ES" required />
            </label>
            <PendingButton className="primary-button" pendingLabel="Salvando...">
              Salvar curso
            </PendingButton>
          </form>

          <form className="registration-card" action={createDiscipline}>
            <input type="hidden" name="courseId" value={disciplineCourseId} />
            <div className="section-heading">
              <div>
                <p className="eyebrow">Academico</p>
                <h2>Nova disciplina</h2>
              </div>
              <GraduationCap size={22} />
            </div>

            <CustomSelect
              label="Curso"
              value={disciplineCourseId}
              options={courseOptions}
              onChange={setDisciplineCourseId}
            />
            <label>
              Nome da disciplina
              <input name="name" placeholder="Ex.: Banco de Dados II" required />
            </label>
            <label>
              Codigo
              <input name="code" placeholder="Ex.: BD2" required />
            </label>
            <PendingButton
              className="primary-button"
              disabled={!disciplineCourseId}
              pendingLabel="Salvando..."
            >
              Salvar disciplina
            </PendingButton>
          </form>

          <form className="registration-card" action={createClassGroup}>
            <input type="hidden" name="courseId" value={classGroupCourseId} />
            <div className="section-heading">
              <div>
                <p className="eyebrow">Academico</p>
                <h2>Nova turma</h2>
              </div>
              <Users size={22} />
            </div>

            <CustomSelect
              label="Curso"
              value={classGroupCourseId}
              options={courseOptions}
              onChange={setClassGroupCourseId}
            />
            <label>
              Nome da turma
              <input name="name" placeholder="Ex.: ES-5A" required />
            </label>
            <label>
              Periodo
              <input name="period" placeholder="Ex.: Noturno" required />
            </label>
            <PendingButton
              className="primary-button"
              disabled={!classGroupCourseId}
              pendingLabel="Salvando..."
            >
              Salvar turma
            </PendingButton>
          </form>

          <section className="registration-card wide">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Manutencao</p>
                <h2>Base academica cadastrada</h2>
              </div>
              <GraduationCap size={22} />
            </div>

            <div className="maintenance-toolbar">
              <div className="segmented-group">
                {[
                  ["course", "Cursos"],
                  ["discipline", "Disciplinas"],
                  ["classGroup", "Turmas"],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    className={activeAcademicBase === value ? "active" : ""}
                    onClick={() =>
                      setActiveAcademicBase(
                        value as "course" | "discipline" | "classGroup",
                      )
                    }
                  >
                    {label}
                  </button>
                ))}
        </div>
        <input
          className="maintenance-search"
          type="search"
          value={academicSearch}
          onChange={(event) => setAcademicSearch(event.target.value)}
          placeholder="Buscar por nome ou codigo"
          aria-label="Buscar cadastro academico"
        />
        <span>
          {filteredAcademicItems.length} item(ns) em{" "}
          {activeAcademicSection.label.toLowerCase()}
        </span>
            </div>

            <AcademicManagementColumn
              items={visibleAcademicItems as AcademicItem[]}
              title={activeAcademicSection.label}
              type={activeAcademicSection.type}
            />

            <PaginationControls
              onChange={setAcademicPage}
              page={academicPage}
              pageSize={pageSize}
          total={filteredAcademicItems.length}
            />
          </section>
        </div>
      )}

      {section === "spaces" && (
        <div className="registration-grid">
          <form className="registration-card wide" action={createSpace}>
            <input type="hidden" name="type" value={spaceType} />
            <div className="section-heading">
              <div>
                <p className="eyebrow">Ambientes</p>
                <h2>Novo ambiente</h2>
              </div>
              <DoorOpen size={22} />
            </div>

            <div className="field-grid">
              <label>
                Nome
                <input name="name" placeholder="Ex.: Laboratorio de Informatica 03" required />
              </label>
              <CustomSelect
                label="Tipo"
                value={spaceType}
                options={spaceTypeOptions}
                onChange={setSpaceType}
              />
              <label>
                Capacidade
                <input name="capacity" type="number" min="1" placeholder="Ex.: 32" required />
              </label>
              <label>
                Localizacao
                <input name="location" placeholder="Ex.: Bloco B - 2o andar" required />
              </label>
            </div>

            <fieldset className="resource-selector">
              <legend>
                <Filter size={18} />
                Recursos disponiveis
              </legend>
              <div className="chip-grid">
                {resources.map((resource) => (
                  <label key={resource.id} className="chip">
                    <input name="resourceIds" type="checkbox" value={resource.id} />
                    <span>{resource.name}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <label>
              Observacoes
              <textarea
                name="notes"
                rows={3}
                placeholder="Ex.: indicado para aulas praticas com uso de computadores"
              />
            </label>

            <PendingButton className="primary-button" pendingLabel="Salvando...">
              Salvar ambiente
            </PendingButton>
          </form>

          <section className="registration-card wide">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Manutencao</p>
                <h2>Ambientes cadastrados</h2>
              </div>
              <Building2 size={22} />
            </div>

            <div className="maintenance-toolbar">
              <div className="segmented-group">
                {[
                  ["all", "Todos"],
                  ["active", "Ativos"],
                  ["inactive", "Inativos"],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    className={spaceStatusFilter === value ? "active" : ""}
                    onClick={() =>
                      setSpaceStatusFilter(value as "all" | "active" | "inactive")
                    }
                  >
                    {label}
                  </button>
                ))}
        </div>
        <input
          className="maintenance-search"
          type="search"
          value={spaceSearch}
          onChange={(event) => setSpaceSearch(event.target.value)}
          placeholder="Buscar por nome, localizacao ou tipo"
          aria-label="Buscar ambiente"
        />
        <span>{filteredManagedSpaces.length} ambiente(s)</span>
      </div>

            <div className="space-management-list">
              {visibleManagedSpaces.map((space) => (
                <SpaceManagementCard
                  key={space.id}
                  resources={resources}
                  space={space}
                />
              ))}
            </div>

            <PaginationControls
              onChange={setSpacePage}
              page={spacePage}
              pageSize={pageSize}
              total={filteredManagedSpaces.length}
            />
          </section>
        </div>
      )}

      {section === "approvers" && (
        <section className="registration-summary">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Aprovacao</p>
              <h2>Aprovadores por curso</h2>
            </div>
            <Check size={22} />
          </div>

          <form className="approver-form" action={assignCourseApprover}>
            <input type="hidden" name="courseId" value={approverCourseId} />
            <input type="hidden" name="userId" value={approverUserId} />
            <CustomSelect
              label="Curso"
              value={approverCourseId}
              options={courseOptions}
              onChange={setApproverCourseId}
            />
            <CustomSelect
              label="Aprovador"
              value={approverUserId}
              options={approverOptions}
              onChange={setApproverUserId}
            />
            <PendingButton
              className="primary-button"
              disabled={!approverCourseId || !approverUserId}
              pendingLabel="Vinculando..."
            >
              Vincular aprovador
            </PendingButton>
          </form>

          {coursesWithoutApprover.length > 0 && (
            <div className="warning-panel">
              <span>Cursos sem aprovador</span>
              <p>
                Solicitações desses cursos irão para a fila administrativa geral.
              </p>
              <div className="tag-row">
                {coursesWithoutApprover.map((course) => (
                  <span key={course.id}>{course.name}</span>
                ))}
              </div>
            </div>
          )}

          <div className="approver-list">
      <div className="maintenance-toolbar">
        <input
          className="maintenance-search"
          type="search"
          value={approverSearch}
          onChange={(event) => setApproverSearch(event.target.value)}
          placeholder="Buscar curso"
          aria-label="Buscar curso em aprovadores"
        />
        <span>{filteredApproverCourses.length} curso(s) cadastrados</span>
      </div>

            {visibleApproverCourses.map((course) => (
              <article className="approver-course-card" key={course.id}>
                <div>
                  <strong>{course.name}</strong>
                  <span>{course.code}</span>
                </div>
                <div className="approver-chip-list">
                  {course.approvers.length === 0 && (
                    <div className="muted-chip">Sem aprovador</div>
                  )}
                  {course.approvers.map(({ user }) => (
                    <form action={removeCourseApprover} key={user.id}>
                      <input type="hidden" name="courseId" value={course.id} />
                      <input type="hidden" name="userId" value={user.id} />
                      <PendingButton pendingLabel="Removendo..." title="Remover aprovador">
                        {user.name}
                        <X size={14} />
                      </PendingButton>
                    </form>
                  ))}
                </div>
              </article>
            ))}
          </div>

          <PaginationControls
            onChange={setApproverCoursePage}
            page={approverCoursePage}
            pageSize={pageSize}
          total={filteredApproverCourses.length}
          />
        </section>
      )}

      {section === "users" && (
        <div className="registration-grid">
          <form className="registration-card wide" action={createUser}>
            <input type="hidden" name="role" value={newUserRole} />
            <div className="section-heading">
              <div>
                <p className="eyebrow">Usuarios</p>
                <h2>Novo usuario</h2>
              </div>
              <Users size={22} />
            </div>

            <div className="field-grid">
              <label>
                Nome
                <input name="name" placeholder="Ex.: Prof. Maria Silva" required />
              </label>
              <label>
                E-mail
                <input
                  name="email"
                  type="email"
                  placeholder="maria@instituicao.edu"
                  required
                />
              </label>
              <CustomSelect
                label="Perfil"
                value={newUserRole}
                options={roleOptions}
                onChange={setNewUserRole}
              />
            </div>

            <PendingButton className="primary-button" pendingLabel="Salvando...">
              Salvar usuario
            </PendingButton>
          </form>

          <section className="registration-card wide">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Manutencao</p>
                <h2>Usuarios cadastrados</h2>
              </div>
              <Users size={22} />
            </div>

      <div className="maintenance-toolbar">
        <input
          className="maintenance-search"
          type="search"
          value={userSearch}
          onChange={(event) => setUserSearch(event.target.value)}
          placeholder="Buscar por nome, e-mail ou perfil"
          aria-label="Buscar usuario"
        />
        <span>{filteredUsers.length} usuario(s) cadastrados</span>
      </div>

            <div className="space-management-list">
              {visibleUsers.map((user) => (
                <UserManagementCard key={user.id} user={user} />
              ))}
            </div>

            <PaginationControls
              onChange={setUserPage}
              page={userPage}
              pageSize={pageSize}
          total={filteredUsers.length}
            />
          </section>
        </div>
      )}

      {section === "resources" && (
        <div className="registration-grid">
          <form className="registration-card wide" action={createResource}>
            <div className="section-heading">
              <div>
                <p className="eyebrow">Recursos</p>
                <h2>Novo recurso</h2>
              </div>
              <Filter size={22} />
            </div>

            <label>
              Nome do recurso
              <input name="name" placeholder="Ex.: Software de modelagem 3D" required />
            </label>

            <PendingButton className="primary-button" pendingLabel="Salvando...">
              Salvar recurso
            </PendingButton>
          </form>

          <section className="registration-card wide">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Manutencao</p>
                <h2>Recursos cadastrados</h2>
              </div>
              <Filter size={22} />
            </div>

      <div className="maintenance-toolbar">
        <input
          className="maintenance-search"
          type="search"
          value={resourceSearch}
          onChange={(event) => setResourceSearch(event.target.value)}
          placeholder="Buscar recurso"
          aria-label="Buscar recurso"
        />
        <span>{filteredResources.length} recurso(s) cadastrados</span>
      </div>

            <div className="space-management-list">
              {visibleResources.map((resource) => (
                <ResourceManagementCard key={resource.id} resource={resource} />
              ))}
            </div>

            <PaginationControls
              onChange={setResourcePage}
              page={resourcePage}
              pageSize={pageSize}
          total={filteredResources.length}
            />
          </section>
        </div>
      )}

      <section className="registration-summary">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Resumo</p>
            <h2>Base atual</h2>
          </div>
          <LayoutDashboard size={22} />
        </div>

        <div className="summary-grid">
          <Metric icon={GraduationCap} label="Cursos" value={courses.length} />
          <Metric icon={DoorOpen} label="Ambientes" value={spaces.length} />
          <Metric icon={Filter} label="Recursos" value={resources.length} />
        </div>
      </section>
    </section>
  );
}

function SpaceManagementCard({
  resources,
  space,
}: {
  resources: Resource[];
  space: Space;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const initialResourceIds = space.resources.map(({ resource }) => resource.id);
  const [name, setName] = useState(space.name);
  const [spaceType, setSpaceType] = useState<string>(space.type);
  const [capacity, setCapacity] = useState(String(space.capacity));
  const [location, setLocation] = useState(space.location);
  const [notes, setNotes] = useState(space.notes ?? "");
  const [selectedResourceIds, setSelectedResourceIds] =
    useState<string[]>(initialResourceIds);
  const spaceTypeOptions = [
    { value: "LABORATORIO", label: "Laboratorio" },
    { value: "SALA", label: "Sala" },
    { value: "AUDITORIO", label: "Auditorio" },
    { value: "OUTRO", label: "Outro" },
  ];
  const sortedInitialResources = [...initialResourceIds].sort().join("|");
  const sortedSelectedResources = [...selectedResourceIds].sort().join("|");
  const isDirty =
    name !== space.name ||
    spaceType !== space.type ||
    capacity !== String(space.capacity) ||
    location !== space.location ||
    notes !== (space.notes ?? "") ||
    sortedSelectedResources !== sortedInitialResources;

  function resetChanges() {
    setName(space.name);
    setSpaceType(space.type);
    setCapacity(String(space.capacity));
    setLocation(space.location);
    setNotes(space.notes ?? "");
    setSelectedResourceIds(initialResourceIds);
    setIsEditing(false);
  }

  function toggleResource(resourceId: string) {
    setSelectedResourceIds((current) =>
      current.includes(resourceId)
        ? current.filter((id) => id !== resourceId)
        : [...current, resourceId],
    );
  }

  return (
    <article className={`space-management-card ${space.active ? "active" : "inactive"}`}>
      {!isEditing && (
        <div className="maintenance-summary">
          <div>
            <span className={`status-pill ${space.active ? "programada" : "finalizada"}`}>
              {space.active ? "Ativo" : "Inativo"}
            </span>
            <h3>{space.name}</h3>
            <p>
              {spaceTypeLabels[space.type]} - {space.capacity} lugares - {space.location}
            </p>
            <div className="tag-row">
              {space.resources.map(({ resource }) => (
                <span key={resource.id}>{resource.name}</span>
              ))}
            </div>
          </div>
          <div className="maintenance-actions">
            <button
              className="edit-action-button"
              onClick={() => setIsEditing(true)}
              type="button"
            >
              <Edit3 size={15} />
              Editar
            </button>
            <form action={setSpaceActive}>
              <input type="hidden" name="id" value={space.id} />
              <input type="hidden" name="active" value={space.active ? "false" : "true"} />
              <PendingButton
                className={`${space.active ? "reject-button" : "approve-button"} compact-action`}
                pendingLabel={space.active ? "Inativando..." : "Ativando..."}
              >
                {space.active ? "Inativar" : "Ativar"}
              </PendingButton>
            </form>
          </div>
        </div>
      )}

      {isEditing && (
        <form action={updateSpace} className="maintenance-edit-form">
          <input type="hidden" name="id" value={space.id} />
          <input type="hidden" name="type" value={spaceType} />

          <div className="space-management-header">
            <div>
              <span className={`status-pill ${space.active ? "programada" : "finalizada"}`}>
                {space.active ? "Ativo" : "Inativo"}
              </span>
              <h3>Editando {space.name}</h3>
              <p>Altere somente os campos necessarios.</p>
            </div>
            <div className="management-actions">
              <PendingButton
                className="primary-button compact-action"
                disabled={!isDirty}
                pendingLabel="Salvando..."
              >
                Salvar
              </PendingButton>
              <button
                className="secondary-button compact-action"
                onClick={resetChanges}
                type="button"
              >
                Cancelar
              </button>
            </div>
          </div>

          <div className="field-grid">
            <label>
              Nome
              <input
                name="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />
            </label>
            <CustomSelect
              label="Tipo"
              value={spaceType}
              options={spaceTypeOptions}
              onChange={setSpaceType}
            />
            <label>
              Capacidade
              <input
                name="capacity"
                type="number"
                min="1"
                value={capacity}
                onChange={(event) => setCapacity(event.target.value)}
                required
              />
            </label>
            <label>
              Localizacao
              <input
                name="location"
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                required
              />
            </label>
          </div>

          <fieldset className="resource-selector">
            <legend>
              <Filter size={18} />
              Recursos disponiveis
            </legend>
            <div className="chip-grid">
              {resources.map((resource) => (
                <label key={resource.id} className="chip">
                  <input
                    name="resourceIds"
                    type="checkbox"
                    value={resource.id}
                    checked={selectedResourceIds.includes(resource.id)}
                    onChange={() => toggleResource(resource.id)}
                  />
                  <span>{resource.name}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <label>
            Observacoes
            <textarea
              name="notes"
              rows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </label>
        </form>
      )}
    </article>
  );
}

function AcademicManagementColumn({
  items,
  title,
  type,
}: {
  items: AcademicItem[];
  title: string;
  type: "course" | "discipline" | "classGroup";
}) {
  return (
    <section className="academic-management-column">
      <h3>{title}</h3>
      <div className="academic-management-list">
        {items.map((item) => (
          <AcademicManagementCard item={item} key={item.id} type={type} />
        ))}
      </div>
    </section>
  );
}

function AcademicManagementCard({
  item,
  type,
}: {
  item: AcademicItem;
  type: "course" | "discipline" | "classGroup";
}) {
  const isClassGroup = type === "classGroup";
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(item.name);
  const [secondaryValue, setSecondaryValue] = useState(
    isClassGroup ? (item as ClassGroup).period : (item as Course | Discipline).code,
  );
  const updateAction =
    type === "course"
      ? updateCourse
      : type === "discipline"
        ? updateDiscipline
        : updateClassGroup;
  const activeAction =
    type === "course"
      ? setCourseActive
      : type === "discipline"
        ? setDisciplineActive
        : setClassGroupActive;
  const originalSecondaryValue = isClassGroup
    ? (item as ClassGroup).period
    : (item as Course | Discipline).code;
  const isDirty = name !== item.name || secondaryValue !== originalSecondaryValue;

  function resetChanges() {
    setName(item.name);
    setSecondaryValue(originalSecondaryValue);
    setIsEditing(false);
  }

  return (
    <article className={`academic-management-card ${item.active ? "active" : "inactive"}`}>
      {!isEditing && (
        <div className="maintenance-summary compact-summary">
          <div>
            <span className={`status-pill ${item.active ? "programada" : "finalizada"}`}>
              {item.active ? "Ativo" : "Inativo"}
            </span>
            <h3>{item.name}</h3>
            <p>
              {isClassGroup ? "Periodo" : "Codigo"}: {originalSecondaryValue}
            </p>
          </div>
          <div className="maintenance-actions">
            <button
              className="edit-action-button"
              onClick={() => setIsEditing(true)}
              type="button"
            >
              <Edit3 size={15} />
              Editar
            </button>
            <form action={activeAction}>
              <input type="hidden" name="id" value={item.id} />
              <input type="hidden" name="active" value={item.active ? "false" : "true"} />
              <PendingButton
                className={`${item.active ? "reject-button" : "approve-button"} compact-action`}
                pendingLabel={item.active ? "Inativando..." : "Ativando..."}
              >
                {item.active ? "Inativar" : "Ativar"}
              </PendingButton>
            </form>
          </div>
        </div>
      )}

      {isEditing && (
        <form action={updateAction} className="maintenance-edit-form">
          <input type="hidden" name="id" value={item.id} />
          <div className="academic-management-header">
            <div>
              <span className={`status-pill ${item.active ? "programada" : "finalizada"}`}>
                {item.active ? "Ativo" : "Inativo"}
              </span>
              <h3>Editando {item.name}</h3>
            </div>
          </div>
          <label>
            Nome
            <input
              name="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </label>
          <label>
            {isClassGroup ? "Periodo" : "Codigo"}
            <input
              name={isClassGroup ? "period" : "code"}
              value={secondaryValue}
              onChange={(event) => setSecondaryValue(event.target.value)}
              required
            />
          </label>
          <div className="management-actions">
            <PendingButton
              className="primary-button compact-action"
              disabled={!isDirty}
              pendingLabel="Salvando..."
            >
              Salvar
            </PendingButton>
            <button
              className="secondary-button compact-action"
              onClick={resetChanges}
              type="button"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
    </article>
  );
}

function UserManagementCard({
  user,
}: {
  user: ReservationWorkspaceProps["users"][number];
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [role, setRole] = useState(user.role);
  const roleOptions = [
    { value: "DOCENTE", label: "Docente" },
    { value: "APROVADOR", label: "Aprovador" },
    { value: "ADMIN", label: "Administrador" },
    { value: "DISCENTE", label: "Discente" },
  ];
  const isDirty =
    name !== user.name || email !== user.email || role !== user.role;

  function resetChanges() {
    setName(user.name);
    setEmail(user.email);
    setRole(user.role);
    setIsEditing(false);
  }

  return (
    <article className={`academic-management-card ${user.active ? "active" : "inactive"}`}>
      {!isEditing && (
        <div className="maintenance-summary compact-summary">
          <div>
            <span className={`status-pill ${user.active ? "programada" : "finalizada"}`}>
              {user.active ? "Ativo" : "Inativo"}
            </span>
            <h3>{user.name}</h3>
            <p>
              {user.email} - {roleLabels[user.role] ?? user.role}
            </p>
          </div>
          <div className="maintenance-actions">
            <button
              className="edit-action-button"
              onClick={() => setIsEditing(true)}
              type="button"
            >
              <Edit3 size={15} />
              Editar
            </button>
            <form action={setUserActive}>
              <input type="hidden" name="id" value={user.id} />
              <input type="hidden" name="active" value={user.active ? "false" : "true"} />
              <PendingButton
                className={`${user.active ? "reject-button" : "approve-button"} compact-action`}
                pendingLabel={user.active ? "Inativando..." : "Ativando..."}
              >
                {user.active ? "Inativar" : "Ativar"}
              </PendingButton>
            </form>
          </div>
        </div>
      )}

      {isEditing && (
        <form action={updateUser} className="maintenance-edit-form">
          <input type="hidden" name="id" value={user.id} />
          <input type="hidden" name="role" value={role} />
          <div className="academic-management-header">
            <div>
              <span className={`status-pill ${user.active ? "programada" : "finalizada"}`}>
                {user.active ? "Ativo" : "Inativo"}
              </span>
              <h3>Editando {user.name}</h3>
            </div>
          </div>
          <label>
            Nome
            <input
              name="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </label>
          <label>
            E-mail
            <input
              name="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <CustomSelect
            label="Perfil"
            value={role}
            options={roleOptions}
            onChange={setRole}
          />
          <div className="management-actions">
            <PendingButton
              className="primary-button compact-action"
              disabled={!isDirty}
              pendingLabel="Salvando..."
            >
              Salvar
            </PendingButton>
            <button
              className="secondary-button compact-action"
              onClick={resetChanges}
              type="button"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
    </article>
  );
}

function ResourceManagementCard({
  resource,
}: {
  resource: ReservationWorkspaceProps["allResources"][number];
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(resource.name);
  const isDirty = name !== resource.name;

  function resetChanges() {
    setName(resource.name);
    setIsEditing(false);
  }

  return (
    <article className={`academic-management-card ${resource.active ? "active" : "inactive"}`}>
      {!isEditing && (
        <div className="maintenance-summary compact-summary">
          <div>
            <span className={`status-pill ${resource.active ? "programada" : "finalizada"}`}>
              {resource.active ? "Ativo" : "Inativo"}
            </span>
            <h3>{resource.name}</h3>
            <p>Recurso de ambiente</p>
          </div>
          <div className="maintenance-actions">
            <button
              className="edit-action-button"
              onClick={() => setIsEditing(true)}
              type="button"
            >
              <Edit3 size={15} />
              Editar
            </button>
            <form action={setResourceActive}>
              <input type="hidden" name="id" value={resource.id} />
              <input type="hidden" name="active" value={resource.active ? "false" : "true"} />
              <PendingButton
                className={`${resource.active ? "reject-button" : "approve-button"} compact-action`}
                pendingLabel={resource.active ? "Inativando..." : "Ativando..."}
              >
                {resource.active ? "Inativar" : "Ativar"}
              </PendingButton>
            </form>
          </div>
        </div>
      )}

      {isEditing && (
        <form action={updateResource} className="maintenance-edit-form">
          <input type="hidden" name="id" value={resource.id} />
          <div className="academic-management-header">
            <div>
              <span className={`status-pill ${resource.active ? "programada" : "finalizada"}`}>
                {resource.active ? "Ativo" : "Inativo"}
              </span>
              <h3>Editando {resource.name}</h3>
            </div>
          </div>
          <label>
            Nome
            <input
              name="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </label>
          <div className="management-actions">
            <PendingButton
              className="primary-button compact-action"
              disabled={!isDirty}
              pendingLabel="Salvando..."
            >
              Salvar
            </PendingButton>
            <button
              className="secondary-button compact-action"
              onClick={resetChanges}
              type="button"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
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
