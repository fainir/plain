'use client';

interface KanbanLayoutProps {
  data: any[];
  schema: any;
}

export default function KanbanLayout({ data, schema }: KanbanLayoutProps) {
  const groupBy = schema.groupBy || 'status';
  const cardTitle = schema.cardTitle || 'name';

  // Group data by the specified field
  const groupedData: { [key: string]: any[] } = {};
  data.forEach(item => {
    const key = item[groupBy] || 'Uncategorized';
    if (!groupedData[key]) {
      groupedData[key] = [];
    }
    groupedData[key].push(item);
  });

  return (
    <div className="flex gap-4 overflow-x-auto p-4 h-full">
      {Object.entries(groupedData).map(([columnName, items]) => (
        <div key={columnName} className="flex-shrink-0 w-80">
          <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
            <h3 className="font-semibold mb-3 flex items-center justify-between">
              <span>{columnName}</span>
              <span className="text-sm text-gray-500">({items.length})</span>
            </h3>
            <div className="space-y-3">
              {items.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-white dark:bg-gray-900 p-3 rounded shadow hover:shadow-md transition-shadow cursor-pointer"
                >
                  <div className="font-medium mb-2">{item[cardTitle]}</div>
                  {schema.cardSubtitle && (
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      {item[schema.cardSubtitle]}
                    </div>
                  )}
                  {schema.cardBadges && (
                    <div className="flex gap-2 flex-wrap">
                      {schema.cardBadges.map((badge: string) => (
                        item[badge] && (
                          <span
                            key={badge}
                            className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded"
                          >
                            {String(item[badge])}
                          </span>
                        )
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
