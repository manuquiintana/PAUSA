import { Card, PageTitle, Proximamente } from '../components/ui'

export default function HistoryPage() {
  return (
    <div>
      <PageTitle title="Mi histórico" subtitle="Tus check-ins y pausas. Solo los ves tú." />
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-neutro-oscuro">Aquí verás tu evolución, podrás descargar tu historial en CSV y borrarlo cuando quieras.</p>
          <Proximamente label="Fase 3" />
        </div>
      </Card>
    </div>
  )
}
