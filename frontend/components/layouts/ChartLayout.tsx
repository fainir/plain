'use client';

interface ChartLayoutProps {
  data: any[];
  schema: any;
}

export default function ChartLayout({ data, schema }: ChartLayoutProps) {
  const chartType = schema.chartType || 'line';
  const xField = schema.xField || 'date';
  const yField = schema.yField || 'value';
  const groupByField = schema.groupByField;

  // Group data if needed
  let chartData = data;
  if (groupByField) {
    const grouped: { [key: string]: any[] } = {};
    data.forEach(item => {
      const key = item[groupByField];
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(item);
    });
    chartData = Object.entries(grouped).map(([name, items]) => ({
      name,
      items
    }));
  }

  // Simple bar chart visualization
  if (chartType === 'bar' || chartType === 'line') {
    const maxValue = Math.max(...data.map(d => Number(d[yField]) || 0));

    return (
      <div className="p-4 overflow-y-auto">
        <h3 className="text-xl font-semibold mb-4">
          {schema.displayName || 'Chart View'}
        </h3>
        <div className="space-y-4">
          {data.map((item, idx) => {
            const value = Number(item[yField]) || 0;
            const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;

            return (
              <div key={idx}>
                <div className="flex justify-between text-sm mb-1">
                  <span>{item[xField]}</span>
                  <span className="font-semibold">{value}</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-6">
                  <div
                    className="bg-blue-500 h-6 rounded-full flex items-center justify-end pr-2 text-white text-xs"
                    style={{ width: `${percentage}%` }}
                  >
                    {percentage > 10 && `${Math.round(percentage)}%`}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Pie chart representation
  if (chartType === 'pie') {
    const total = data.reduce((sum, item) => sum + (Number(item[yField]) || 0), 0);

    return (
      <div className="p-4 overflow-y-auto">
        <h3 className="text-xl font-semibold mb-4">
          {schema.displayName || 'Chart View'}
        </h3>
        <div className="max-w-md mx-auto">
          {/* Simple pie representation with list */}
          <div className="space-y-2">
            {data.map((item, idx) => {
              const value = Number(item[yField]) || 0;
              const percentage = total > 0 ? (value / total) * 100 : 0;
              const colors = ['bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-red-500', 'bg-purple-500'];
              const color = colors[idx % colors.length];

              return (
                <div key={idx} className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full ${color}`}></div>
                  <div className="flex-1">
                    <div className="flex justify-between text-sm">
                      <span>{item[xField]}</span>
                      <span className="font-semibold">{Math.round(percentage)}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <p className="text-gray-500">Chart type not yet implemented: {chartType}</p>
    </div>
  );
}
