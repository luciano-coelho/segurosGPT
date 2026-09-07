import { CpfSearchForm } from "./cpf-search-form";
import { ValuePreview } from "./value-preview";
import { getDemoCpfPreviews } from "@/server/demo-cpf-previews";

// Demo chip status runs a real headless consent flow per CPF against the mock -
// must run per-request, not get baked into a build-time static snapshot.
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const demoCpfs = await getDemoCpfPreviews();

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="grid w-full max-w-4xl items-center gap-10 lg:grid-cols-[minmax(0,26rem)_minmax(0,20rem)]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-brand">Consulta de cliente</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
            Qual cliente você quer consultar?
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Digite o CPF para consultar o portfólio no Open Insurance — apólices já contratadas, comparação de
            propostas e alertas de sobreposição de cobertura.
          </p>

          <div className="mt-8">
            <CpfSearchForm demoCpfs={demoCpfs} />
          </div>
        </div>

        <div className="flex justify-center lg:justify-start">
          <ValuePreview />
        </div>
      </div>
    </main>
  );
}
