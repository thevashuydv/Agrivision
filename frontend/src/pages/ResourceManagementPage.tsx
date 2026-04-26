import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

export function ResourceManagementPage() {
  const { t } = useTranslation()
  const sections = [
    { key: 'water' as const, to: '/weather' },
    { key: 'fertilizer' as const, to: '/fertilizer' },
    { key: 'cost' as const, to: '/dashboard' },
  ]

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-ink">{t('resources.title')}</h1>
        <p className="mt-2 max-w-2xl text-ink-muted">{t('resources.subtitle')}</p>
      </header>

      <ul className="grid gap-4 md:grid-cols-3">
        {sections.map((s) => (
          <li key={s.key}>
            <Link
              to={s.to}
              className="av-card flex h-full flex-col p-5 transition hover:shadow-md"
            >
              <h2 className="text-lg font-semibold text-ink">{t(`resources.${s.key}.title`)}</h2>
              <p className="mt-2 flex-1 text-sm text-ink-muted">{t(`resources.${s.key}.body`)}</p>
              <span className="mt-4 text-sm font-medium text-indigo-cta-bright">{t('resources.open')} →</span>
            </Link>
          </li>
        ))}
      </ul>

      <section className="av-card p-6">
        <h2 className="text-lg font-semibold text-ink">{t('resources.schedule.title')}</h2>
        <ol className="mt-4 list-inside list-decimal space-y-2 text-sm text-ink/90">
          <li>{t('resources.schedule.s1')}</li>
          <li>{t('resources.schedule.s2')}</li>
          <li>{t('resources.schedule.s3')}</li>
        </ol>
      </section>
    </div>
  )
}
