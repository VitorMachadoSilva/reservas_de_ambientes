import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import { cookies } from "next/headers";

function serialize<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

export const loginRequired = "LOGIN_REQUIRED" as const;

export function todayInputValue() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export async function getReservationPageData() {
  const cookieStore = await cookies();
  const selectedUserId = cookieStore.get("reservation_user_id")?.value;

  if (!selectedUserId) {
    return loginRequired;
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: selectedUserId },
  });

  if (!currentUser || !currentUser.active) {
    return loginRequired;
  }

  const docente = await prisma.user.findFirst({
    where:
      currentUser.role === UserRole.DOCENTE
        ? { id: currentUser.id }
        : { role: UserRole.DOCENTE },
    orderBy: { createdAt: "asc" },
  });

  const approver = await prisma.user.findFirst({
    where:
      currentUser.role === UserRole.APROVADOR || currentUser.role === UserRole.ADMIN
        ? { id: currentUser.id }
        : {
            role: {
              in: [UserRole.APROVADOR, UserRole.ADMIN],
            },
          },
    orderBy: { createdAt: "asc" },
  });

  if (!docente || !approver) {
    return null;
  }

  const [
    courses,
    disciplines,
    classGroups,
    resources,
    spaces,
    users,
    reservationRequests,
  ] = await Promise.all([
    prisma.course.findMany({
      where: { active: true },
      include: {
        approvers: {
          include: { user: true },
        },
      },
      orderBy: { name: "asc" },
    }),
    prisma.discipline.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    }),
    prisma.classGroup.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    }),
    prisma.resource.findMany({
      orderBy: { name: "asc" },
    }),
    prisma.space.findMany({
      where: { active: true },
      include: {
        resources: {
          include: { resource: true },
        },
      },
      orderBy: [{ type: "asc" }, { name: "asc" }],
    }),
    prisma.user.findMany({
      where: { active: true },
      orderBy: [{ role: "asc" }, { name: "asc" }],
    }),
    prisma.reservationRequest.findMany({
      include: {
        requester: true,
        assignedApprover: true,
        decidedBy: true,
        course: true,
        discipline: true,
        classGroup: true,
        space: true,
      },
      orderBy: { createdAt: "desc" },
      take: 60,
    }),
  ]);

  return {
    currentUser: serialize(currentUser),
    currentRequester: serialize(docente),
    currentApprover: serialize(approver),
    courses: serialize(courses),
    disciplines: serialize(disciplines),
    classGroups: serialize(classGroups),
    resources: serialize(resources),
    spaces: serialize(spaces),
    users: serialize(users),
    reservationRequests: serialize(reservationRequests),
    initialDate: todayInputValue(),
  };
}
