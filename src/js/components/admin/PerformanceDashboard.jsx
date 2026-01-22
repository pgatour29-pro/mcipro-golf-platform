import React, { useEffect, useState, useCallback } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts';

/**
 * Performance Dashboard Component
 * Displays real-time performance metrics for MyCaddiPro
 */
export default function PerformanceDashboard() {
  const [metrics, setMetrics] = useState([]);
  const [dbStats, setDbStats] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Get Supabase client
  const getSupabase = useCallback(() => {
    if (typeof window !== 'undefined' && window.SupabaseManager) {
      return window.SupabaseManager.client;
    }
    if (typeof window !== 'undefined' && window.supabase) {
      return window.supabase;
    }
    return null;
  }, []);

  // Fetch all metrics
  const fetchMetrics = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase) {
      setError('Supabase client not available');
      setLoading(false);
      return;
    }

    try {
      // Fetch performance summary
      const { data: summaryData, error: summaryError } = await supabase.rpc('get_performance_summary', {
        p_hours: 24,
      });
      if (!summaryError && summaryData) {
        setSummary(summaryData);
      }

      // Fetch DB stats
      const { data: statsData, error: statsError } = await supabase.rpc('get_db_stats');
      if (!statsError && statsData) {
        setDbStats(statsData);
      }

      // Fetch raw latency data for chart
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: latencyData, error: latencyError } = await supabase
        .from('performance_logs')
        .select('created_at, metric_value, metadata')
        .eq('metric_type', 'api_latency')
        .gte('created_at', since)
        .order('created_at', { ascending: true });

      if (!latencyError && latencyData) {
        const grouped = groupByHour(latencyData);
        setMetrics(grouped);
      }

      setError(null);
    } catch (err) {
      console.error('[PerformanceDashboard] Error fetching metrics:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [getSupabase]);

  // Initial fetch and auto-refresh
  useEffect(() => {
    fetchMetrics();

    let interval;
    if (autoRefresh) {
      interval = setInterval(fetchMetrics, 30000); // Refresh every 30s
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [fetchMetrics, autoRefresh]);

  // Group data by hour for charting
  function groupByHour(data) {
    const grouped = {};

    data.forEach((item) => {
      const hour = new Date(item.created_at).toISOString().slice(0, 13);
      if (!grouped[hour]) grouped[hour] = [];
      grouped[hour].push(item.metric_value);
    });

    return Object.entries(grouped).map(([hour, values]) => {
      const sorted = [...values].sort((a, b) => a - b);
      const p95Index = Math.floor(sorted.length * 0.95);

      return {
        time: new Date(hour + ':00:00Z').toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        avgLatency: Math.round(values.reduce((a, b) => a + b, 0) / values.length),
        p95Latency: Math.round(sorted[p95Index] || sorted[sorted.length - 1]),
        requests: values.length,
      };
    });
  }

  // Get status color based on metric
  function getConnectionStatus(stats) {
    if (!stats) return 'warning';
    const ratio = stats.activeConnections / stats.maxConnections;
    if (ratio > 0.9) return 'critical';
    if (ratio > 0.7) return 'warning';
    return 'good';
  }

  function getCacheStatus(stats) {
    if (!stats) return 'warning';
    if (stats.cacheHitRatio > 0.95) return 'good';
    if (stats.cacheHitRatio > 0.9) return 'warning';
    return 'critical';
  }

  function getLatencyStatus(latency) {
    if (!latency) return 'warning';
    if (latency > 1000) return 'critical';
    if (latency > 500) return 'warning';
    return 'good';
  }

  const statusColors = {
    good: 'bg-green-100 border-green-500 text-green-800',
    warning: 'bg-yellow-100 border-yellow-500 text-yellow-800',
    critical: 'bg-red-100 border-red-500 text-red-800',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">System Performance</h1>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-gray-300"
            />
            Auto-refresh (30s)
          </label>
          <button
            onClick={fetchMetrics}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
          >
            Refresh Now
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Database Health Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard
          title="DB Connections"
          value={
            dbStats
              ? `${dbStats.activeConnections} / ${dbStats.maxConnections}`
              : '-'
          }
          status={getConnectionStatus(dbStats)}
          statusColors={statusColors}
        />
        <MetricCard
          title="Cache Hit Ratio"
          value={
            dbStats
              ? `${(dbStats.cacheHitRatio * 100).toFixed(1)}%`
              : '-'
          }
          status={getCacheStatus(dbStats)}
          statusColors={statusColors}
        />
        <MetricCard
          title="Avg API Latency"
          value={
            summary?.api?.avgLatency
              ? `${summary.api.avgLatency}ms`
              : '-'
          }
          status={getLatencyStatus(summary?.api?.avgLatency)}
          statusColors={statusColors}
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="P95 Latency"
          value={summary?.api?.p95Latency ? `${summary.api.p95Latency}ms` : '-'}
        />
        <StatCard
          title="Total Requests (24h)"
          value={summary?.api?.totalRequests?.toLocaleString() || '-'}
        />
        <StatCard
          title="Error Count (24h)"
          value={summary?.errorCount?.toString() || '0'}
          highlight={summary?.errorCount > 0}
        />
        <StatCard
          title="Avg LCP"
          value={summary?.pageLoad?.avgLCP ? `${summary.pageLoad.avgLCP}ms` : '-'}
        />
      </div>

      {/* Latency Chart */}
      <div className="bg-white rounded-lg p-6 shadow">
        <h2 className="text-lg font-semibold mb-4 text-gray-800">
          API Latency (24h)
        </h2>
        {metrics.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={metrics}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 12 }}
                stroke="#6b7280"
              />
              <YAxis
                unit="ms"
                tick={{ fontSize: 12 }}
                stroke="#6b7280"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="avgLatency"
                stroke="#3b82f6"
                strokeWidth={2}
                name="Avg Latency"
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="p95Latency"
                stroke="#ef4444"
                strokeWidth={2}
                strokeDasharray="5 5"
                name="P95 Latency"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-64 text-gray-500">
            No latency data available for the last 24 hours
          </div>
        )}
      </div>

      {/* Request Volume Chart */}
      {metrics.length > 0 && (
        <div className="bg-white rounded-lg p-6 shadow">
          <h2 className="text-lg font-semibold mb-4 text-gray-800">
            Request Volume (24h)
          </h2>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={metrics}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 12 }}
                stroke="#6b7280"
              />
              <YAxis
                tick={{ fontSize: 12 }}
                stroke="#6b7280"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                }}
              />
              <Line
                type="monotone"
                dataKey="requests"
                stroke="#10b981"
                strokeWidth={2}
                name="Requests"
                dot={false}
                fill="#10b98120"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Performance Targets */}
      <div className="bg-white rounded-lg p-6 shadow">
        <h2 className="text-lg font-semibold mb-4 text-gray-800">
          Performance Targets
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-4 font-medium text-gray-600">Metric</th>
                <th className="text-left py-2 px-4 font-medium text-gray-600">Current</th>
                <th className="text-left py-2 px-4 font-medium text-gray-600">Target</th>
                <th className="text-left py-2 px-4 font-medium text-gray-600">Critical</th>
                <th className="text-left py-2 px-4 font-medium text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody>
              <TargetRow
                metric="Tee Sheet Load"
                current={summary?.pageLoad?.avgLCP ? `${summary.pageLoad.avgLCP}ms` : '-'}
                target="< 1s"
                critical="> 3s"
                currentValue={summary?.pageLoad?.avgLCP}
                targetValue={1000}
                criticalValue={3000}
              />
              <TargetRow
                metric="API Latency"
                current={summary?.api?.avgLatency ? `${summary.api.avgLatency}ms` : '-'}
                target="< 500ms"
                critical="> 2s"
                currentValue={summary?.api?.avgLatency}
                targetValue={500}
                criticalValue={2000}
              />
              <TargetRow
                metric="Cache Hit Ratio"
                current={dbStats ? `${(dbStats.cacheHitRatio * 100).toFixed(1)}%` : '-'}
                target="> 95%"
                critical="< 90%"
                currentValue={dbStats?.cacheHitRatio ? dbStats.cacheHitRatio * 100 : null}
                targetValue={95}
                criticalValue={90}
                inverse={true}
              />
              <TargetRow
                metric="P95 API Latency"
                current={summary?.api?.p95Latency ? `${summary.api.p95Latency}ms` : '-'}
                target="< 1s"
                critical="> 3s"
                currentValue={summary?.api?.p95Latency}
                targetValue={1000}
                criticalValue={3000}
              />
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Metric Card Component
function MetricCard({ title, value, status, statusColors }) {
  return (
    <div className={`p-4 rounded-lg border-l-4 ${statusColors[status]}`}>
      <p className="text-sm opacity-80">{title}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}

// Stat Card Component
function StatCard({ title, value, highlight = false }) {
  return (
    <div className={`p-4 rounded-lg bg-white shadow ${highlight ? 'border-l-4 border-red-500' : ''}`}>
      <p className="text-sm text-gray-600">{title}</p>
      <p className={`text-xl font-semibold ${highlight ? 'text-red-600' : 'text-gray-800'}`}>
        {value}
      </p>
    </div>
  );
}

// Target Row Component
function TargetRow({
  metric,
  current,
  target,
  critical,
  currentValue,
  targetValue,
  criticalValue,
  inverse = false,
}) {
  let status = 'unknown';
  if (currentValue !== null && currentValue !== undefined) {
    if (inverse) {
      // For metrics where higher is better (like cache hit ratio)
      if (currentValue >= targetValue) status = 'good';
      else if (currentValue >= criticalValue) status = 'warning';
      else status = 'critical';
    } else {
      // For metrics where lower is better (like latency)
      if (currentValue <= targetValue) status = 'good';
      else if (currentValue <= criticalValue) status = 'warning';
      else status = 'critical';
    }
  }

  const statusBadge = {
    good: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    critical: 'bg-red-100 text-red-800',
    unknown: 'bg-gray-100 text-gray-800',
  };

  return (
    <tr className="border-b last:border-b-0">
      <td className="py-2 px-4 font-medium text-gray-800">{metric}</td>
      <td className="py-2 px-4">{current}</td>
      <td className="py-2 px-4 text-green-600">{target}</td>
      <td className="py-2 px-4 text-red-600">{critical}</td>
      <td className="py-2 px-4">
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusBadge[status]}`}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
      </td>
    </tr>
  );
}
