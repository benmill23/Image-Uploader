import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

export default function ImageCard({ image }) {
  const [imageUrl, setImageUrl] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getSignedUrl = async () => {
      try {
        const { data, error } = await supabase.storage
          .from('user-images')
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

  return (
    <div className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow duration-200 overflow-hidden group">
      <div className="aspect-square bg-gray-100 relative overflow-hidden">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="spinner"></div>
          </div>
        ) : imageUrl ? (
          <img
            src={imageUrl}
            alt={image.file_name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-gray-400">
            <span>Failed to load</span>
          </div>
        )}
      </div>

      <div className="p-3">
        <p className="text-xs text-gray-500 mb-2">
          {formatDate(image.created_at)}
        </p>
        <button
          className="w-full bg-red-500 text-white text-sm py-2 px-3 rounded hover:bg-red-600 transition-colors"
          onClick={() => console.log('Delete clicked for:', image.id)}
        >
          Delete
        </button>
      </div>
    </div>
  );
}
