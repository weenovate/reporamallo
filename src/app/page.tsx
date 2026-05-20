export default function HomePage() {
  return (
    <main className="container mx-auto py-16">
      <h1 className="text-4xl font-bold tracking-tight text-foreground">Repositorio Ramallo</h1>
      <p className="mt-4 text-muted-foreground">
        Scaffolding inicial. Próximas fases: auth, navbar/temas, CRUD entidades y documentos.
      </p>
      <div className="mt-8 grid grid-cols-3 gap-4">
        <div className="rounded-md bg-primary p-6 text-primary-foreground">Primario</div>
        <div className="rounded-md bg-accent p-6 text-accent-foreground">Acento</div>
        <div className="rounded-md bg-secondary p-6 text-secondary-foreground">Secundario</div>
      </div>
    </main>
  );
}
