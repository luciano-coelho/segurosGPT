import type { OverlapInsight } from "@/domain/overlap-insight";
import { StatusCard } from "@/components/status";
import { OverlapFindingItem } from "./overlap-finding-item";

export type { OverlapInsight } from "@/domain/overlap-insight";
export { computeOverlapInsight } from "@/domain/overlap-insight";

/** Real Overlap Engine run over this specific customer's live, coverage-level data (see src/server/customer-portfolio.ts). */
export function RealOverlapSection({ insight }: { insight: OverlapInsight }) {
  const { withCoverageCount, overlaps } = insight;

  if (withCoverageCount === 0) {
    return (
      <StatusCard status="neutral">Não há apólices com detalhe de cobertura disponível para este cliente no momento.</StatusCard>
    );
  }

  if (overlaps.length === 0) {
    return (
      <StatusCard status="positive">
        Nenhuma cobertura duplicada — as {withCoverageCount}{" "}
        {withCoverageCount === 1 ? "apólice analisada" : "apólices analisadas"} deste cliente não se repetem entre
        si.
      </StatusCard>
    );
  }

  return (
    <ul className="space-y-2.5">
      {overlaps.map((f) => (
        <OverlapFindingItem key={f.canonicalKey} finding={f} defaultOpen={overlaps.length === 1} />
      ))}
    </ul>
  );
}
