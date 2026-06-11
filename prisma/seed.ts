import { PrismaClient, SpaceType, UserRole } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const docente = await prisma.user.upsert({
    where: { email: "docente@instituicao.edu" },
    update: {},
    create: {
      name: "Prof. Ana Martins",
      email: "docente@instituicao.edu",
      role: UserRole.DOCENTE,
    },
  });

  const aprovador = await prisma.user.upsert({
    where: { email: "coordenacao@instituicao.edu" },
    update: {},
    create: {
      name: "Coord. Rafael Lima",
      email: "coordenacao@instituicao.edu",
      role: UserRole.APROVADOR,
    },
  });

  await prisma.user.upsert({
    where: { email: "admin@instituicao.edu" },
    update: {},
    create: {
      name: "Secretaria Academica",
      email: "admin@instituicao.edu",
      role: UserRole.ADMIN,
    },
  });

  const software = await prisma.course.upsert({
    where: { code: "ES" },
    update: {},
    create: {
      name: "Engenharia de Software",
      code: "ES",
    },
  });

  const administracao = await prisma.course.upsert({
    where: { code: "ADM" },
    update: {},
    create: {
      name: "Administracao",
      code: "ADM",
    },
  });

  await prisma.courseApprover.upsert({
    where: {
      courseId_userId: {
        courseId: software.id,
        userId: aprovador.id,
      },
    },
    update: {},
    create: {
      courseId: software.id,
      userId: aprovador.id,
    },
  });

  const disciplines = [
    { name: "Banco de Dados II", code: "BD2", courseId: software.id },
    { name: "Arquitetura de Software", code: "ARQ", courseId: software.id },
    { name: "Gestao de Projetos", code: "GP", courseId: administracao.id },
  ];

  for (const discipline of disciplines) {
    await prisma.discipline.upsert({
      where: {
        courseId_code: {
          courseId: discipline.courseId,
          code: discipline.code,
        },
      },
      update: {
        name: discipline.name,
      },
      create: discipline,
    });
  }

  const classGroups = [
    { name: "ES-5A", period: "Noturno", courseId: software.id },
    { name: "ES-3B", period: "Matutino", courseId: software.id },
    { name: "ADM-2A", period: "Noturno", courseId: administracao.id },
  ];

  for (const classGroup of classGroups) {
    await prisma.classGroup.upsert({
      where: {
        courseId_name: {
          courseId: classGroup.courseId,
          name: classGroup.name,
        },
      },
      update: {
        period: classGroup.period,
      },
      create: classGroup,
    });
  }

  const resourceNames = [
    "Projetor",
    "Computadores",
    "Internet cabeada",
    "Ar-condicionado",
    "Acessibilidade",
    "Quadro branco",
  ];

  const resources = await Promise.all(
    resourceNames.map((name) =>
      prisma.resource.upsert({
        where: { name },
        update: {},
        create: { name },
      }),
    ),
  );

  const findResource = (name: string) =>
    resources.find((resource) => resource.name === name)!;

  const spaces = [
    {
      name: "Laboratorio de Informatica 01",
      type: SpaceType.LABORATORIO,
      capacity: 32,
      location: "Bloco B - 2o andar",
      notes: "Indicado para aulas praticas com uso de computadores.",
      resources: ["Projetor", "Computadores", "Internet cabeada", "Ar-condicionado"],
    },
    {
      name: "Laboratorio Maker",
      type: SpaceType.LABORATORIO,
      capacity: 24,
      location: "Bloco C - Terreo",
      notes: "Espaco para atividades praticas e projetos.",
      resources: ["Projetor", "Computadores", "Acessibilidade"],
    },
    {
      name: "Sala 204",
      type: SpaceType.SALA,
      capacity: 45,
      location: "Bloco A - 2o andar",
      notes: "Sala teorica ampla.",
      resources: ["Projetor", "Quadro branco", "Ar-condicionado"],
    },
    {
      name: "Auditorio Central",
      type: SpaceType.AUDITORIO,
      capacity: 120,
      location: "Bloco Principal",
      notes: "Recomendado para eventos, bancas e palestras.",
      resources: ["Projetor", "Acessibilidade", "Ar-condicionado"],
    },
  ];

  for (const item of spaces) {
    const space = await prisma.space.upsert({
      where: { name: item.name },
      update: {
        type: item.type,
        capacity: item.capacity,
        location: item.location,
        notes: item.notes,
      },
      create: {
        name: item.name,
        type: item.type,
        capacity: item.capacity,
        location: item.location,
        notes: item.notes,
      },
    });

    for (const resourceName of item.resources) {
      await prisma.spaceResource.upsert({
        where: {
          spaceId_resourceId: {
            spaceId: space.id,
            resourceId: findResource(resourceName).id,
          },
        },
        update: {},
        create: {
          spaceId: space.id,
          resourceId: findResource(resourceName).id,
        },
      });
    }
  }

  console.log(`Dados iniciais criados. Docente de exemplo: ${docente.email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
