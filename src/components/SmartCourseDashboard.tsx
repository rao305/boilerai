// SmartCourse Analytics Dashboard Component
// Provides real-time monitoring of SmartCourse recommendation quality metrics

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { smartCourseService, SmartCourseMetrics } from '@/services/smartCourseService';

interface SmartCourseSession {
  id: string;
  timestamp: Date;
  query: string;
  metrics: SmartCourseMetrics;
  context: string;
  recommendations: number;
}

interface SmartCourseDashboardProps {
  className?: string;
}

export const SmartCourseDashboard: React.FC<SmartCourseDashboardProps> = ({ className }) => {
  const [sessions, setSessions] = useState<SmartCourseSession[]>([]);
  const [summary, setSummary] = useState<{
    totalSessions: number;
    averageMetrics: SmartCourseMetrics;
    qualityTrend: 'improving' | 'stable' | 'declining';
    topContext: string;
  }>({
    totalSessions: 0,
    averageMetrics: { planScore: 0, personalScore: 0, lift: 0, recall: 0, latency: 0 },
    qualityTrend: 'stable',
    topContext: 'full_context'
  });

  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h');

  useEffect(() => {
    loadSmartCourseSessions();
    const interval = setInterval(loadSmartCourseSessions, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [timeRange]);

  const loadSmartCourseSessions = () => {
    // Load sessions from localStorage or API
    const storedSessions = JSON.parse(localStorage.getItem('smartcourse_sessions') || '[]');
    const filteredSessions = filterSessionsByTimeRange(storedSessions, timeRange);
    setSessions(filteredSessions);
    
    if (filteredSessions.length > 0) {
      const metrics = filteredSessions.map(s => s.metrics);
      const avgMetrics = calculateAverageMetrics(metrics);
      const trend = calculateQualityTrend(filteredSessions);
      const topContext = getTopPerformingContext(filteredSessions);
      
      setSummary({
        totalSessions: filteredSessions.length,
        averageMetrics: avgMetrics,
        qualityTrend: trend,
        topContext
      });
    }
  };

  const filterSessionsByTimeRange = (sessions: SmartCourseSession[], range: string): SmartCourseSession[] => {
    const now = new Date();
    const cutoff = new Date();
    
    switch (range) {
      case '1h':
        cutoff.setHours(now.getHours() - 1);
        break;
      case '24h':
        cutoff.setDate(now.getDate() - 1);
        break;
      case '7d':
        cutoff.setDate(now.getDate() - 7);
        break;
      case '30d':
        cutoff.setDate(now.getDate() - 30);
        break;
    }
    
    return sessions.filter(session => new Date(session.timestamp) >= cutoff);
  };

  const calculateAverageMetrics = (metrics: SmartCourseMetrics[]): SmartCourseMetrics => {
    if (metrics.length === 0) {
      return { planScore: 0, personalScore: 0, lift: 0, recall: 0, latency: 0 };
    }
    
    const sum = metrics.reduce((acc, m) => ({
      planScore: acc.planScore + m.planScore,
      personalScore: acc.personalScore + m.personalScore,
      lift: acc.lift + m.lift,
      recall: acc.recall + m.recall,
      latency: acc.latency + m.latency
    }), { planScore: 0, personalScore: 0, lift: 0, recall: 0, latency: 0 });
    
    return {
      planScore: Math.round((sum.planScore / metrics.length) * 100) / 100,
      personalScore: Math.round((sum.personalScore / metrics.length) * 100) / 100,
      lift: Math.round((sum.lift / metrics.length) * 100) / 100,
      recall: Math.round((sum.recall / metrics.length) * 100) / 100,
      latency: Math.round(sum.latency / metrics.length)
    };
  };

  const calculateQualityTrend = (sessions: SmartCourseSession[]): 'improving' | 'stable' | 'declining' => {
    if (sessions.length < 5) return 'stable';
    
    const recent = sessions.slice(-5);
    const earlier = sessions.slice(-10, -5);
    
    if (earlier.length === 0) return 'stable';
    
    const recentAvg = calculateAverageMetrics(recent.map(s => s.metrics)).personalScore;
    const earlierAvg = calculateAverageMetrics(earlier.map(s => s.metrics)).personalScore;
    
    const improvement = recentAvg - earlierAvg;
    
    if (improvement > 0.05) return 'improving';
    if (improvement < -0.05) return 'declining';
    return 'stable';
  };

  const getTopPerformingContext = (sessions: SmartCourseSession[]): string => {
    const contextPerformance = sessions.reduce((acc, session) => {
      const context = session.context;
      if (!acc[context]) {
        acc[context] = { total: 0, count: 0 };
      }
      acc[context].total += session.metrics.personalScore;
      acc[context].count += 1;
      return acc;
    }, {} as Record<string, { total: number; count: number }>);
    
    let bestContext = 'full_context';
    let bestScore = 0;
    
    Object.entries(contextPerformance).forEach(([context, data]) => {
      const avg = data.total / data.count;
      if (avg > bestScore) {
        bestScore = avg;
        bestContext = context;
      }
    });
    
    return bestContext;
  };

  const getQualityColor = (score: number): string => {
    if (score >= 0.8) return 'text-green-600';
    if (score >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getQualityBadge = (score: number): { variant: 'default' | 'secondary' | 'destructive' | 'outline', text: string } => {
    if (score >= 0.8) return { variant: 'default', text: 'Excellent' };
    if (score >= 0.6) return { variant: 'secondary', text: 'Good' };
    if (score >= 0.4) return { variant: 'outline', text: 'Fair' };
    return { variant: 'destructive', text: 'Poor' };
  };

  const chartData = sessions.slice(-10).map((session, index) => ({
    session: `S${index + 1}`,
    planScore: session.metrics.planScore,
    personalScore: session.metrics.personalScore,
    lift: session.metrics.lift,
    recall: session.metrics.recall
  }));

  const contextData = ['full_context', 'no_transcript', 'no_plan', 'question_only'].map(context => {
    const contextSessions = sessions.filter(s => s.context === context);
    const avgScore = contextSessions.length > 0 
      ? calculateAverageMetrics(contextSessions.map(s => s.metrics)).personalScore 
      : 0;
    
    return {
      context: context.replace('_', ' '),
      score: avgScore,
      sessions: contextSessions.length
    };
  });

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">SmartCourse Analytics</h2>
          <p className="text-muted-foreground">
            Real-time monitoring of contextual AI recommendation quality
          </p>
        </div>
        <div className="flex items-center gap-2">
          {['1h', '24h', '7d', '30d'].map((range) => (
            <Button
              key={range}
              variant={timeRange === range ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange(range as any)}
            >
              {range}
            </Button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
            <Badge variant="outline">{timeRange}</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalSessions}</div>
            <p className="text-xs text-muted-foreground">
              SmartCourse enhanced conversations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Personal Score</CardTitle>
            <Badge {...getQualityBadge(summary.averageMetrics.personalScore)}>
              {getQualityBadge(summary.averageMetrics.personalScore).text}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getQualityColor(summary.averageMetrics.personalScore)}`}>
              {(summary.averageMetrics.personalScore * 100).toFixed(1)}%
            </div>
            <Progress value={summary.averageMetrics.personalScore * 100} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lift Score</CardTitle>
            <Badge variant={summary.averageMetrics.lift > 0.2 ? 'default' : 'secondary'}>
              {summary.averageMetrics.lift > 0.2 ? 'High' : 'Moderate'}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              +{(summary.averageMetrics.lift * 100).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Personalization improvement
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quality Trend</CardTitle>
            <Badge 
              variant={
                summary.qualityTrend === 'improving' ? 'default' : 
                summary.qualityTrend === 'declining' ? 'destructive' : 'secondary'
              }
            >
              {summary.qualityTrend}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary.qualityTrend === 'improving' ? '📈' : 
               summary.qualityTrend === 'declining' ? '📉' : '📊'}
            </div>
            <p className="text-xs text-muted-foreground">
              Based on recent sessions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <Tabs defaultValue="metrics" className="space-y-4">
        <TabsList>
          <TabsTrigger value="metrics">Metrics Trends</TabsTrigger>
          <TabsTrigger value="context">Context Performance</TabsTrigger>
          <TabsTrigger value="sessions">Recent Sessions</TabsTrigger>
        </TabsList>

        <TabsContent value="metrics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>SmartCourse Metrics Over Time</CardTitle>
              <CardDescription>
                Tracking PlanScore, PersonalScore, Lift, and Recall across recent sessions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="session" />
                  <YAxis domain={[0, 1]} />
                  <Tooltip formatter={(value) => `${(Number(value) * 100).toFixed(1)}%`} />
                  <Line type="monotone" dataKey="personalScore" stroke="#8884d8" name="Personal Score" />
                  <Line type="monotone" dataKey="planScore" stroke="#82ca9d" name="Plan Score" />
                  <Line type="monotone" dataKey="lift" stroke="#ffc658" name="Lift" />
                  <Line type="monotone" dataKey="recall" stroke="#ff7c7c" name="Recall" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="context" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Context Mode Performance</CardTitle>
              <CardDescription>
                Comparing recommendation quality across different context modes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={contextData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="context" />
                  <YAxis domain={[0, 1]} />
                  <Tooltip formatter={(value) => `${(Number(value) * 100).toFixed(1)}%`} />
                  <Bar dataKey="score" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sessions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent SmartCourse Sessions</CardTitle>
              <CardDescription>
                Detailed view of recent SmartCourse enhanced conversations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {sessions.slice(-10).reverse().map((session, index) => (
                  <div key={session.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="outline">
                        {new Date(session.timestamp).toLocaleTimeString()}
                      </Badge>
                      <Badge {...getQualityBadge(session.metrics.personalScore)}>
                        {(session.metrics.personalScore * 100).toFixed(1)}%
                      </Badge>
                    </div>
                    <p className="text-sm mb-2 line-clamp-2">{session.query}</p>
                    <div className="grid grid-cols-4 gap-2 text-xs">
                      <div>Plan: {(session.metrics.planScore * 100).toFixed(1)}%</div>
                      <div>Lift: +{(session.metrics.lift * 100).toFixed(1)}%</div>
                      <div>Recall: {(session.metrics.recall * 100).toFixed(1)}%</div>
                      <div>Latency: {session.metrics.latency}ms</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SmartCourseDashboard;