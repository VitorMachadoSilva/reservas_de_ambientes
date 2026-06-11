export default function SetupPage() {
  return (
    <main className="setup-page">
      <section className="setup-panel">
        <p className="eyebrow">Configuracao inicial</p>
        <h1>Banco SQLite ainda nao possui os dados iniciais.</h1>
        <p>
          Rode <code>npm run db:push</code> e depois <code>npm run db:seed</code>.
          Em seguida, inicie novamente com <code>npm run dev</code>.
        </p>
      </section>
    </main>
  );
}
