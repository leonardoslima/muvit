export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 py-16">
      <span className="mb-4 text-sm font-medium uppercase tracking-widest text-emerald-600">
        Muvit · em construção
      </span>
      <h1 className="text-5xl font-bold tracking-tight">
        Plataforma de treinos para personal trainers e alunos independentes.
      </h1>
      <p className="mt-6 text-lg text-zinc-600 dark:text-zinc-400">
        Dashboard web (Next.js) + app nativo (React Native) + API Fastify, com banco de exercícios,
        montagem de treinos, avaliações e acompanhamento de evolução.
      </p>
    </main>
  );
}
