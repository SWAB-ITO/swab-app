'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { StatCard } from '@/components/composite/stat-card';
import { ActionCard } from '@/components/composite/action-card';
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
    <div className="min-h-screen bg-muted/20">
      <div className="container mx-auto p-6 md:p-8 max-w-7xl">
        {/* Header */}
        <div className="mb-10">
          <div className="inline-block mb-4">
            <span className="text-sm font-semibold text-primary bg-primary/10 px-4 py-2 rounded-full border border-primary/20">
              SWAB Mentor Program 2025
            </span>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-4 bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text">
            Dashboard
          </h1>
          <p className="text-muted-foreground text-xl md:text-2xl font-light max-w-2xl">
            Program overview and quick actions.
          </p>
        </div>

        {/* Overview Section */}
        <section className="mb-12 animate-fade-in">
          <div className="mb-6">
            <h2 className="text-3xl font-bold tracking-tight mb-2 flex items-center gap-3">
              <div className="w-1 h-8 bg-primary rounded-full"></div>
              Overview
            </h2>
            <p className="text-muted-foreground text-base ml-7">Key program metrics.</p>
          </div>
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
      </section>

      {/* Quick Actions Section */}
      <section>
        <div className="mb-6">
          <h2 className="text-3xl font-bold tracking-tight mb-2 flex items-center gap-3">
            <div className="w-1 h-8 bg-primary rounded-full"></div>
            Actions
          </h2>
          <p className="text-muted-foreground text-base ml-7">Navigate to key sections.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <ActionCard
            href="/mentors"
            icon={<Users className="h-6 w-6" />}
            title="View Mentors"
            description="Search and manage mentors."
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
            description="Import from Jotform & Givebutter."
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
            description="Configure API keys & settings."
            colorScheme="accent"
            footerContent={
              <>
                <Settings className="h-4 w-4" />
                <span>Setup wizard available</span>
              </>
            }
          />
        </div>
      </section>
      </div>
    </div>
  );
}
