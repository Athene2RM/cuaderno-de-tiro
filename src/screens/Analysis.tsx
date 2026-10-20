import { Card, Page, Stat } from '../ui/components';
import { useAll } from '../ui/data';
import { int } from '../ui/format';

/** La pantalla de análisis completa llega en la fase 2; de momento, totales. */
export function Analysis() {
  const ctx = useAll();
  if (!ctx) return null;
  return (
    <Page title="Análisis">
      <Card>
        <div className="stats-row">
          <Stat label="sesiones" value={int(ctx.sessions.length)} />
          <Stat label="series" value={int(ctx.series.length)} />
          <Stat label="disparos" value={int(ctx.shots.length)} />
        </div>
      </Card>
      <p className="muted">
        Los filtros, las vistas guardadas, las comparativas A frente a B y las gráficas llegan en la fase 2. Todo lo que
        registres ahora se podrá analizar entonces.
      </p>
    </Page>
  );
}
