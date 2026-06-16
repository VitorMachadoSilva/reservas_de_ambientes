"use server";

export async function expireStaleReservationRequests() {
  const pendingRequests = await prisma.$queryRawUnsafe<
    Array<{ id: string; date: string | Date; startTime: string | Date }>
  >(
    `SELECT "id", "date", "startTime"
     FROM "ReservationRequest"
     WHERE "status" IN ('PENDING', 'PENDENTE')`
  );

  const now = Date.now();
  const expiredIds = pendingRequests
    .filter((request) => {
      const date =
        request.date instanceof Date
          ? request.date.toISOString().slice(0, 10)
          : String(request.date).slice(0, 10);
      const rawStartTime = request.startTime instanceof Date ? request.startTime.toISOString() : String(request.startTime);
      const startTime = rawStartTime.includes("T")
        ? rawStartTime.split("T")[1]?.slice(0, 5)
        : rawStartTime.slice(0, 5);

      if (!date || !startTime) return false;

      return new Date(`${date}T${startTime}:00`).getTime() - now <= 60 * 60 * 1000;
    })
    .map((request) => request.id);

  if (expiredIds.length === 0) return 0;

  const ids = expiredIds.map((id) => `'${String(id).replaceAll("'", "''")}'`).join(",");

  await prisma.$executeRawUnsafe(
    `UPDATE "ReservationRequest"
     SET "status" = 'EXPIRADA'
     WHERE "id" IN (${ids}) AND "status" IN ('PENDING', 'PENDENTE')`
  );

  revalidatePath("/");
  revalidatePath("/painel");
  revalidatePath("/aprovacoes");
  revalidatePath("/minhas-reservas");
  return expiredIds.length;
}

import { Prisma, RequestStatus, SpaceType, UserRole } from "@prisma/client";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

const appPaths = [
  "/",
  "/painel",
  "/nova-solicitacao",
  "/minhas-reservas",
  "/aprovacoes",
  "/agenda",
  "/ambientes",
  "/cadastros",
  "/cadastros/academico",
  "/cadastros/ambientes",
  "/cadastros/aprovadores",
  "/cadastros/usuarios",
  "/cadastros/recursos",
];

function revalidateAppPaths() {
  for (const path of appPaths) {
    revalidatePath(path);
  }
}

function isUniqueConstraintError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
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

  redirect("/painel?toast=login-realizado");
}

export async function logoutUser() {
  const cookieStore = await cookies();
  cookieStore.delete("reservation_user_id");
  redirect("/login?toast=logout-realizado");
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
  const requestedDateForAdvanceRule = String(formData.get("date") || "");
  const requestedStartTimeForAdvanceRule = String(formData.get("startTime") || "");
  const userRoleForAdvanceRule = String(formData.get("userRole") || "");
  const requestedStartForAdvanceRule = new Date(
    `${requestedDateForAdvanceRule}T${requestedStartTimeForAdvanceRule}:00`
  );

  if (
    userRoleForAdvanceRule !== "ADMIN" &&
    requestedDateForAdvanceRule &&
    requestedStartTimeForAdvanceRule &&
    !Number.isNaN(requestedStartForAdvanceRule.getTime()) &&
    requestedStartForAdvanceRule.getTime() - Date.now() < 24 * 60 * 60 * 1000
  ) {
    redirect("/nova-solicitacao?toast=antecedencia-minima");
  }

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
    redirect("/nova-solicitacao?toast=alunos-invalidos");
  }

  if (endAt <= startAt) {
    redirect("/nova-solicitacao?toast=horario-invalido");
  }

  const conflict = await hasSpaceConflict(spaceId, startAt, endAt);
  if (conflict) {
    redirect("/nova-solicitacao?toast=conflito-horario");
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
    redirect("/aprovacoes?toast=sem-permissao-aprovacao");
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
    redirect("/aprovacoes?toast=conflito-aprovacao");
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
  const decisionNoteValue = formData.get("decisionNote");
  const decisionNote =
    typeof decisionNoteValue === "string" ? decisionNoteValue.trim() : "";

  if (!decisionNote) {
    redirect("/aprovacoes?toast=motivo-recusa-obrigatorio");
  }

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
    redirect("/aprovacoes?toast=sem-permissao-aprovacao");
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

export async function cancelOwnPendingReservation(formData: FormData) {
  const requestId = requiredString(formData, "requestId");
  const requesterId = requiredString(formData, "requesterId");
  const decisionNoteValue = formData.get("decisionNote");
  const decisionNote =
    typeof decisionNoteValue === "string" ? decisionNoteValue.trim() : "";

  if (!decisionNote) {
    redirect("/minhas-reservas?toast=motivo-cancelamento-obrigatorio");
  }

  const request = await prisma.reservationRequest.findUniqueOrThrow({
    where: { id: requestId },
  });

  if (request.requesterId !== requesterId) {
    redirect("/minhas-reservas?toast=sem-permissao-cancelamento");
  }

  if (request.status !== RequestStatus.PENDENTE) {
    redirect("/minhas-reservas?toast=cancelamento-indisponivel");
  }

  await prisma.reservationRequest.update({
    where: { id: requestId },
    data: {
      status: RequestStatus.CANCELADA,
      decisionNote,
    },
  });

  revalidateAppPaths();
  redirect("/minhas-reservas?toast=reserva-cancelada");
}

export async function createCourse(formData: FormData) {
  const name = requiredString(formData, "name");
  const code = requiredString(formData, "code").toUpperCase();

  try {
    await prisma.course.create({
      data: {
        name,
        code,
      },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      redirect("/cadastros/academico?toast=curso-duplicado");
    }

    throw error;
  }

  revalidateAppPaths();
  redirect("/cadastros/academico?toast=curso-criado");
}

export async function updateCourse(formData: FormData) {
  const id = requiredString(formData, "id");
  const name = requiredString(formData, "name");
  const code = requiredString(formData, "code").toUpperCase();

  try {
    await prisma.course.update({
      where: { id },
      data: { name, code },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      redirect("/cadastros/academico?toast=curso-duplicado");
    }

    throw error;
  }

  revalidateAppPaths();
  redirect("/cadastros/academico?toast=curso-atualizado");
}

export async function setCourseActive(formData: FormData) {
  const id = requiredString(formData, "id");
  const active = requiredString(formData, "active") === "true";

  await prisma.course.update({
    where: { id },
    data: { active },
  });

  revalidateAppPaths();
  redirect(
    active
      ? "/cadastros/academico?toast=curso-ativado"
      : "/cadastros/academico?toast=curso-inativado",
  );
}

export async function createDiscipline(formData: FormData) {
  const courseId = requiredString(formData, "courseId");
  const name = requiredString(formData, "name");
  const code = requiredString(formData, "code").toUpperCase();

  try {
    await prisma.discipline.create({
      data: {
        courseId,
        name,
        code,
      },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      redirect("/cadastros/academico?toast=disciplina-duplicada");
    }

    throw error;
  }

  revalidateAppPaths();
  redirect("/cadastros/academico?toast=disciplina-criada");
}

export async function updateDiscipline(formData: FormData) {
  const id = requiredString(formData, "id");
  const name = requiredString(formData, "name");
  const code = requiredString(formData, "code").toUpperCase();

  try {
    await prisma.discipline.update({
      where: { id },
      data: { name, code },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      redirect("/cadastros/academico?toast=disciplina-duplicada");
    }

    throw error;
  }

  revalidateAppPaths();
  redirect("/cadastros/academico?toast=disciplina-atualizada");
}

export async function setDisciplineActive(formData: FormData) {
  const id = requiredString(formData, "id");
  const active = requiredString(formData, "active") === "true";

  await prisma.discipline.update({
    where: { id },
    data: { active },
  });

  revalidateAppPaths();
  redirect(
    active
      ? "/cadastros/academico?toast=disciplina-ativada"
      : "/cadastros/academico?toast=disciplina-inativada",
  );
}

export async function createClassGroup(formData: FormData) {
  const courseId = requiredString(formData, "courseId");
  const name = requiredString(formData, "name");
  const period = requiredString(formData, "period");

  try {
    await prisma.classGroup.create({
      data: {
        courseId,
        name,
        period,
      },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      redirect("/cadastros/academico?toast=turma-duplicada");
    }

    throw error;
  }

  revalidateAppPaths();
  redirect("/cadastros/academico?toast=turma-criada");
}

export async function updateClassGroup(formData: FormData) {
  const id = requiredString(formData, "id");
  const name = requiredString(formData, "name");
  const period = requiredString(formData, "period");

  try {
    await prisma.classGroup.update({
      where: { id },
      data: { name, period },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      redirect("/cadastros/academico?toast=turma-duplicada");
    }

    throw error;
  }

  revalidateAppPaths();
  redirect("/cadastros/academico?toast=turma-atualizada");
}

export async function setClassGroupActive(formData: FormData) {
  const id = requiredString(formData, "id");
  const active = requiredString(formData, "active") === "true";

  await prisma.classGroup.update({
    where: { id },
    data: { active },
  });

  revalidateAppPaths();
  redirect(
    active
      ? "/cadastros/academico?toast=turma-ativada"
      : "/cadastros/academico?toast=turma-inativada",
  );
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
    redirect("/cadastros/ambientes?toast=capacidade-invalida");
  }

  try {
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
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      redirect("/cadastros/ambientes?toast=ambiente-duplicado");
    }

    throw error;
  }

  revalidateAppPaths();
  redirect("/cadastros/ambientes?toast=ambiente-criado");
}

export async function updateSpace(formData: FormData) {
  const id = requiredString(formData, "id");
  const name = requiredString(formData, "name");
  const type = requiredString(formData, "type");
  const capacity = Number(requiredString(formData, "capacity"));
  const location = requiredString(formData, "location");
  const notes = String(formData.get("notes") ?? "").trim();
  const resourceIds = formData.getAll("resourceIds").filter(
    (value): value is string => typeof value === "string",
  );

  if (!Number.isFinite(capacity) || capacity <= 0) {
    redirect("/cadastros/ambientes?toast=capacidade-invalida");
  }

  try {
    await prisma.$transaction([
      prisma.spaceResource.deleteMany({
        where: { spaceId: id },
      }),
      prisma.space.update({
        where: { id },
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
      }),
    ]);
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      redirect("/cadastros/ambientes?toast=ambiente-duplicado");
    }

    throw error;
  }

  revalidateAppPaths();
  redirect("/cadastros/ambientes?toast=ambiente-atualizado");
}

export async function setSpaceActive(formData: FormData) {
  const id = requiredString(formData, "id");
  const active = requiredString(formData, "active") === "true";

  await prisma.space.update({
    where: { id },
    data: { active },
  });

  revalidateAppPaths();
  redirect(
    active
      ? "/cadastros/ambientes?toast=ambiente-ativado"
      : "/cadastros/ambientes?toast=ambiente-inativado",
  );
}

export async function assignCourseApprover(formData: FormData) {
  const courseId = requiredString(formData, "courseId");
  const userId = requiredString(formData, "userId");

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
  });

  if (user.role !== UserRole.APROVADOR && user.role !== UserRole.ADMIN) {
    redirect("/cadastros/aprovadores?toast=aprovador-invalido");
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
  redirect("/cadastros/aprovadores?toast=aprovador-vinculado");
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
  redirect("/cadastros/aprovadores?toast=aprovador-removido");
}

export async function createUser(formData: FormData) {
  const name = requiredString(formData, "name");
  const email = requiredString(formData, "email").toLowerCase();
  const role = requiredString(formData, "role") as UserRole;

  try {
    await prisma.user.create({
      data: {
        name,
        email,
        role,
      },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      redirect("/cadastros/usuarios?toast=usuario-duplicado");
    }

    throw error;
  }

  revalidateAppPaths();
  redirect("/cadastros/usuarios?toast=usuario-criado");
}

export async function updateUser(formData: FormData) {
  const id = requiredString(formData, "id");
  const name = requiredString(formData, "name");
  const email = requiredString(formData, "email").toLowerCase();
  const role = requiredString(formData, "role") as UserRole;

  try {
    await prisma.user.update({
      where: { id },
      data: {
        name,
        email,
        role,
      },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      redirect("/cadastros/usuarios?toast=usuario-duplicado");
    }

    throw error;
  }

  revalidateAppPaths();
  redirect("/cadastros/usuarios?toast=usuario-atualizado");
}

export async function setUserActive(formData: FormData) {
  const id = requiredString(formData, "id");
  const active = requiredString(formData, "active") === "true";

  await prisma.user.update({
    where: { id },
    data: { active },
  });

  revalidateAppPaths();
  redirect(
    active
      ? "/cadastros/usuarios?toast=usuario-ativado"
      : "/cadastros/usuarios?toast=usuario-inativado",
  );
}

export async function createResource(formData: FormData) {
  const name = requiredString(formData, "name");

  try {
    await prisma.resource.create({
      data: { name },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      redirect("/cadastros/recursos?toast=recurso-duplicado");
    }

    throw error;
  }

  revalidateAppPaths();
  redirect("/cadastros/recursos?toast=recurso-criado");
}

export async function updateResource(formData: FormData) {
  const id = requiredString(formData, "id");
  const name = requiredString(formData, "name");

  try {
    await prisma.resource.update({
      where: { id },
      data: { name },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      redirect("/cadastros/recursos?toast=recurso-duplicado");
    }

    throw error;
  }

  revalidateAppPaths();
  redirect("/cadastros/recursos?toast=recurso-atualizado");
}

export async function setResourceActive(formData: FormData) {
  const id = requiredString(formData, "id");
  const active = requiredString(formData, "active") === "true";

  await prisma.resource.update({
    where: { id },
    data: { active },
  });

  revalidateAppPaths();
  redirect(
    active
      ? "/cadastros/recursos?toast=recurso-ativado"
      : "/cadastros/recursos?toast=recurso-inativado",
  );
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
