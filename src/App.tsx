import { useState } from 'react'
import './App.css'
import { Masthead } from './components/Masthead'
import { PortfolioOverview } from './components/PortfolioOverview'
import { Analytics } from './components/Analytics'
import { PersistenceProvider } from './components/PersistenceProvider'

type Tab = 'Portfolio' | 'Analytics'

const App = () => {
  const [activeTab, setActiveTab] = useState<Tab>('Portfolio')

  return (
    <PersistenceProvider>
      <div className="min-h-screen bg-paper text-ink">
        <div className="mx-auto flex max-w-[1296px] flex-col px-5 pb-12 md:px-10">
          <Masthead activeTab={activeTab} onTabChange={setActiveTab} />
          <main className="flex flex-col gap-6 pt-8">
            {activeTab === 'Portfolio' ? (
              <PortfolioOverview />
            ) : (
              <Analytics onBackToPortfolio={() => setActiveTab('Portfolio')} />
            )}
          </main>
        </div>
      </div>
    </PersistenceProvider>
  )
}

export default App
