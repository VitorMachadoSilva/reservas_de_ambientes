export type View =
  | "dashboard"
  | "new-request"
  | "my-reservations"
  | "approvals"
  | "agenda"
  | "spaces"
  | "registrations-academic"
  | "registrations-spaces"
  | "registrations-approvers"
  | "registrations-users"
  | "registrations-resources";

export type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
};

export type SimpleCourse = {
  id: string;
  name: string;
  code: string;
  active: boolean;
};

export type Course = SimpleCourse & {
  approvers: {
    user: User;
  }[];
};

export type Discipline = {
  id: string;
  name: string;
  code: string;
  courseId: string;
  active: boolean;
};

export type ClassGroup = {
  id: string;
  name: string;
  period: string;
  courseId: string;
  active: boolean;
};

export type Resource = {
  id: string;
  name: string;
  active: boolean;
};

export type Space = {
  id: string;
  name: string;
  type: "SALA" | "LABORATORIO" | "AUDITORIO" | "OUTRO";
  capacity: number;
  location: string;
  notes: string | null;
  active: boolean;
  resources: {
    resource: Resource;
  }[];
};

export type ReservationRequest = {
  id: string;
  status: "PENDENTE" | "APROVADA" | "RECUSADA" | "CANCELADA" | "EXPIRADA";
  startAt: string | Date;
  endAt: string | Date;
  estimatedStudents: number;
  purpose: string;
  decisionNote: string | null;
  requester: User;
  assignedApprover: User | null;
  decidedBy: User | null;
  course: SimpleCourse;
  discipline: Discipline;
  classGroup: ClassGroup;
  space: {
    id: string;
    name: string;
    location: string;
  };
};

export type ReservationWorkspaceProps = {
  view: View;
  initialSidebarCollapsed?: boolean;
  currentUser: User;
  currentRequester: User;
  currentApprover: User;
  courses: Course[];
  allCourses: Course[];
  disciplines: Discipline[];
  allDisciplines: Discipline[];
  classGroups: ClassGroup[];
  allClassGroups: ClassGroup[];
  resources: Resource[];
  allResources: Resource[];
  spaces: Space[];
  allSpaces: Space[];
  users: User[];
  reservationRequests: ReservationRequest[];
  initialDate: string;
};
