'use client';

export default function DocumentViewer() {
  return (
    <div className="h-full bg-white dark:bg-gray-900 flex items-center justify-center">
      <div className="text-center text-gray-500">
        <div className="text-6xl mb-4">📄</div>
        <h2 className="text-2xl font-semibold mb-2">No document selected</h2>
        <p>Select a document from the file explorer to view it here</p>
      </div>
    </div>
  );
}
