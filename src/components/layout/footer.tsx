export function Footer() {
  return (
    <footer className="border-t bg-muted/40 py-4">
      <div className="mx-auto max-w-7xl px-4 text-center text-xs text-muted-foreground sm:px-6 lg:px-8">
        <p>
          Données :{" "}
          <a
            href="https://www.data.gouv.fr/fr/datasets/surveillance-du-sars-cov-2-dans-les-eaux-usees-sumeau/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-foreground"
          >
            SUM&apos;Eau
          </a>
          {" — "}
          <a
            href="https://www.santepubliquefrance.fr"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-foreground"
          >
            Santé publique France
          </a>
        </p>
      </div>
    </footer>
  );
}
