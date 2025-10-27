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
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <div className="container mx-auto p-6 md:p-8 max-w-7xl">
        {/* Header */}
        <div className="mb-12">
          <div className="inline-block mb-4">
            <span className="text-sm font-semibold text-primary bg-primary/10 px-4 py-2 rounded-full border border-primary/20">
              SWAB Mentor Program 2025
            </span>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-4 bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text">
            Welcome to SWAB
          </h1>
          <p className="text-muted-foreground text-xl md:text-2xl font-light max-w-2xl">
            Your central hub for pre-event data preparation and mentor management
          </p>
        </div>

        {/* Overview Section */}
        <section className="mb-14 animate-fade-in">
          <div className="mb-8">
            <h2 className="text-3xl font-bold tracking-tight mb-2 flex items-center gap-3">
              <div className="w-1 h-8 bg-primary rounded-full"></div>
              Program Overview
            </h2>
            <p className="text-muted-foreground text-base ml-7">Current mentor program statistics and metrics</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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
      </section>

      {/* Quick Actions Section */}
      <section>
        <div className="mb-8">
          <h2 className="text-3xl font-bold tracking-tight mb-2 flex items-center gap-3">
            <div className="w-1 h-8 bg-primary rounded-full"></div>
            Quick Actions
          </h2>
          <p className="text-muted-foreground text-base ml-7">Common tasks and operations</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link href="/mentors" className="group">
            <Card className="h-full hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer bg-gradient-to-br from-card via-card to-info/5 border-border/40">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-3 bg-info/10 rounded-xl group-hover:bg-info/20 transition-colors">
                    <Users className="h-6 w-6 text-info-text" />
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-info-text group-hover:translate-x-1 transition-all duration-300" />
                </div>
                <CardTitle className="text-2xl group-hover:text-info-text transition-colors">
                  View Mentors
                </CardTitle>
                <CardDescription className="text-base mt-2">
                  Search and manage mentor information
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>{stats?.totalMentors || 0} mentors</span>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/sync" className="group">
            <Card className="h-full hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer bg-gradient-to-br from-card via-card to-primary/5 border-border/40">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-3 bg-primary/10 rounded-xl group-hover:bg-primary/20 transition-colors">
                    <Database className="h-6 w-6 text-primary" />
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all duration-300" />
                </div>
                <CardTitle className="text-2xl group-hover:text-primary transition-colors">
                  Sync Data
                </CardTitle>
                <CardDescription className="text-base mt-2">
                  Import the latest information from Jotform and Givebutter
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="w-2 h-2 bg-success-DEFAULT rounded-full animate-pulse"></div>
                  <span>Ready to sync</span>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/settings" className="group">
            <Card className="h-full hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer bg-gradient-to-br from-card via-card to-accent/5 border-border/40">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-3 bg-accent/10 rounded-xl group-hover:bg-accent/20 transition-colors">
                    <Settings className="h-6 w-6 text-accent" />
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-accent group-hover:translate-x-1 transition-all duration-300" />
                </div>
                <CardTitle className="text-2xl group-hover:text-accent transition-colors">
                  Configure Settings
                </CardTitle>
                <CardDescription className="text-base mt-2">
                  Manage API keys and system preferences
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Settings className="h-4 w-4" />
                  <span>Setup wizard available</span>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </section>
      </div>
    </div>
  );
}
