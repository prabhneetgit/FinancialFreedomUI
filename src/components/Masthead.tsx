import { usePortfolio } from '../hooks/usePortfolio'

type Tab = 'Portfolio' | 'Analytics'

const navItems: { tab: Tab; label: string }[] = [
  { tab: 'Portfolio', label: 'Overview' },
  { tab: 'Analytics', label: 'Analytics' },
]

export const Masthead = ({
  activeTab,
  onTabChange,
}: {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
}) => {
  const { summary } = usePortfolio()
  const now = new Date()
  const date = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
  const etTime = now.toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit' })

  return (
    <header>
      <div className="flex h-14 items-center justify-between border-b border-line">
        <nav aria-label="Primary" className="flex gap-6">
          {navItems.map(({ tab, label }) => {
            const active = activeTab === tab
            return (
              <button
                key={tab}
                type="button"
                onClick={() => onTabChange(tab)}
                aria-current={active ? 'page' : undefined}
                className={`smallcaps h-11 text-xs transition-colors ${
                  active
                    ? 'text-ink underline decoration-2 underline-offset-[6px]'
                    : 'text-[#4a4a4a] hover:text-ink'
                }`}
              >
                {label}
              </button>
            )
          })}
        </nav>
        <span
          aria-hidden="true"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-ink text-xs font-bold"
        >
          JM
        </span>
      </div>

      <div className="flex flex-col items-center pt-7">
        <span className="font-serif text-[52px] font-semibold leading-none tracking-[-1.5px] md:text-[80px]">
          Financial Freedom
        </span>
        <div className="mt-5 w-full border-t-[3px] border-ink" />
        <div className="mt-[3px] w-full border-t border-ink" />
        <div className="smallcaps flex w-full flex-wrap justify-between gap-x-6 gap-y-1 border-b border-ink py-2.5 text-xs text-ink-soft">
          <span>{date}</span>
          <span>Morning briefing · {etTime} ET</span>
          <span>
            Jordan Mitchell
            {summary ? ` · $${Math.round(summary.totalValueCad).toLocaleString('en-CA')} CAD` : ''}
          </span>
        </div>
      </div>
    </header>
  )
}
