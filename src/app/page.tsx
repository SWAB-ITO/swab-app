export default function Home() {
  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        {/* Simple Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to SWAB</h1>
          <p className="text-gray-600">Manage mentors, communications, and fundraising</p>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-2xl font-bold text-blue-600">545</div>
            <div className="text-sm text-gray-600">Total Mentors</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-2xl font-bold text-orange-600">356</div>
            <div className="text-sm text-gray-600">Need Fundraising</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-2xl font-bold text-yellow-600">28</div>
            <div className="text-sm text-gray-600">Need Pages</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-2xl font-bold text-purple-600">164</div>
            <div className="text-sm text-gray-600">Need Setup</div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Card
              title="View Mentor Data"
              description="See all mentors and analytics"
              href="/mentors"
            />
            <Card
              title="Sync Data"
              description="Import latest information"
              href="/sync"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function Card({ title, description, href }: { title: string; description: string; href: string }) {
  return (
    <a
      href={href}
      className="block p-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
    >
      <h3 className="font-medium text-gray-900 mb-1">{title}</h3>
      <p className="text-sm text-gray-600">{description}</p>
    </a>
  );
}
