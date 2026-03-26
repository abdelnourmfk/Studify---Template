export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
      <h1 className="text-4xl font-bold text-gray-800 mb-4">404</h1>
      <p className="text-xl text-gray-600 mb-8">Page not found</p>
      <a href="/" className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700">
        Go to Home
      </a>
    </div>
  );
}
