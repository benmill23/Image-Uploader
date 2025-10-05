import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { analyzeStoolImage } from '../../utils/stoolAnalyzer';

const ImageUploader = ({ currentImageCount = 0, onRefetch }) => {
  const { user } = useAuth();
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [fileSizeInfo, setFileSizeInfo] = useState([]);
  const [analyzing, setAnalyzing] = useState(false);

  const maxImages = 60;
  const remainingSlots = maxImages - currentImageCount;
  const MAX_WIDTH = 1920;
  const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const resizeImage = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          let width = img.width;
          let height = img.height;

          // Check if resize is needed
          const needsResize = width > MAX_WIDTH || file.size > MAX_FILE_SIZE;

          if (needsResize) {
            // Resize based on width
            if (width > MAX_WIDTH) {
              height = (height * MAX_WIDTH) / width;
              width = MAX_WIDTH;
            }

            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);

            // Try different quality levels to get under 2MB
            let quality = 0.9;
            let attempts = 0;
            const maxAttempts = 5;

            const tryCompress = () => {
              canvas.toBlob(
                (blob) => {
                  if (blob.size > MAX_FILE_SIZE && quality > 0.5 && attempts < maxAttempts) {
                    quality -= 0.1;
                    attempts++;
                    tryCompress();
                  } else {
                    // Create new file from blob
                    const newFile = new File([blob], file.name, {
                      type: file.type,
                      lastModified: Date.now(),
                    });
                    resolve({
                      file: newFile,
                      originalSize: file.size,
                      newSize: blob.size,
                      wasCompressed: true
                    });
                  }
                },
                file.type,
                quality
              );
            };

            tryCompress();
          } else {
            // No compression needed
            resolve({
              file,
              originalSize: file.size,
              newSize: file.size,
              wasCompressed: false
            });
          }
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  };

  const onDrop = useCallback(async (acceptedFiles) => {
    const availableSlots = remainingSlots - selectedFiles.length;
    const filesToAdd = acceptedFiles.slice(0, availableSlots);

    // Process and resize images
    const processedFiles = [];
    const sizeInfo = [];

    for (const file of filesToAdd) {
      const result = await resizeImage(file);
      processedFiles.push(result.file);
      sizeInfo.push({
        name: file.name,
        originalSize: result.originalSize,
        newSize: result.newSize,
        wasCompressed: result.wasCompressed
      });

      // Generate preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviews(prev => [...prev, { name: file.name, url: reader.result }]);
      };
      reader.readAsDataURL(result.file);
    }

    setSelectedFiles(prev => [...prev, ...processedFiles]);
    setFileSizeInfo(prev => [...prev, ...sizeInfo]);

    // Show compression summary
    const compressed = sizeInfo.filter(info => info.wasCompressed);
    if (compressed.length > 0) {
      const totalSaved = compressed.reduce((sum, info) => sum + (info.originalSize - info.newSize), 0);
      toast.success(`Compressed ${compressed.length} image(s), saved ${formatFileSize(totalSaved)}`);
    }
  }, [selectedFiles, remainingSlots]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/gif': ['.gif'],
      'image/webp': ['.webp']
    },
    disabled: remainingSlots <= 0 || uploading
  });

  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
    setFileSizeInfo(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    // Check if user already has 60 images
    if (currentImageCount >= 60) {
      toast.error('You have reached the maximum limit of 60 images');
      return;
    }

    // Check if upload would exceed limit
    if (currentImageCount + selectedFiles.length > 60) {
      toast.error(`You can only upload ${60 - currentImageCount} more image(s)`);
      return;
    }

    if (!user) {
      toast.error('You must be logged in to upload images');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const totalFiles = selectedFiles.length;
      let uploadedCount = 0;
      const uploadedImages = [];

      for (const file of selectedFiles) {
        // Create unique filename with timestamp
        const timestamp = Date.now();
        const fileExt = file.name.split('.').pop();
        const fileName = `${timestamp}_${file.name}`;
        const storagePath = `${user.id}/${fileName}`;

        // Upload to Supabase storage
        const { data: storageData, error: storageError } = await supabase.storage
          .from('profile-images')
          .upload(storagePath, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (storageError) {
          throw new Error(`Failed to upload ${file.name}: ${storageError.message}`);
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('profile-images')
          .getPublicUrl(storagePath);

        // Create record in user_images table
        const { data: imageData, error: dbError } = await supabase
          .from('user_images')
          .insert({
            user_id: user.id,
            storage_path: storagePath,
            image_url: urlData.publicUrl
          })
          .select()
          .single();

        if (dbError) {
          // If database insert fails, delete the uploaded file
          await supabase.storage.from('profile-images').remove([storagePath]);
          throw new Error(`Failed to save image record: ${dbError.message}`);
        }

        uploadedImages.push(imageData);
        uploadedCount++;

        // Update progress
        const progress = Math.round((uploadedCount / totalFiles) * 100);
        setUploadProgress(progress);
      }

      // Success!
      toast.success(`Successfully uploaded ${uploadedCount} image(s)`);
      setUploadProgress(0);
      setUploading(false);

      // Analyze the uploaded images
      setAnalyzing(true);
      toast.loading('Analyzing your sample...', { id: 'analyzing' });

      try {
        for (const imageData of uploadedImages) {
          // Fetch the image as a blob for analysis
          const response = await fetch(imageData.image_url);
          const blob = await response.blob();
          const file = new File([blob], 'sample.jpg', { type: blob.type });

          // Analyze the image
          const analysisResult = await analyzeStoolImage(file);

          // Update the database record with analysis results
          if (analysisResult.success && analysisResult.isRelevant) {
            const { error: updateError } = await supabase
              .from('user_images')
              .update({
                bristol_score: analysisResult.bristolScore,
                size_score: analysisResult.sizeEstimation,
                health_indicators: analysisResult.healthIndicators,
                analysis_notes: analysisResult.notes,
                warnings: analysisResult.warnings,
                is_analyzed: true
              })
              .eq('id', imageData.id);

            if (updateError) {
              console.error('Failed to update analysis:', updateError);
              toast.error(`Analysis saved but failed to update record for image ${imageData.id}`, { id: 'analyzing' });
            } else {
              toast.success('Analysis complete!', { id: 'analyzing' });
            }
          } else if (!analysisResult.isRelevant) {
            // Mark as analyzed even if not relevant
            await supabase
              .from('user_images')
              .update({ is_analyzed: true })
              .eq('id', imageData.id);
            toast.error('Image does not appear to be a valid sample', { id: 'analyzing' });
          } else {
            // Mark as analyzed even if failed
            await supabase
              .from('user_images')
              .update({ is_analyzed: true })
              .eq('id', imageData.id);
            toast.error('Analysis failed - please try again', { id: 'analyzing' });
          }
        }
      } catch (analysisError) {
        console.error('Analysis error:', analysisError);
        toast.error('Failed to analyze images - you can try again later', { id: 'analyzing' });
      } finally {
        setAnalyzing(false);
      }

      // Clear form
      setSelectedFiles([]);
      setPreviews([]);
      setFileSizeInfo([]);

      // Refresh the images list
      if (onRefetch) {
        await onRefetch();
      }
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error(error.message || 'Failed to upload images');
      setUploading(false);
    }
  };

  const canUpload = remainingSlots > 0 && selectedFiles.length > 0 && !uploading && !analyzing;
  const reachedLimit = currentImageCount >= maxImages;

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      {/* Status Message */}
      {reachedLimit ? (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 font-medium">
            You have reached the maximum limit of {maxImages} images.
          </p>
        </div>
      ) : (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-blue-700">
            You can upload <span className="font-semibold">{remainingSlots}</span> more image(s).
          </p>
        </div>
      )}

      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
          transition-all duration-200 ease-in-out
          ${isDragActive
            ? 'border-blue-500 bg-blue-50 scale-[1.02]'
            : 'border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100'
          }
          ${(remainingSlots <= 0 || uploading) ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input {...getInputProps()} />
        <Upload className={`mx-auto h-12 w-12 mb-4 ${isDragActive ? 'text-blue-500' : 'text-gray-400'}`} />
        {isDragActive ? (
          <p className="text-lg font-medium text-blue-600">Drop the images here...</p>
        ) : (
          <>
            <p className="text-lg font-medium text-gray-700 mb-2">
              Drag & drop images here, or click to select
            </p>
            <p className="text-sm text-gray-500">
              Accepted formats: JPEG, PNG, GIF, WEBP
            </p>
          </>
        )}
      </div>

      {/* Preview Section */}
      {previews.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-3 text-gray-800">
            Selected Images ({selectedFiles.length})
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {previews.map((preview, index) => {
              const sizeInfo = fileSizeInfo[index];
              return (
                <div key={index} className="relative group">
                  <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 border-2 border-gray-200">
                    <img
                      src={preview.url}
                      alt={preview.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <button
                    onClick={() => removeFile(index)}
                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-red-600"
                    disabled={uploading}
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <div className="mt-1">
                    <p className="text-xs text-gray-600 truncate">{preview.name}</p>
                    {sizeInfo && (
                      <p className="text-xs text-gray-500">
                        {sizeInfo.wasCompressed ? (
                          <span className="text-green-600">
                            {formatFileSize(sizeInfo.newSize)}
                            <span className="line-through text-gray-400 ml-1">
                              {formatFileSize(sizeInfo.originalSize)}
                            </span>
                          </span>
                        ) : (
                          <span>{formatFileSize(sizeInfo.newSize)}</span>
                        )}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Upload Progress */}
      {uploading && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Uploading...</span>
            <span className="text-sm font-medium text-gray-700">{uploadProgress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              className="bg-blue-600 h-full transition-all duration-300 ease-out rounded-full"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Analysis Progress */}
      {analyzing && (
        <div className="mt-6">
          <div className="flex items-center justify-center gap-3 p-4 bg-purple-50 border border-purple-200 rounded-lg">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-600"></div>
            <span className="text-sm font-medium text-purple-700">Analyzing your sample...</span>
          </div>
        </div>
      )}

      {/* Upload Button */}
      {selectedFiles.length > 0 && (
        <button
          onClick={handleUpload}
          disabled={!canUpload}
          className={`
            mt-6 w-full py-3 px-6 rounded-lg font-semibold text-white
            transition-all duration-200 flex items-center justify-center gap-2
            ${canUpload
              ? 'bg-blue-600 hover:bg-blue-700 active:scale-[0.98]'
              : 'bg-gray-400 cursor-not-allowed'
            }
          `}
        >
          <ImageIcon className="h-5 w-5" />
          {uploading ? 'Uploading...' : analyzing ? 'Analyzing...' : `Upload ${selectedFiles.length} Image(s)`}
        </button>
      )}
    </div>
  );
};

export default ImageUploader;
