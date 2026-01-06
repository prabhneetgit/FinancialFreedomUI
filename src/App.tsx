import { useState } from 'react'
import './App.css'
import { Header } from './components/Header'
import { PortfolioOverview } from './components/PortfolioOverview'
import { Analytics } from './components/Analytics'

type Tab = 'Portfolio' | 'Analytics'

const App = () => {
  const [activeTab, setActiveTab] = useState<Tab>('Analytics')

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <div className="mx-auto flex max-w-screen-2xl flex-col gap-6 px-4 py-8 md:px-8">
        <Header activeTab={activeTab} onTabChange={setActiveTab} />
        <main className="flex flex-col gap-6">
          {activeTab === 'Portfolio' ? (
            <PortfolioOverview />
          ) : (
            <Analytics onBackToPortfolio={() => setActiveTab('Portfolio')} />
          )}
        </main>
      </div>
    </div>
  )
}

export default App
