export default function Landing() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Welcome to Image Upload App</h1>
        <p className="text-gray-600 mb-8">Upload and manage your personal images</p>
        <div className="space-x-4">
          <a href="/login" className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700">
            Login
          </a>
          <a href="/register" className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700">
            Sign Up
          </a>
        </div>
      </div>
    </div>
  );
}
