import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Trash2, Eye, ImageIcon, Video, Loader2, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fetchFiles, UploadedFile, deleteFile } from '@/lib/supabase';
import { toast } from 'sonner';
import { saveAs } from 'file-saver';

const ITEMS_PER_PAGE = 12;

interface GalleryGridProps {
  isAdmin?: boolean;
  onFilesLoaded?: (files: UploadedFile[]) => void;
}

const GalleryGrid: React.FC<GalleryGridProps> = ({ isAdmin = false, onFilesLoaded }) => {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [previewFile, setPreviewFile] = useState<UploadedFile | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    loadFiles();
  }, []);

  const loadFiles = async () => {
    setIsLoading(true);
    try {
      const scriptUrl = import.meta.env.VITE_APPS_SCRIPT_URL;

      const response = await fetch(scriptUrl);
      const data = await response.json();

      // Check if the data is an array of URLs to prevent UI crashes
      if (!Array.isArray(data)) {
        throw new Error("Invalid data received from Google");
      }

      // Convert the simple URLs into the format your UI needs to draw the grid
      const liveImages = data.map((url, i) => {
        // Guess if it's a video based on the link (Google Drive links might not always show it, so it defaults to image)
        const isVideo = url.toLowerCase().includes('.mp4') || url.toLowerCase().includes('.mov');

        return {
          id: `live-img-${i}`,
          name: `Memory ${i + 1}`, // Auto-generates a clean name for downloading
          url: url,
          size: 0,
          type: isVideo ? 'video' : 'image',
          created_at: new Date().toISOString()
        };
      });

      setFiles(liveImages as any[]);
      onFilesLoaded?.(liveImages as any[]);
    } catch (error) {
      console.error('Failed to fetch live images:', error);
      toast.error('Failed to load gallery');
    } finally {
      setIsLoading(false);
    }
  };


  const handleDelete = async (file: UploadedFile) => {
    if (!confirm('Are you sure you want to delete this file?')) return;
    try {
      await deleteFile(file.id, file.name);
      setFiles(prev => prev.filter(f => f.id !== file.id));
      toast.success('File deleted');
    } catch (error) {
      toast.error('Failed to delete file');
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-6 w-full">
        <div className="relative">
          <Loader2 className="w-12 h-12 animate-spin text-[#B4915C] opacity-20" />
          <Loader2 className="w-12 h-12 animate-spin text-[#B4915C] absolute inset-0 [animation-delay:0.2s]" />
        </div>
        <p className="text-[#1C1917]/40 font-serif text-lg italic">Reliving moments...</p>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="text-center py-20 space-y-6 max-w-md mx-auto w-full">
        <div className="w-20 h-20 bg-stone-100 rounded-full flex items-center justify-center mx-auto text-[#B4915C]/20 shadow-inner">
          <ImageIcon className="w-10 h-10" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-serif text-[#1C1917]">No memories shared yet</h3>
          <p className="text-[#1C1917]/40 text-sm leading-relaxed px-6">Be the first to share a beautiful moment from the wedding!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-8">
      {/* Pagination info */}
      {files.length > ITEMS_PER_PAGE && (
        <p className="text-center text-xs text-[#1C1917]/40 uppercase tracking-widest">
          Showing {Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, files.length)}–{Math.min(currentPage * ITEMS_PER_PAGE, files.length)} of {files.length} memories
        </p>
      )}

      <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 space-y-6">
        {files.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map((file) => (
          <motion.div
            key={file.id}
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="break-inside-avoid group relative overflow-hidden rounded-3xl bg-white shadow-md hover:shadow-xl transition-all border border-stone-100"
          >
            {file.type === 'image' ? (
              <img
                src={file.url}
                alt={file.name}
                className="w-full h-auto object-cover cursor-pointer"
                loading="lazy"
                onClick={() => setPreviewFile(file)}
              />
            ) : (
              <div
                className="aspect-[4/3] bg-stone-900 flex items-center justify-center relative cursor-pointer"
                onClick={() => setPreviewFile(file)}
              >
                <video src={file.url} className="w-full h-full object-cover" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/30">
                    <Video className="w-7 h-7" />
                  </div>
                </div>
              </div>
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-end p-4">
              <div className="flex items-center justify-between text-white">
                <div className="min-w-0 pr-2">
                  <p className="text-[10px] uppercase tracking-widest opacity-70">{file.type}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPreviewFile(file)}
                    className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full backdrop-blur-md flex items-center justify-center transition-all border border-white/20"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  {isAdmin && (
                    <button
                      onClick={() => handleDelete(file)}
                      className="w-8 h-8 bg-red-500/20 hover:bg-red-500/40 rounded-full backdrop-blur-md flex items-center justify-center text-red-200 transition-all border border-red-500/20"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Pagination Controls */}
      {files.length > ITEMS_PER_PAGE && (() => {
        const totalPages = Math.ceil(files.length / ITEMS_PER_PAGE);
        const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);
        // Show at most 5 page numbers centered around current page
        const visiblePages = pageNumbers.filter(p =>
          p === 1 || p === totalPages || (p >= currentPage - 1 && p <= currentPage + 1)
        );

        return (
          <div className="flex items-center justify-center gap-2 pt-8 flex-wrap">
            {/* Previous */}
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => { setCurrentPage(p => p - 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              className="rounded-full border-[#B4915C]/30 text-[#B4915C] hover:bg-[#B4915C] hover:text-white disabled:opacity-30 transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>

            {/* Page numbers */}
            {visiblePages.reduce<(number | '...')[]>((acc, page, idx, arr) => {
              if (idx > 0 && page - (arr[idx - 1] as number) > 1) acc.push('...');
              acc.push(page);
              return acc;
            }, []).map((item, idx) =>
              item === '...' ? (
                <span key={`ellipsis-${idx}`} className="px-2 text-[#1C1917]/30 text-sm">…</span>
              ) : (
                <button
                  key={item}
                  onClick={() => { setCurrentPage(item as number); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  className={`w-8 h-8 rounded-full text-sm font-medium transition-all ${
                    currentPage === item
                      ? 'bg-[#B4915C] text-white shadow-md shadow-[#B4915C]/30'
                      : 'text-[#1C1917]/60 hover:bg-[#B4915C]/10 hover:text-[#B4915C]'
                  }`}
                >
                  {item}
                </button>
              )
            )}

            {/* Next */}
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === totalPages}
              onClick={() => { setCurrentPage(p => p + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              className="rounded-full border-[#B4915C]/30 text-[#B4915C] hover:bg-[#B4915C] hover:text-white disabled:opacity-30 transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        );
      })()}

      <AnimatePresence>
        {previewFile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-stone-950/95 backdrop-blur-xl flex items-center justify-center p-4"
            onClick={() => setPreviewFile(null)}
          >
            <motion.button
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all border border-white/10"
              onClick={() => setPreviewFile(null)}
            >
              <X className="w-5 h-5" />
            </motion.button>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="max-w-5xl w-full flex flex-col items-center justify-center gap-6"
              onClick={(e) => e.stopPropagation()}
            >
              {previewFile.type === 'image' ? (
                <img
                  src={previewFile.url}
                  alt={previewFile.name}
                  className="max-w-full max-h-[70vh] object-contain rounded-xl shadow-2xl"
                />
              ) : (
                <video
                  src={previewFile.url}
                  controls
                  autoPlay
                  className="max-w-full max-h-[70vh] rounded-xl shadow-2xl"
                />
              )}

              <div className="flex flex-col items-center gap-4">
                <Button
                  onClick={() => saveAs(previewFile.url, previewFile.name)}
                  className="bg-white text-stone-900 hover:bg-[#B4915C] hover:text-white rounded-full gap-3 px-8 h-12 transition-all shadow-xl"
                >
                  <Download className="w-4 h-4" />
                  Download Memory
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GalleryGrid;