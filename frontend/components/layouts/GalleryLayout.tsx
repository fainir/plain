'use client';

interface GalleryLayoutProps {
  data: any[];
  schema: any;
}

export default function GalleryLayout({ data, schema }: GalleryLayoutProps) {
  const titleField = schema.titleField || 'name';
  const subtitleField = schema.subtitleField || 'description';

  return (
    <div className="p-4 overflow-y-auto">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {data.map((item, idx) => (
          <div
            key={idx}
            className="bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer overflow-hidden"
          >
            {/* Icon/Image placeholder */}
            <div className="aspect-square bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900 flex items-center justify-center text-6xl">
              {item.icon || item.emoji || '📄'}
            </div>

            {/* Content */}
            <div className="p-3">
              <h3 className="font-semibold truncate mb-1">{item[titleField]}</h3>
              {subtitleField && item[subtitleField] && (
                <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                  {item[subtitleField]}
                </p>
              )}
              {/* Additional info */}
              <div className="mt-2 flex flex-wrap gap-1">
                {Object.entries(item).slice(0, 2).map(([key, value]) => {
                  if (key === titleField || key === subtitleField || key === 'id' || key === 'icon' || key === 'emoji') {
                    return null;
                  }
                  return (
                    <span
                      key={key}
                      className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded"
                    >
                      {String(value)}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
