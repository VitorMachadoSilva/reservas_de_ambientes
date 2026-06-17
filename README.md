# Reservas de Ambientes

Sistema para organizar reservas de salas, laboratorios e outros ambientes academicos.

## Stack inicial

- Next.js
- React
- TypeScript
- SQLite local
- Prisma

## Como iniciar localmente

1. Instale as dependencias:

```bash
npm install
```

2. Crie o arquivo `.env` a partir do exemplo:

```bash
copy .env.example .env
```

3. Crie o banco SQLite:

```bash
npm run db:push
```

4. Carregue dados iniciais:

```bash
npm run db:seed
```


5. Rode o projeto:

```bash
npm run dev
```

Depois acesse `http://localhost:3000`.

## Fluxo da primeira versao

- Docente cria solicitacao de reserva vinculada a curso, disciplina e turma.
- Sistema recomenda ambientes compativeis com horario, capacidade e recursos.
- Docente escolhe o ambiente desejado.
- Solicitacao fica pendente e bloqueia provisoriamente o horario.
- Aprovador do curso aprova ou recusa.
- Se o curso nao tiver aprovador, a solicitacao entra na fila administrativa geral.
