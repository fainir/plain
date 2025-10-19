'use client';

interface TimelineLayoutProps {
  data: any[];
  schema: any;
}

export default function TimelineLayout({ data, schema }: TimelineLayoutProps) {
  const startDateField = schema.startDateField || 'start';
  const endDateField = schema.endDateField || 'due';
  const titleField = schema.titleField || 'title';

  // Sort data by start date
  const sortedData = [...data].sort((a, b) => {
    const dateA = new Date(a[startDateField] || a[endDateField]).getTime();
    const dateB = new Date(b[startDateField] || b[endDateField]).getTime();
    return dateA - dateB;
  });

  return (
    <div className="p-4 overflow-y-auto">
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-300 dark:bg-gray-700"></div>

        {/* Timeline items */}
        <div className="space-y-6">
          {sortedData.map((item, idx) => {
            const startDate = item[startDateField] ? new Date(item[startDateField]).toLocaleDateString() : null;
            const endDate = item[endDateField] ? new Date(item[endDateField]).toLocaleDateString() : null;

            return (
              <div key={idx} className="relative flex gap-4">
                {/* Timeline dot */}
                <div className="relative z-10 flex-shrink-0 w-16 flex items-center">
                  <div className="w-4 h-4 rounded-full bg-blue-500 border-4 border-white dark:border-gray-900"></div>
                </div>

                {/* Content */}
                <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-4">
                  <h3 className="font-semibold text-lg mb-2">{item[titleField]}</h3>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    {startDate && <span>Start: {startDate}</span>}
                    {startDate && endDate && <span className="mx-2">→</span>}
                    {endDate && <span>End: {endDate}</span>}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {Object.entries(item).map(([key, value]) => {
                      if (key === titleField || key === startDateField || key === endDateField || key === 'id') {
                        return null;
                      }
                      return (
                        <div key={key}>
                          <span className="text-gray-500">{key}: </span>
                          <span className="font-medium">{String(value)}</span>
                        </div>
                      );
                    })}
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
