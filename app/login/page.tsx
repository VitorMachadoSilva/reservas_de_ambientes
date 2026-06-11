import { loginAsUser } from "@/app/actions";
import { prisma } from "@/lib/prisma";

const roleLabels: Record<string, string> = {
  DOCENTE: "Docente",
  APROVADOR: "Aprovador",
  ADMIN: "Administrador",
  DISCENTE: "Discente",
};

export default async function LoginPage() {
  const users = await prisma.user.findMany({
    where: { active: true },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });

  return (
    <main className="login-page">
      <section className="login-hero">
        <p className="eyebrow">Reservas de Ambientes</p>
        <h1>Entrar no sistema</h1>
        <p>
          Escolha um perfil para simular a experiencia de uso. Depois trocamos
          esta etapa por login real com credenciais da instituicao.
        </p>
      </section>

      <section className="login-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Acesso</p>
            <h2>Usuarios disponiveis</h2>
          </div>
        </div>

        <div className="login-user-grid">
          {users.map((user) => (
            <form action={loginAsUser} className="login-user-card" key={user.id}>
              <input type="hidden" name="userId" value={user.id} />
              <span>{roleLabels[user.role]}</span>
              <strong>{user.name}</strong>
              <small>{user.email}</small>
              <button className="primary-button" type="submit">
                Entrar como {roleLabels[user.role]}
              </button>
            </form>
          ))}
        </div>
      </section>
    </main>
  );
}
