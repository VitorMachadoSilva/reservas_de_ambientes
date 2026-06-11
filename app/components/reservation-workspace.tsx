"use client";

import {
  approveReservationRequest,
  assignCourseApprover,
  cancelOwnPendingReservation,
  createClassGroup,
  createCourse,
  createDiscipline,
  createReservationRequest,
  createSpace,
  logoutUser,
  removeCourseApprover,
  rejectReservationRequest,
  setSpaceActive,
  setClassGroupActive,
  setCourseActive,
  setDisciplineActive,
  updateClassGroup,
  updateCourse,
  updateDiscipline,
  updateSpace,
} from "@/app/actions";
import {
  Building2,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  DoorOpen,
  Edit3,
  Filter,
  GraduationCap,
  LayoutDashboard,
  Send,
  Users,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sidebar as AppSidebar } from "./layout/sidebar";
import { PendingButton } from "./pending-button";
import type {
  ClassGroup,
  Course,
  Discipline,
  ReservationRequest,
  ReservationWorkspaceProps as Props,
  Resource,
  Space,
  User,
  View,
} from "./reservations/types";
import { CustomSelect } from "./ui/custom-select";
import { PaginationControls } from "./ui/pagination-controls";
import { roleLabels, spaceTypeLabels, statusLabels } from "./reservations/constants";
import {
  formatDateTime,
  formatTimeRange,
  getDailyOperationalStatus,
  hasOverlap,
  inputDateFromValue,
  minutesFromDateTime,
  parseDateTime,
} from "./reservations/date-utils";
import { useEffect, useMemo, useState } from "react";

function Sidebar({
  collapsed,
  currentUser,
  setCollapsed,
}: {
  collapsed: boolean;
  currentUser: User;
  setCollapsed: (collapsed: boolean) => void;
}) {
  const pathname = usePathname();
  const navItems = [
    { href: "/", label: "Painel", icon: LayoutDashboard },
    {
      href: "/nova-solicitacao",
      label: "Nova solicitacao",
      icon: Send,
      roles: ["DOCENTE"],
    },
    {
      href: "/minhas-reservas",
      label: "Minhas reservas",
      icon: GraduationCap,
      roles: ["DOCENTE"],
    },
    {
      href: "/aprovacoes",
      label: "Aprovacoes",
      icon: Check,
      roles: ["APROVADOR", "ADMIN"],
    },
    { href: "/agenda", label: "Agenda", icon: CalendarDays },
    { href: "/ambientes", label: "Ambientes", icon: Building2 },
    {
      href: "/cadastros/academico",
      label: "Cadastros",
      icon: Users,
      roles: ["ADMIN"],
    },
  ].filter((item) => !item.roles || item.roles.includes(currentUser.role));

  return (
    <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>
      <div className="brand">
        <div className="brand-icon">
          <DoorOpen size={22} />
        </div>
        <div className="brand-copy">
          <strong>Reservas</strong>
          <span>Ambientes academicos</span>
        </div>
      </div>

      <button
        className="sidebar-toggle"
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        title={collapsed ? "Expandir menu" : "Recolher menu"}
      >
        {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        <span>{collapsed ? "" : ""}</span>
      </button>

      <nav className="nav-list" aria-label="Navegacao principal">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active =
            pathname === item.href ||
            (item.href.startsWith("/cadastros") && pathname.startsWith("/cadastros"));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-item ${active ? "active" : ""}`}
              title={item.label}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <form action={logoutUser} className="logout-form">
        <PendingButton
          className="nav-item logout-button"
          pendingLabel="Saindo..."
          title="Sair"
        >
          <X size={18} />
          <span>Sair</span>
        </PendingButton>
      </form>
    </aside>
  );
}

export function ReservationWorkspace(props: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const allowedViews: Record<View, string[]> = {
    dashboard: ["DOCENTE", "APROVADOR", "ADMIN", "DISCENTE"],
    "new-request": ["DOCENTE"],
    "my-reservations": ["DOCENTE"],
    approvals: ["APROVADOR", "ADMIN"],
    agenda: ["DOCENTE", "APROVADOR", "ADMIN", "DISCENTE"],
    spaces: ["DOCENTE", "APROVADOR", "ADMIN", "DISCENTE"],
    "registrations-academic": ["ADMIN"],
    "registrations-spaces": ["ADMIN"],
    "registrations-approvers": ["ADMIN"],
  };
  const canView = allowedViews[props.view].includes(props.currentUser.role);

  return (
    <main className={`app-shell ${collapsed ? "sidebar-collapsed" : ""}`}>
      <AppSidebar
        collapsed={collapsed}
        currentUser={props.currentUser}
        setCollapsed={setCollapsed}
      />
      <section className="content">
        <PageTopbar {...props} />
        {!canView && <AccessDeniedView />}
        {canView && props.view === "dashboard" && <DashboardView {...props} />}
        {canView && props.view === "new-request" && <NewRequestView {...props} />}
        {canView && props.view === "my-reservations" && (
          <MyReservationsView {...props} />
        )}
        {canView && props.view === "approvals" && <ApprovalsView {...props} />}
        {canView && props.view === "agenda" && <AgendaView {...props} />}
        {canView && props.view === "spaces" && <SpacesView {...props} />}
        {canView && props.view === "registrations-academic" && (
          <RegistrationsView {...props} section="academic" />
        )}
        {canView && props.view === "registrations-spaces" && (
          <RegistrationsView {...props} section="spaces" />
        )}
        {canView && props.view === "registrations-approvers" && (
          <RegistrationsView {...props} section="approvers" />
        )}
      </section>
    </main>
  );
}

function AccessDeniedView() {
  return (
    <section className="access-denied-panel">
      <p className="eyebrow">Acesso restrito</p>
      <h2>Esta area nao esta disponivel para o perfil atual.</h2>
      <p>
        Use o menu lateral para navegar pelas areas liberadas para o usuario
        selecionado.
      </p>
    </section>
  );
}

function PageTopbar({ currentUser, view }: Props) {
  const titles = {
    dashboard: ["Painel do dia", "Agenda operacional da instituicao"],
    "new-request": ["Nova solicitacao", "Encontre um ambiente e envie para aprovacao"],
    "my-reservations": ["Minhas reservas", "Acompanhe suas solicitacoes e reservas"],
    approvals: ["Aprovacoes", "Solicitacoes aguardando decisao"],
    agenda: ["Agenda", "Reservas recentes e bloqueios"],
    spaces: ["Ambientes", "Salas e laboratorios cadastrados"],
    "registrations-academic": ["Cadastros", "Base academica"],
    "registrations-spaces": ["Cadastros", "Ambientes"],
    "registrations-approvers": ["Cadastros", "Aprovadores por curso"],
  };

  return (
    <header className="topbar">
      <div>
        <p className="eyebrow">{titles[view][0]}</p>
        <h1>{titles[view][1]}</h1>
      </div>
      <div className="profile-cluster">
        <div>
          <span>Usuario logado</span>
          <strong>{currentUser.name}</strong>
        </div>
        <div>
          <span>Perfil</span>
          <strong>{roleLabels[currentUser.role] ?? currentUser.role}</strong>
        </div>
      </div>
    </header>
  );
}

function DashboardView(props: Props) {
  const {
    initialDate,
    reservationRequests,
    spaces,
    pendingRequests,
    approvedRequests,
    rejectedRequests,
    hasHydrated,
  } = useReservationStats(props);
  const [statusFilter, setStatusFilter] = useState("TODOS");
  const [shiftFilter, setShiftFilter] = useState("TODOS");
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const todayRequests = reservationRequests.filter(
    (request) => inputDateFromValue(request.startAt) === initialDate,
  );
  const filteredTodayRequests = todayRequests.filter((request) => {
    const statusMatches = statusFilter === "TODOS" || request.status === statusFilter;
    const startMinutes = minutesFromDateTime(request.startAt);
    const shiftMatches =
      shiftFilter === "TODOS" ||
      (shiftFilter === "MANHA" && startMinutes < 12 * 60) ||
      (shiftFilter === "TARDE" && startMinutes >= 12 * 60 && startMinutes < 18 * 60) ||
      (shiftFilter === "NOITE" && startMinutes >= 18 * 60);

    return statusMatches && shiftMatches;
  });
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
  const filteredApprovedRequests = filteredTodayRequests.filter(
    (request) => request.status === "APROVADA",
  );
  const filteredPendingRequests = filteredTodayRequests.filter(
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

      <section className="dashboard-controls">
        <div>
          <p className="eyebrow">Filtros</p>
          <h2>Visualizar agenda do dia</h2>
        </div>
        <div className="segmented-group">
          {[
            ["TODOS", "Todos"],
            ["APROVADA", "Aprovadas"],
            ["PENDENTE", "Pendentes"],
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
        <div className="segmented-group">
          {[
            ["TODOS", "Dia"],
            ["MANHA", "Manha"],
            ["TARDE", "Tarde"],
            ["NOITE", "Noite"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={shiftFilter === value ? "active" : ""}
              onClick={() => setShiftFilter(value)}
            >
              {label}
            </button>
          ))}
        </div>
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
                hasHydrated={hasHydrated}
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
              <p className="empty-state">Nenhuma reserva aprovada para este filtro.</p>
            )}
            {filteredApprovedRequests.map((request) => (
              <TodayCompactItem
                key={request.id}
                request={request}
                hasHydrated={hasHydrated}
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
              <p className="empty-state">Nenhuma pendencia para este filtro.</p>
            )}
            {filteredPendingRequests.map((request) => (
              <TodayCompactItem
                key={request.id}
                request={request}
                hasHydrated={hasHydrated}
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

function NewRequestView(props: Props) {
  const {
    currentRequester,
    courses,
    disciplines,
    classGroups,
    resources,
    spaces,
    reservationRequests,
    initialDate,
  } = props;
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
              {selectedSpace?.name ?? "Selecione uma recomendacao ao lado"}
            </strong>
          </div>
          <p className="helper-text">
            As recomendacoes ficam no painel ao lado. O sistema apenas sugere
            ambientes compativeis; a escolha final e do docente.
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

          {requestStep >= 3 && recommendations.map((space) => {
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

function TodayMainItem({
  request,
  hasHydrated,
  nowMinutes,
}: {
  request: ReservationRequest;
  hasHydrated: boolean;
  nowMinutes: number;
}) {
  const operationalStatus = getDailyOperationalStatus(request, nowMinutes);

  return (
    <article className={`today-item ${operationalStatus.className}`} key={request.id}>
      <div className="today-time">
        <Clock3 size={16} />
        <strong>
          {hasHydrated
            ? formatTimeRange(request.startAt, request.endAt)
            : "--:-- - --:--"}
        </strong>
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
  hasHydrated,
  nowMinutes,
}: {
  request: ReservationRequest;
  hasHydrated: boolean;
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
          {request.classGroup.name}
        </p>
      </div>
      <strong>
        {hasHydrated ? formatTimeRange(request.startAt, request.endAt) : "--:-- - --:--"}
      </strong>
    </article>
  );
}

function MyReservationsView(props: Props) {
  const { currentRequester, hasHydrated, reservationRequests } =
    useReservationStats(props);
  const [statusFilter, setStatusFilter] = useState("TODOS");
  const now = new Date();
  const myRequests = reservationRequests.filter(
    (request) => request.requester.id === currentRequester.id,
  );
  const filteredRequests = myRequests.filter(
    (request) => statusFilter === "TODOS" || request.status === statusFilter,
  );
  const upcomingRequests = filteredRequests.filter(
    (request) => new Date(request.endAt) >= now,
  );
  const historyRequests = filteredRequests.filter(
    (request) => new Date(request.endAt) < now,
  );

  return (
    <section className="calendar-panel single-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Docente</p>
          <h2>Minhas reservas</h2>
        </div>
        <GraduationCap size={22} />
      </div>

      <div className="agenda-controls">
        <div>
          <p className="eyebrow">Filtros</p>
          <h2>Acompanhar solicitacoes</h2>
        </div>
        <div className="segmented-group">
          {[
            ["TODOS", "Todas"],
            ["PENDENTE", "Pendentes"],
            ["APROVADA", "Aprovadas"],
            ["RECUSADA", "Recusadas"],
            ["CANCELADA", "Canceladas"],
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

      <div className="section-heading compact-heading">
        <div>
          <p className="eyebrow">Proximas</p>
          <h2>Solicitacoes em andamento ou futuras</h2>
        </div>
      </div>
      <div className="reservation-table">
        {upcomingRequests.length === 0 && (
          <p className="empty-state">Voce ainda nao possui solicitacoes.</p>
        )}

        {upcomingRequests.map((request) => (
          <MyReservationCard
            currentRequester={currentRequester}
            hasHydrated={hasHydrated}
            key={request.id}
            request={request}
          />
        ))}
      </div>

      <div className="section-heading compact-heading">
        <div>
          <p className="eyebrow">Historico</p>
          <h2>Reservas encerradas</h2>
        </div>
      </div>
      <div className="reservation-table">
        {historyRequests.length === 0 && (
          <p className="empty-state">Nenhuma reserva encerrada para este filtro.</p>
        )}

        {historyRequests.map((request) => (
          <MyReservationCard
            currentRequester={currentRequester}
            hasHydrated={hasHydrated}
            key={request.id}
            request={request}
          />
        ))}
      </div>
    </section>
  );
}

function MyReservationCard({
  currentRequester,
  hasHydrated,
  request,
}: {
  currentRequester: User;
  hasHydrated: boolean;
  request: ReservationRequest;
}) {
  const decisionNoteLabel =
    request.status === "APROVADA"
      ? "Observacao da aprovacao"
      : request.status === "RECUSADA"
        ? "Motivo da recusa"
        : request.status === "CANCELADA"
          ? "Motivo do cancelamento"
          : "Motivo/observacao";

  return (
    <article className="reservation-row">
      <div>
        <span className={`status-pill ${request.status.toLowerCase()}`}>
          {statusLabels[request.status]}
        </span>
        <h3>{request.space.name}</h3>
        <p>
          {request.course.name} - {request.discipline.name} - {request.classGroup.name}
        </p>
      </div>
      <div>
        <span>Periodo</span>
        <strong>
          {hasHydrated
            ? `${formatDateTime(request.startAt)} | ${formatTimeRange(
                request.startAt,
                request.endAt,
              )}`
            : "--/--/--, --:--"}
        </strong>
      </div>
      <div>
        <span>Alunos</span>
        <strong>{request.estimatedStudents}</strong>
      </div>
      <div>
        <span>Aprovador</span>
        <strong>{request.assignedApprover?.name ?? "Fila administrativa geral"}</strong>
      </div>
      <div className="reservation-note">
        <span>Finalidade</span>
        <strong>{request.purpose}</strong>
      </div>

      {request.decisionNote && (
        <div
          className={`reservation-note decision-note ${request.status.toLowerCase()}`}
        >
          <span>{decisionNoteLabel}</span>
          <strong>{request.decisionNote}</strong>
        </div>
      )}

      {request.status === "PENDENTE" && (
        <form className="cancel-reservation-form" action={cancelOwnPendingReservation}>
          <input type="hidden" name="requestId" value={request.id} />
          <input type="hidden" name="requesterId" value={currentRequester.id} />
          <input
            name="decisionNote"
            placeholder="Motivo do cancelamento"
            required
          />
          <PendingButton className="reject-button" pendingLabel="Cancelando...">
            <X size={17} />
            Cancelar solicitacao
          </PendingButton>
        </form>
      )}
    </article>
  );
}

function ApprovalsView(props: Props) {
  const { pendingRequests, hasHydrated } = useReservationStats(props);
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
              hasHydrated={hasHydrated}
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
                hasHydrated={hasHydrated}
              />
            ))}
          </div>
        </section>
      )}
    </section>
  );
}

function AgendaView(props: Props) {
  const { reservationRequests, hasHydrated } = useReservationStats(props);
  const [dateFilter, setDateFilter] = useState(props.initialDate);
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
                <span>
                  {hasHydrated ? formatDateTime(request.startAt) : "--/--/--, --:--"}
                </span>
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

function SpacesView({ initialDate, reservationRequests, spaces }: Props) {
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const todayRequests = reservationRequests.filter(
    (request) => inputDateFromValue(request.startAt) === initialDate,
  );

  return (
    <section className="environment-strip single-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Cadastro base</p>
          <h2>Ambientes cadastrados</h2>
        </div>
        <Building2 size={22} />
      </div>
      <div className="environment-grid">
        {spaces.map((space) => {
          const spaceRequests = todayRequests
            .filter((request) => request.space.id === space.id)
            .sort(
              (a, b) =>
                new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
            );
          const currentRequest = spaceRequests.find((request) => {
            const startMinutes = minutesFromDateTime(request.startAt);
            const endMinutes = minutesFromDateTime(request.endAt);

            return (
              ["PENDENTE", "APROVADA"].includes(request.status) &&
              startMinutes <= nowMinutes &&
              endMinutes >= nowMinutes
            );
          });
          const nextRequest = spaceRequests.find((request) => {
            const startMinutes = minutesFromDateTime(request.startAt);

            return (
              ["PENDENTE", "APROVADA"].includes(request.status) &&
              startMinutes > nowMinutes
            );
          });
          const availability = currentRequest
            ? getDailyOperationalStatus(currentRequest, nowMinutes)
            : {
                label: "Livre agora",
                className: "livre",
              };

          return (
            <article className={`environment-card ${availability.className}`} key={space.id}>
              <span className={`status-pill ${availability.className}`}>
                {availability.label}
              </span>
              <strong>{space.name}</strong>
              <span>
                {spaceTypeLabels[space.type]} - {space.capacity} lugares
              </span>
              <p>{space.location}</p>
              <div className="tag-row">
                {space.resources.map(({ resource }) => (
                  <span key={resource.id}>{resource.name}</span>
                ))}
              </div>
              <div className="environment-next">
                <span>Proxima reserva</span>
                <strong>
                  {nextRequest
                    ? `${formatTimeRange(nextRequest.startAt, nextRequest.endAt)} - ${nextRequest.course.code}`
                    : "Sem novas reservas hoje"}
                </strong>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function RegistrationsView({
  allClassGroups,
  allCourses,
  allDisciplines,
  allSpaces,
  courses,
  resources,
  section,
  spaces,
  users,
}: Props & { section: "academic" | "spaces" | "approvers" }) {
  const [activeAcademicBase, setActiveAcademicBase] = useState<
    "course" | "discipline" | "classGroup"
  >("course");
  const [academicPage, setAcademicPage] = useState(1);
  const [spaceStatusFilter, setSpaceStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");
  const [spacePage, setSpacePage] = useState(1);
  const [approverCoursePage, setApproverCoursePage] = useState(1);
  const [disciplineCourseId, setDisciplineCourseId] = useState(courses[0]?.id ?? "");
  const [classGroupCourseId, setClassGroupCourseId] = useState(courses[0]?.id ?? "");
  const [approverCourseId, setApproverCourseId] = useState(courses[0]?.id ?? "");
  const [approverUserId, setApproverUserId] = useState(
    users.find((user) => user.role === "APROVADOR" || user.role === "ADMIN")?.id ?? "",
  );
  const [spaceType, setSpaceType] = useState("LABORATORIO");
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
  const pageSize = 6;
  const visibleAcademicItems = activeAcademicSection.items.slice(
    (academicPage - 1) * pageSize,
    academicPage * pageSize,
  );
  const filteredManagedSpaces = allSpaces.filter((space) => {
    if (spaceStatusFilter === "active") return space.active;
    if (spaceStatusFilter === "inactive") return !space.active;

    return true;
  });
  const visibleManagedSpaces = filteredManagedSpaces.slice(
    (spacePage - 1) * pageSize,
    spacePage * pageSize,
  );
  const visibleApproverCourses = courses.slice(
    (approverCoursePage - 1) * pageSize,
    approverCoursePage * pageSize,
  );

  useEffect(() => {
    setAcademicPage(1);
  }, [activeAcademicBase]);

  useEffect(() => {
    setSpacePage(1);
  }, [spaceStatusFilter]);
  const spaceTypeOptions = [
    { value: "LABORATORIO", label: "Laboratorio" },
    { value: "SALA", label: "Sala" },
    { value: "AUDITORIO", label: "Auditorio" },
    { value: "OUTRO", label: "Outro" },
  ];

  return (
    <section className="registrations-page">
      <div className="registration-tabs">
        {[
          ["/cadastros/academico", "academic", "Academico"],
          ["/cadastros/ambientes", "spaces", "Ambientes"],
          ["/cadastros/aprovadores", "approvers", "Aprovadores"],
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
            <span>
              {activeAcademicSection.items.length} item(ns) em{" "}
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
            total={activeAcademicSection.items.length}
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
            <span>{courses.length} curso(s) cadastrados</span>
          </div>

          {visibleApproverCourses.map((course) => (
            <article className="approver-course-card" key={course.id}>
              <div>
                <strong>{course.name}</strong>
                <span>{course.code}</span>
              </div>
              <div className="approver-chip-list">
                {course.approvers.length === 0 && (
                  <span className="muted-chip">Sem aprovador</span>
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
          total={courses.length}
        />
      </section>
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

type AcademicItem = Course | Discipline | ClassGroup;

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

function ApprovalCard({
  request,
  currentApprover,
  hasHydrated,
}: {
  request: ReservationRequest;
  currentApprover: User;
  hasHydrated: boolean;
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
          {hasHydrated ? formatTimeRange(request.startAt, request.endAt) : "--:-- - --:--"}
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

function useReservationStats({
  currentRequester,
  initialDate,
  reservationRequests,
  spaces,
}: Props) {
  const [hasHydrated, setHasHydrated] = useState(false);
  const pendingRequests = reservationRequests.filter(
    (request) => request.status === "PENDENTE",
  );
  const approvedRequests = reservationRequests.filter(
    (request) => request.status === "APROVADA",
  );
  const rejectedRequests = reservationRequests.filter(
    (request) => request.status === "RECUSADA",
  );

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  return {
    spaces,
    currentRequester,
    initialDate,
    reservationRequests,
    pendingRequests,
    approvedRequests,
    rejectedRequests,
    hasHydrated,
  };
}
