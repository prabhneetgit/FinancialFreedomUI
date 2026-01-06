type Tab = 'Portfolio' | 'Analytics'

export const Header = ({
  activeTab,
  onTabChange,
}: {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
}) => {
  return (
    <header className="flex items-center justify-between border-b border-slate-200 pb-4">
      <div className="flex items-center gap-6">
        <button
          type="button"
          onClick={() => onTabChange('Portfolio')}
          className={`text-sm font-semibold transition-colors ${
            activeTab === 'Portfolio'
              ? 'text-slate-900 border-b-2 border-slate-900 pb-1'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Portfolio
        </button>
        <button
          type="button"
          onClick={() => onTabChange('Analytics')}
          className={`text-sm font-semibold transition-colors ${
            activeTab === 'Analytics'
              ? 'text-slate-900 border-b-2 border-slate-900 pb-1'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Analytics
        </button>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold text-slate-900">Jordan Mitchell</span>
        <div className="h-8 w-8 overflow-hidden rounded-full bg-slate-200">
          <img
            src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop"
            alt="Jordan Mitchell"
            className="h-full w-full object-cover"
          />
        </div>
      </div>
    </header>
  )
}
