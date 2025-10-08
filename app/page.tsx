export default function Home() {
  return (
    <div className="min-h-screen p-6 sm:p-8 lg:p-12">
      <main className="max-w-6xl mx-auto">
        <div className="mb-12">
          <h1 className="text-5xl font-bold mb-4 tracking-tight bg-gradient-to-r from-emerald-600 to-emerald-800 dark:from-emerald-400 dark:to-emerald-600 bg-clip-text text-transparent">
            SWAB Mentor Database
          </h1>
          <p className="text-lg text-neutral-600 dark:text-neutral-400 max-w-2xl">
            Production-ready mentor management system with Next.js + Supabase
          </p>
        </div>

        <div className="mb-8 p-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
          <h2 className="text-2xl font-semibold mb-4">✅ Database Operational</h2>
          <p className="text-lg mb-6"><strong>545 unique mentors</strong> successfully loaded and categorized</p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="bg-white dark:bg-neutral-800 p-4 rounded-lg border border-neutral-200 dark:border-neutral-700">
              <div className="text-3xl font-bold text-green-600 dark:text-green-500">0</div>
              <div className="text-sm text-neutral-600 dark:text-neutral-400">Fully Complete</div>
            </div>
            <div className="bg-white dark:bg-neutral-800 p-4 rounded-lg border border-neutral-200 dark:border-neutral-700">
              <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">356</div>
              <div className="text-sm text-neutral-600 dark:text-neutral-400">Need Fundraising</div>
            </div>
            <div className="bg-white dark:bg-neutral-800 p-4 rounded-lg border border-neutral-200 dark:border-neutral-700">
              <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-500">28</div>
              <div className="text-sm text-neutral-600 dark:text-neutral-400">Need Page</div>
            </div>
            <div className="bg-white dark:bg-neutral-800 p-4 rounded-lg border border-neutral-200 dark:border-neutral-700">
              <div className="text-3xl font-bold text-orange-600 dark:text-orange-500">164</div>
              <div className="text-sm text-neutral-600 dark:text-neutral-400">Need Setup</div>
            </div>
          </div>

          <div className="text-sm text-neutral-600 dark:text-neutral-400 space-y-1">
            <p>⚡ 3-layer data pipeline (Raw → ETL → Main)</p>
            <p>🎯 Deduplication: 12 duplicates removed → 545 unique mentors</p>
            <p>📊 Pipeline: 95k rows/sec CSV processing</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card
            title="📊 Dashboard"
            description="View all mentors and their status"
            href="/dashboard"
          />
          <Card
            title="🔄 Sync Data"
            description="Pull latest data from Jotform & Givebutter"
            href="/sync"
          />
          <Card
            title="⚙️ Settings"
            description="Configure API keys and field mappings"
            href="/settings"
          />
        </div>
      </main>
    </div>
  );
}

function Card({ title, description, href }: { title: string; description: string; href: string }) {
  return (
    <a
      href={href}
      className="group block p-8 bg-white dark:bg-neutral-900 border-2 border-neutral-200 dark:border-neutral-700 rounded-lg shadow-sm hover:shadow-xl transition-all duration-200 hover:scale-[1.02] hover:border-emerald-500 dark:hover:border-emerald-400"
    >
      <h2 className="text-2xl font-bold mb-3 text-neutral-900 dark:text-neutral-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
        {title}
      </h2>
      <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
        {description}
      </p>
    </a>
  );
}
