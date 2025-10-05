import { useAuth } from '../../contexts/AuthContext';
import { useImages } from '../../hooks/useImages';
import ImageGallery from './ImageGallery';
import ImageUploader from './ImageUploader';

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const { images, refetch } = useImages();

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-6xl mx-auto px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <button
            onClick={signOut}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition"
          >
            Sign Out
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-8">
        {/* Welcome Section */}
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-gray-800">
            Welcome, {user?.email}
          </h2>
          <p className="text-gray-600 mt-1">
            {images.length} of 60 images used
          </p>
        </div>

        {/* Image Uploader */}
        <div className="mb-8">
          <ImageUploader
            currentImageCount={images.length}
            onRefetch={refetch}
          />
        </div>

        {/* Image Gallery */}
        <ImageGallery />
      </div>
    </div>
  );
}
