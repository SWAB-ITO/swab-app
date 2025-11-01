'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { StatCard } from '@/components/composite/stat-card';
import { ActionCard } from '@/components/composite/action-card';
import { Users, DollarSign, FileText, Settings, Database, GraduationCap } from 'lucide-react';
import { PageLayout } from '@/components/layout/page-layout';
import { PageSection } from '@/components/layout/page-section';

interface DashboardStats {
  totalMentors: number;
  needFundraising: number;
  needPages: number;
  needTraining: number;
}

export default function Home() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetch('/api/dashboard/stats');
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  return (
    <PageLayout
      badgeText="SWAB Mentor Program 2025"
      title="Dashboard"
    >
      <PageSection
        className="animate-fade-in"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Mentors"
            value={stats?.totalMentors || 0}
            description="Active mentors"
            icon={Users}
            loading={loading}
          />

          <StatCard
            title="Need Fundraising"
            value={stats?.needFundraising || 0}
            description="Below $75 raised"
            icon={DollarSign}
            colorScheme="warning"
            loading={loading}
          />

          <StatCard
            title="Need GB Page"
            value={stats?.needPages || 0}
            description="Missing GB page"
            icon={FileText}
            colorScheme="warning"
            loading={loading}
          />

          <StatCard
            title="Need Training Signup"
            value={stats?.needTraining || 0}
            description="No training signup"
            icon={GraduationCap}
            colorScheme="info"
            loading={loading}
          />
        </div>
      </PageSection>

      <PageSection
        title="Actions"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <ActionCard
            href="/mentors"
            icon={<Users className="h-6 w-6" />}
            title="View Mentors"
            colorScheme="info"
            footerContent={
              <>
                <Users className="h-4 w-4" />
                <span>{stats?.totalMentors || 0} mentors</span>
              </>
            }
          />
          <ActionCard
            href="/sync"
            icon={<Database className="h-6 w-6" />}
            title="Sync Data"
            colorScheme="primary"
            footerContent={
              <>
                <div className="w-2 h-2 bg-success-DEFAULT rounded-full animate-pulse"></div>
                <span>Ready to sync</span>
              </>
            }
          />
          <ActionCard
            href="/settings"
            icon={<Settings className="h-6 w-6" />}
            title="Configure Settings"
            colorScheme="accent"
            footerContent={
              <>
                <Settings className="h-4 w-4" />
                <span>Setup wizard available</span>
              </>
            }
          />
        </div>
      </PageSection>
    </PageLayout>
  );
}
