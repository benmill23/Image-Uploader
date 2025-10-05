import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import ScoreDisplay from './ScoreDisplay';

export default function ImageCard({ image, onDelete }) {
  const [imageUrl, setImageUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);

  useEffect(() => {
    const getSignedUrl = async () => {
      try {
        const { data, error } = await supabase.storage
          .from('profile-images')
          .createSignedUrl(image.storage_path, 3600); // 1 hour expiry

        if (error) throw error;
        setImageUrl(data.signedUrl);
      } catch (err) {
        console.error('Error generating signed URL:', err);
      } finally {
        setLoading(false);
      }
    };

    getSignedUrl();
  }, [image.storage_path]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this image?')) {
      return;
    }

    setDeleting(true);

    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('profile-images')
        .remove([image.storage_path]);

      if (storageError) {
        throw new Error(`Failed to delete from storage: ${storageError.message}`);
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('user_images')
        .delete()
        .eq('id', image.id);

      if (dbError) {
        throw new Error(`Failed to delete from database: ${dbError.message}`);
      }

      toast.success('Image deleted successfully');

      // Call onDelete callback to refresh the gallery
      if (onDelete) {
        await onDelete();
      }
    } catch (error) {
      console.error('Delete failed:', error);
      toast.error(error.message || 'Failed to delete image');
      setDeleting(false);
    }
  };

  // Prepare analysis result for ScoreDisplay
  const analysisResult = image.bristol_score ? {
    success: true,
    isRelevant: true,
    bristolScore: image.bristol_score,
    sizeEstimation: image.size_score,
    healthIndicators: image.health_indicators || {},
    warnings: image.warnings || [],
    notes: image.analysis_notes,
  } : null;

  return (
    <>
      <div className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow duration-200 overflow-hidden group">
        <div className="aspect-square bg-gray-100 relative overflow-hidden">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="spinner"></div>
            </div>
          ) : imageUrl ? (
            <>
              <img
                src={imageUrl}
                alt={image.file_name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
              />

              {/* Analysis Badges */}
              <div className="absolute top-2 left-2 flex flex-col gap-1">
                {image.is_analyzed === false ? (
                  <span className="px-2 py-1 bg-yellow-500 text-white text-xs font-semibold rounded-full flex items-center gap-1">
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                    Analyzing...
                  </span>
                ) : image.bristol_score ? (
                  <>
                    <span className="px-2 py-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-semibold rounded-full">
                      Bristol {image.bristol_score}
                    </span>
                    {image.size_score && (
                      <span className="px-2 py-1 bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-xs font-semibold rounded-full">
                        Size: {image.size_score}
                      </span>
                    )}
                  </>
                ) : null}
              </div>
            </>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-gray-400">
              <span>Failed to load</span>
            </div>
          )}
        </div>

        <div className="p-3 space-y-2">
          <p className="text-xs text-gray-500">
            {formatDate(image.created_at)}
          </p>

          {/* View Analysis Button */}
          {analysisResult && (
            <button
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm py-2 px-3 rounded hover:from-purple-600 hover:to-pink-600 transition-all"
              onClick={() => setShowAnalysis(true)}
            >
              View Analysis
            </button>
          )}

          <button
            className="w-full bg-red-500 text-white text-sm py-2 px-3 rounded hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>

      {/* Analysis Modal */}
      {showAnalysis && analysisResult && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowAnalysis(false)}>
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-800">Analysis Results</h3>
              <button
                onClick={() => setShowAnalysis(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
              >
                ×
              </button>
            </div>
            <div className="p-6">
              <ScoreDisplay analysisResult={analysisResult} dailyStreak={0} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
