import { StatCard } from '@/components/composite/stat-card';
import { DollarSign, Link } from 'lucide-react';

interface MentorFundraisingCardProps {
  amountRaised: number;
  fundraisingPageUrl?: string;
}

export function MentorFundraisingCard({ amountRaised, fundraisingPageUrl }: MentorFundraisingCardProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <StatCard
        title="Amount Raised"
        value={`$${amountRaised.toFixed(2)}`}
        icon={DollarSign}
        description="Fundraising total"
      />
      <StatCard
        title="Fundraising Page"
        value={fundraisingPageUrl ? 'Active' : 'Not Set Up'}
        icon={Link}
        description={
          fundraisingPageUrl ? (
            <a href={fundraisingPageUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              View Page
            </a>
          ) : 'No page link available'
        }
        colorScheme={fundraisingPageUrl ? 'success' : 'warning'}
      />
    </div>
  );
}
