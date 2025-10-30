export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">RAG MVP Service</h1>
        <p className="text-gray-600 mb-8">
          Retrieval-Augmented Generation API powered by Vercel Serverless
        </p>
        <div className="space-y-2 text-left">
          <div className="p-4 bg-gray-100 rounded">
            <code className="text-sm">POST /api/rag/query</code>
            <p className="text-xs text-gray-600 mt-1">Query the RAG system</p>
          </div>
          <div className="p-4 bg-gray-100 rounded">
            <code className="text-sm">POST /api/ingestion/worker</code>
            <p className="text-xs text-gray-600 mt-1">
              Document ingestion (Cron triggered)
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
