"use server";

import { RequestStatus, SpaceType, UserRole } from "@prisma/client";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

const appPaths = [
  "/",
  "/nova-solicitacao",
  "/minhas-reservas",
  "/aprovacoes",
  "/agenda",
  "/ambientes",
  "/cadastros",
];

function revalidateAppPaths() {
  for (const path of appPaths) {
    revalidatePath(path);
  }
}

export async function loginAsUser(formData: FormData) {
  const userId = requiredString(formData, "userId");
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user || !user.active) {
    throw new Error("Usuario invalido ou inativo.");
  }

  const cookieStore = await cookies();
  cookieStore.set("reservation_user_id", user.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });

  redirect("/");
}

export async function logoutUser() {
  const cookieStore = await cookies();
  cookieStore.delete("reservation_user_id");
  redirect("/login");
}

function requiredString(formData: FormData, key: string) {
  const value = formData.get(key);
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Campo obrigatorio ausente: ${key}`);
  }

  return value.trim();
}

function buildDateTime(date: string, time: string) {
  return new Date(`${date}T${time}:00`);
}

async function hasSpaceConflict(spaceId: string, startAt: Date, endAt: Date) {
  const conflict = await prisma.reservationRequest.findFirst({
    where: {
      spaceId,
      status: {
        in: [RequestStatus.PENDENTE, RequestStatus.APROVADA],
      },
      startAt: {
        lt: endAt,
      },
      endAt: {
        gt: startAt,
      },
    },
  });

  return Boolean(conflict);
}

export async function createReservationRequest(formData: FormData) {
  const requesterId = requiredString(formData, "requesterId");
  const courseId = requiredString(formData, "courseId");
  const disciplineId = requiredString(formData, "disciplineId");
  const classGroupId = requiredString(formData, "classGroupId");
  const spaceId = requiredString(formData, "spaceId");
  const date = requiredString(formData, "date");
  const startTime = requiredString(formData, "startTime");
  const endTime = requiredString(formData, "endTime");
  const purpose = requiredString(formData, "purpose");
  const estimatedStudents = Number(requiredString(formData, "estimatedStudents"));
  const startAt = buildDateTime(date, startTime);
  const endAt = buildDateTime(date, endTime);

  if (!Number.isFinite(estimatedStudents) || estimatedStudents <= 0) {
    throw new Error("Informe uma quantidade valida de alunos.");
  }

  if (endAt <= startAt) {
    throw new Error("O horario final precisa ser maior que o horario inicial.");
  }

  const conflict = await hasSpaceConflict(spaceId, startAt, endAt);
  if (conflict) {
    throw new Error("Esse ambiente ja possui uma reserva aprovada ou pendente nesse horario.");
  }

  const courseApprover = await prisma.courseApprover.findFirst({
    where: { courseId },
    include: { user: true },
  });

  await prisma.reservationRequest.create({
    data: {
      requesterId,
      courseId,
      disciplineId,
      classGroupId,
      spaceId,
      assignedApproverId: courseApprover?.userId,
      estimatedStudents,
      purpose,
      startAt,
      endAt,
      status: RequestStatus.PENDENTE,
    },
  });

  revalidateAppPaths();
  redirect("/minhas-reservas?toast=solicitacao-enviada");
}

export async function approveReservationRequest(formData: FormData) {
  const requestId = requiredString(formData, "requestId");
  const decidedById = requiredString(formData, "decidedById");

  const request = await prisma.reservationRequest.findUniqueOrThrow({
    where: { id: requestId },
    include: {
      course: {
        include: {
          approvers: true,
        },
      },
    },
  });
  const approver = await prisma.user.findUniqueOrThrow({
    where: { id: decidedById },
  });

  const canApprove =
    approver.role === UserRole.ADMIN ||
    request.course.approvers.some((item) => item.userId === decidedById);

  if (!canApprove) {
    throw new Error("Este usuario nao pode aprovar solicitacoes deste curso.");
  }

  const conflict = await prisma.reservationRequest.findFirst({
    where: {
      id: {
        not: requestId,
      },
      spaceId: request.spaceId,
      status: RequestStatus.APROVADA,
      startAt: {
        lt: request.endAt,
      },
      endAt: {
        gt: request.startAt,
      },
    },
  });

  if (conflict) {
    throw new Error("Nao e possivel aprovar: ja existe reserva aprovada nesse horario.");
  }

  await prisma.reservationRequest.update({
    where: { id: requestId },
    data: {
      status: RequestStatus.APROVADA,
      decidedById,
      decisionNote: "Aprovada pela coordenacao.",
    },
  });

  revalidateAppPaths();
  redirect("/aprovacoes?toast=solicitacao-aprovada");
}

export async function rejectReservationRequest(formData: FormData) {
  const requestId = requiredString(formData, "requestId");
  const decidedById = requiredString(formData, "decidedById");
  const decisionNote = requiredString(formData, "decisionNote");

  const request = await prisma.reservationRequest.findUniqueOrThrow({
    where: { id: requestId },
    include: {
      course: {
        include: {
          approvers: true,
        },
      },
    },
  });
  const approver = await prisma.user.findUniqueOrThrow({
    where: { id: decidedById },
  });
  const canReject =
    approver.role === UserRole.ADMIN ||
    request.course.approvers.some((item) => item.userId === decidedById);

  if (!canReject) {
    throw new Error("Este usuario nao pode recusar solicitacoes deste curso.");
  }

  await prisma.reservationRequest.update({
    where: { id: requestId },
    data: {
      status: RequestStatus.RECUSADA,
      decidedById,
      decisionNote,
    },
  });

  revalidateAppPaths();
  redirect("/aprovacoes?toast=solicitacao-recusada");
}

export async function createCourse(formData: FormData) {
  const name = requiredString(formData, "name");
  const code = requiredString(formData, "code").toUpperCase();

  await prisma.course.create({
    data: {
      name,
      code,
    },
  });

  revalidateAppPaths();
  redirect("/cadastros?toast=curso-criado");
}

export async function createDiscipline(formData: FormData) {
  const courseId = requiredString(formData, "courseId");
  const name = requiredString(formData, "name");
  const code = requiredString(formData, "code").toUpperCase();

  await prisma.discipline.create({
    data: {
      courseId,
      name,
      code,
    },
  });

  revalidateAppPaths();
  redirect("/cadastros?toast=disciplina-criada");
}

export async function createClassGroup(formData: FormData) {
  const courseId = requiredString(formData, "courseId");
  const name = requiredString(formData, "name");
  const period = requiredString(formData, "period");

  await prisma.classGroup.create({
    data: {
      courseId,
      name,
      period,
    },
  });

  revalidateAppPaths();
  redirect("/cadastros?toast=turma-criada");
}

export async function createSpace(formData: FormData) {
  const name = requiredString(formData, "name");
  const type = requiredString(formData, "type");
  const capacity = Number(requiredString(formData, "capacity"));
  const location = requiredString(formData, "location");
  const notes = String(formData.get("notes") ?? "").trim();
  const resourceIds = formData.getAll("resourceIds").filter(
    (value): value is string => typeof value === "string",
  );

  if (!Number.isFinite(capacity) || capacity <= 0) {
    throw new Error("Informe uma capacidade valida.");
  }

  await prisma.space.create({
    data: {
      name,
      type: type as SpaceType,
      capacity,
      location,
      notes: notes || null,
      resources: {
        create: resourceIds.map((resourceId) => ({
          resourceId,
        })),
      },
    },
  });

  revalidateAppPaths();
  redirect("/cadastros?toast=ambiente-criado");
}

export async function assignCourseApprover(formData: FormData) {
  const courseId = requiredString(formData, "courseId");
  const userId = requiredString(formData, "userId");

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
  });

  if (user.role !== UserRole.APROVADOR && user.role !== UserRole.ADMIN) {
    throw new Error("Selecione um usuario aprovador ou administrador.");
  }

  await prisma.courseApprover.upsert({
    where: {
      courseId_userId: {
        courseId,
        userId,
      },
    },
    update: {},
    create: {
      courseId,
      userId,
    },
  });

  revalidateAppPaths();
  redirect("/cadastros?toast=aprovador-vinculado");
}

export async function removeCourseApprover(formData: FormData) {
  const courseId = requiredString(formData, "courseId");
  const userId = requiredString(formData, "userId");

  await prisma.courseApprover.delete({
    where: {
      courseId_userId: {
        courseId,
        userId,
      },
    },
  });

  revalidateAppPaths();
  redirect("/cadastros?toast=aprovador-removido");
}

export async function ensureDemoUsers() {
  const docente = await prisma.user.findFirst({
    where: { role: UserRole.DOCENTE },
    orderBy: { createdAt: "asc" },
  });

  const approver = await prisma.user.findFirst({
    where: {
      role: {
        in: [UserRole.APROVADOR, UserRole.ADMIN],
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return { docente, approver };
}
