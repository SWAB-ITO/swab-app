export default function Home() {
  return (
    <div className="min-h-screen p-8">
      <main className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-4">
          SWAB Mentor Database
        </h1>
        <p className="text-gray-600 mb-8">
          Production-ready mentor management system with Next.js + Supabase
        </p>

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
      className="block p-6 bg-white border border-gray-200 rounded-lg shadow hover:bg-gray-100"
    >
      <h2 className="text-xl font-semibold mb-2">{title}</h2>
      <p className="text-gray-600">{description}</p>
    </a>
  );
}
