'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { StatCard } from '@/components/composite/stat-card';
import { Users, DollarSign, FileText, Settings, Database, ArrowRight, GraduationCap } from 'lucide-react';

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
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight mb-2">Welcome to SWAB</h1>
        <p className="text-muted-foreground text-lg">This is the early version of the pre-event-day data prep center.</p>
      </div>

      <Separator className="mb-8" />

      {/* Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Total Mentors"
          value={stats?.totalMentors || 0}
          description="All mentors minus dropped"
          icon={Users}
          loading={loading}
        />

        <StatCard
          title="Need Fundraising"
          value={stats?.needFundraising || 0}
          description="Has not fundraised $75"
          icon={DollarSign}
          colorScheme="warning"
          loading={loading}
        />

        <StatCard
          title="Need GB Page"
          value={stats?.needPages || 0}
          description="Missing fundraising page on GB"
          icon={FileText}
          colorScheme="warning"
          loading={loading}
        />

        <StatCard
          title="Need Training Signup"
          value={stats?.needTraining || 0}
          description="Has not filled out training form"
          icon={GraduationCap}
          colorScheme="info"
          loading={loading}
        />
      </div>

      {/* Quick Actions */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold tracking-tight">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Sync Data
              </CardTitle>
              <CardDescription>Import the latest information from all sources</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/sync">
                <Button className="w-full group">
                  Go to Sync Dashboard
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Configure Settings
              </CardTitle>
              <CardDescription>Manage API keys and system preferences</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/settings">
                <Button variant="outline" className="w-full group">
                  Open Settings
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
