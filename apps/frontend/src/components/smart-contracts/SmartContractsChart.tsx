import React, { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, Area, AreaChart } from 'recharts';
import { ChartContainer } from '@/components/ui/chart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PieChart as PieIcon, BarChart3, TrendingUp, Activity, Loader2 } from 'lucide-react';
import { useGasTrends } from '@/hooks/useGasTrends';

interface SmartContractsChartProps {
  data?: Array<{
    date: string;
    count: number;
  }>;
  contractTypes?: Array<{
    type: string;
    count: number;
    percentage: number;
  }>;
  totalGasUsed?: string;
  totalValueTransferred?: string;
  totalTransactions?: number;
  loading?: boolean;
  recentActivity?: {
    last_24h_growth: string;
    peak_tps: number;
    new_contracts: number;
    active_addresses: number;
  };
}

const SmartContractsChart: React.FC<SmartContractsChartProps> = ({
  data,
  contractTypes,
  loading = false,
  recentActivity
}) => {
  const [activeChart, setActiveChart] = useState('trend');

  // Hook para gas trends
  const { trends: gasTrends, loading: gasTrendsLoading } = useGasTrends(7);

  // Color mapping for contract types
  const getTypeColor = (type: string, index: number) => {
    const colors = ['#00E8B4', '#C74AE3', '#3B82F6', '#F59E0B', '#6B7280', '#EF4444', '#10B981', '#8B5CF6'];
    const colorMap: { [key: string]: string } = {
      'ERC-20': '#00E8B4',
      'ERC-721': '#C74AE3',
      'ERC-1155': '#3B82F6',
      'Custom': '#F59E0B',
      'Proxy': '#6B7280',
      'Unknown': '#EF4444'
    };
    return colorMap[type] || colors[index % colors.length];
  };

  // Use real contract types data if available, otherwise show empty data (no more mock data)
  const pieData = contractTypes && contractTypes.length > 0 ?
    contractTypes.map((type, index) => ({
      name: type.type,
      value: type.percentage,
      count: type.count,
      color: getTypeColor(type.type, index)
    })) :
    [
      { name: 'No Data', value: 100, count: 0, color: '#6B7280' }
    ];

  // Bar chart data using real contract types
  const barData = pieData.map(item => ({
    name: item.name,
    transactions: item.count,
    gasUsed: Math.floor(item.count * 25000) // Estimate gas usage based on transaction count
  }));

  // Use real data if available, otherwise show empty data (no more mock data)
  const timeSeriesData = data && data.length > 0 ?
    data.map(item => ({
      date: item.date,
      deployments: item.count,
      total: item.count
    })) :
    [
      { date: new Date().toISOString().split('T')[0], deployments: 0, total: 0 }
    ];

  // Gas data using real trends
  const gasData = gasTrends && gasTrends.length > 0 ?
    gasTrends.slice(0, 6).map(trend => ({
      time: new Date(trend.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      avgGas: parseFloat(trend.avg_price) || 0,
      maxGas: parseFloat(trend.max_price) || 0,
      minGas: parseFloat(trend.min_price) || 0,
      volume: parseFloat(trend.volume) || 0,
      txCount: trend.tx_count || 0
    })) : [
      { time: '01/01', avgGas: 0, maxGas: 0, minGas: 0, volume: 0, txCount: 0 }
    ];

  const chartConfig = {
    deployments: { label: "Deployments", color: "#00E8B4" },
    total: { label: "Total", color: "#C74AE3" },
    transactions: { label: "Transactions", color: "#00E8B4" },
    gasUsed: { label: "Gas Used", color: "#C74AE3" },
    erc20: { label: "ERC-20", color: "#00E8B4" },
    erc721: { label: "ERC-721", color: "#C74AE3" },
    erc1155: { label: "ERC-1155", color: "#3B82F6" },
    proxy: { label: "Proxy", color: "#F59E0B" },
    avgGas: { label: "Avg Gas Price", color: "#00E8B4" },
    maxGas: { label: "Max Gas Price", color: "#C74AE3" }
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 shadow-lg">
          <p className="font-medium text-gray-900 dark:text-white">{data.name}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {data.count?.toLocaleString()} contracts ({data.value}%)
          </p>
        </div>
      );
    }
    return null;
  };

  const CustomLegend = ({ payload }: any) => {
    return (
      <div className="flex flex-wrap justify-center gap-2 sm:gap-4 mt-4">
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-1 sm:gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            ></div>
            <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  };

  const chartButtons = [
    { id: 'pie', label: 'Distribution', icon: PieIcon, color: 'from-blue-500 to-indigo-600' },
    { id: 'bar', label: 'Volume & Gas', icon: BarChart3, color: 'from-emerald-500 to-green-600' },
    { id: 'trend', label: 'Trends', icon: TrendingUp, color: 'from-purple-500 to-violet-600' },
    { id: 'gas', label: 'Gas Prices', icon: Activity, color: 'from-orange-500 to-amber-600' }
  ];

  const renderChart = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-[300px] sm:h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600 dark:text-indigo-400" />
          <span className="ml-3 text-gray-600 dark:text-gray-400">Loading chart data...</span>
        </div>
      );
    }

    switch (activeChart) {
      case 'pie':
        return (
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              outerRadius={window.innerWidth < 640 ? 80 : 120}
              innerRadius={window.innerWidth < 640 ? 40 : 60}
              paddingAngle={2}
              dataKey="value"
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend content={<CustomLegend />} />
          </PieChart>
        );
      case 'bar':
        return (
          <BarChart data={barData}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} stroke="#374151" />
            <XAxis
              dataKey="name"
              tick={{ fill: '#6B7280', fontSize: window.innerWidth < 640 ? 10 : 12 }}
              tickLine={{ stroke: '#6B7280' }}
              axisLine={{ stroke: '#6B7280' }}
              angle={window.innerWidth < 640 ? -45 : 0}
              textAnchor={window.innerWidth < 640 ? 'end' : 'middle'}
              height={window.innerWidth < 640 ? 60 : 40}
            />
            <YAxis
              yAxisId="left"
              tick={{ fill: '#6B7280', fontSize: window.innerWidth < 640 ? 10 : 12 }}
              tickLine={{ stroke: '#6B7280' }}
              axisLine={{ stroke: '#6B7280' }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fill: '#6B7280', fontSize: window.innerWidth < 640 ? 10 : 12 }}
              tickLine={{ stroke: '#6B7280' }}
              axisLine={{ stroke: '#6B7280' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--tooltip-bg)',
                border: '1px solid var(--tooltip-border)',
                borderRadius: '8px',
                color: 'var(--tooltip-text)'
              }}
            />
            <Bar yAxisId="left" dataKey="transactions" fill="#00E8B4" name="Contracts" />
            <Bar yAxisId="right" dataKey="gasUsed" fill="#C74AE3" name="Est. Gas Used" />
          </BarChart>
        );
      case 'trend':
        return (
          <AreaChart data={timeSeriesData}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} stroke="#374151" />
            <XAxis
              dataKey="date"
              tick={{ fill: '#6B7280', fontSize: window.innerWidth < 640 ? 10 : 12 }}
              tickLine={{ stroke: '#6B7280' }}
              axisLine={{ stroke: '#6B7280' }}
              angle={window.innerWidth < 640 ? -45 : 0}
              textAnchor={window.innerWidth < 640 ? 'end' : 'middle'}
              height={window.innerWidth < 640 ? 60 : 40}
            />
            <YAxis
              tick={{ fill: '#6B7280', fontSize: window.innerWidth < 640 ? 10 : 12 }}
              tickLine={{ stroke: '#6B7280' }}
              axisLine={{ stroke: '#6B7280' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--tooltip-bg)',
                border: '1px solid var(--tooltip-border)',
                borderRadius: '8px',
                color: 'var(--tooltip-text)'
              }}
            />
            <Area
              type="monotone"
              dataKey="deployments"
              stroke="#00E8B4"
              fill="#00E8B4"
              fillOpacity={0.6}
              name="Daily Deployments"
            />
          </AreaChart>
        );
      case 'gas':
        return (
          <LineChart data={gasData}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} stroke="#374151" />
            <XAxis
              dataKey="time"
              tick={{ fill: '#6B7280', fontSize: window.innerWidth < 640 ? 10 : 12 }}
              tickLine={{ stroke: '#6B7280' }}
              axisLine={{ stroke: '#6B7280' }}
            />
            <YAxis
              tick={{ fill: '#6B7280', fontSize: window.innerWidth < 640 ? 10 : 12 }}
              tickLine={{ stroke: '#6B7280' }}
              axisLine={{ stroke: '#6B7280' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--tooltip-bg)',
                border: '1px solid var(--tooltip-border)',
                borderRadius: '8px',
                color: 'var(--tooltip-text)'
              }}
            />
            <Line type="monotone" dataKey="avgGas" stroke="#00E8B4" strokeWidth={2} name="Avg Gas Price (Gwei)" />
            <Line type="monotone" dataKey="maxGas" stroke="#C74AE3" strokeWidth={2} strokeDasharray="5 5" name="Max Gas Price (Gwei)" />
          </LineChart>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Modern Chart Navigation */}
      <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 sm:gap-3 p-1 bg-gray-100 dark:bg-gray-800/50 rounded-xl backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50">
        {chartButtons.map((button) => {
          const Icon = button.icon;
          return (
            <Button
              key={button.id}
              variant={activeChart === button.id ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveChart(button.id)}
              className={`
                relative overflow-hidden transition-all duration-300 group flex-1 sm:flex-none
                ${activeChart === button.id
                  ? `bg-gradient-to-r ${button.color} text-white shadow-lg hover:shadow-xl transform hover:scale-105`
                  : 'hover:bg-gray-200 dark:hover:bg-gray-700/50 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }
              `}
            >
              <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 relative z-10">
                <Icon className="h-4 w-4" />
                <span className="font-medium text-xs sm:text-sm">{button.label}</span>
              </div>
              {activeChart === button.id && (
                <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              )}
            </Button>
          );
        })}
      </div>

      <div className="space-y-6 sm:space-y-8">
        {/* Main Chart - Centered and Full Width */}
        <div className="flex justify-center">
          <div className="w-full max-w-5xl relative p-4 sm:p-8 bg-gradient-to-br from-white/50 to-gray-50/30 dark:from-gray-800/50 dark:to-gray-900/30 rounded-xl border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-sm shadow-lg">
            <ChartContainer config={chartConfig} className="h-[300px] sm:h-[400px] lg:h-[500px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                {renderChart()}
              </ResponsiveContainer>
            </ChartContainer>
          </div>
        </div>


      </div>

      {/* Recent Activity Section - Below Chart */}
      <div className="mt-8">
        <Card className="relative overflow-hidden bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-800 dark:to-gray-800/50 border border-gray-200/50 dark:border-gray-700/50 shadow-lg hover:shadow-xl transition-all duration-300 group">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-violet-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <CardHeader className="relative pb-4 border-b border-gray-200/50 dark:border-gray-700/50">
            <CardTitle className="flex items-center gap-3 text-lg text-gray-900 dark:text-white">
              <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 shadow-lg">
                <div className="w-5 h-5 bg-white rounded text-purple-600 flex items-center justify-center text-sm font-bold">⚡</div>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Recent Activity</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Latest smart contract deployments and network metrics
                </p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="relative p-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200/50 dark:border-green-700/50 hover:shadow-lg transition-all duration-300 group/activity">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-500 text-white">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">Last 24h Growth</span>
                    <div className="text-lg font-bold text-gray-900 dark:text-white">
                      {loading ? (
                        <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                      ) : (
                        recentActivity?.last_24h_growth || '+0.0%'
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200/50 dark:border-blue-700/50 hover:shadow-lg transition-all duration-300 group/activity">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500 text-white">
                    <Activity className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">Peak TPS</span>
                    <div className="text-lg font-bold text-gray-900 dark:text-white">
                      {loading ? (
                        <div className="h-6 w-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                      ) : (
                        recentActivity?.peak_tps || 0
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 border border-purple-200/50 dark:border-purple-700/50 hover:shadow-lg transition-all duration-300 group/activity">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-500 text-white relative">
                    <div className="w-4 h-4 bg-white rounded text-purple-600 flex items-center justify-center text-xs font-bold">+</div>
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">New Contracts</span>
                    <div className="text-lg font-bold text-gray-900 dark:text-white">
                      {loading ? (
                        <div className="h-6 w-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                      ) : (
                        recentActivity?.new_contracts || 0
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SmartContractsChart;
