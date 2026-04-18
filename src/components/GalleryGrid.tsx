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

// Determines layout pattern: 'hero' = wide+tall, 'small' = compact
// Pattern repeats: hero, small, small, hero, small, small ...
function getCardLayout(index: number): { colSpan: string; aspectRatio: string } {
  const pos = index % 3;
  if (pos === 0) {
    return { colSpan: 'col-span-2 row-span-2', aspectRatio: 'aspect-[4/3]' };
  }
  return { colSpan: 'col-span-1 row-span-1', aspectRatio: 'aspect-[3/4]' };
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

      if (!Array.isArray(data)) throw new Error('Invalid data received from Google');

      const liveImages = data.map((url, i) => {
        const isVideo = url.toLowerCase().includes('.mp4') || url.toLowerCase().includes('.mov');
        return {
          id: `live-img-${i}`,
          name: `Memory ${i + 1}`,
          url,
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
    } catch {
      toast.error('Failed to delete file');
    }
  };

  const goToPage = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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

  const totalPages = Math.ceil(files.length / ITEMS_PER_PAGE);
  const pageFiles = files.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const visiblePageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1).filter(
    p => p === 1 || p === totalPages || (p >= currentPage - 1 && p <= currentPage + 1)
  );

  return (
    <div className="w-full space-y-10">
      {/* Memory count pill */}
      {files.length > ITEMS_PER_PAGE && (
        <p className="text-center text-[10px] text-[#B4915C]/70 uppercase tracking-[0.3em] font-semibold">
          ✦ {Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, files.length)}–{Math.min(currentPage * ITEMS_PER_PAGE, files.length)} of {files.length} memories ✦
        </p>
      )}

      {/* ─── Asymmetric Masonry Grid ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 auto-rows-[200px] sm:auto-rows-[220px] gap-3 sm:gap-4">
        {pageFiles.map((file, index) => {
          const { colSpan, aspectRatio } = getCardLayout(index);
          return (
            <motion.div
              key={file.id}
              layout
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: index * 0.04 }}
              className={`${colSpan} group relative overflow-hidden rounded-3xl cursor-pointer
                shadow-md hover:shadow-xl
                hover:shadow-[#B4915C]/20
                transition-all duration-500`}
              onClick={() => setPreviewFile(file)}
            >
              {file.type === 'image' ? (
                <img
                  src={file.url}
                  alt={file.name}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  loading="lazy"
                />
              ) : (
                <div className="relative w-full h-full bg-stone-900">
                  <video src={file.url} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/30">
                      <Video className="w-6 h-6" />
                    </div>
                  </div>
                </div>
              )}

              {/* Gold-tinted hover overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#1C1917]/80 via-[#B4915C]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-400 flex flex-col justify-end p-4">
                <div className="flex items-end justify-between text-white">
                  <p className="text-[9px] uppercase tracking-[0.25em] text-[#B4915C]/90 font-semibold">
                    {file.type}
                  </p>
                  <div className="flex gap-1.5">
                    <div className="w-8 h-8 bg-white/15 hover:bg-[#B4915C]/60 rounded-full backdrop-blur-md flex items-center justify-center transition-all border border-white/20">
                      <Eye className="w-3.5 h-3.5" />
                    </div>
                    {isAdmin && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(file); }}
                        className="w-8 h-8 bg-red-500/20 hover:bg-red-500/50 rounded-full backdrop-blur-md flex items-center justify-center text-red-200 transition-all border border-red-500/20"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Subtle gold border glow on hover */}
              <div className="absolute inset-0 rounded-3xl border-2 border-[#B4915C]/0 group-hover:border-[#B4915C]/30 transition-all duration-500 pointer-events-none" />
            </motion.div>
          );
        })}
      </div>

      {/* ─── Ornamental Pagination ─── */}
      {totalPages > 1 && (
        <div className="flex flex-col items-center gap-5 pt-8 pb-4">
          {/* Ornamental divider */}
          <div className="flex items-center gap-3 w-full max-w-xs">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent to-[#B4915C]/30" />
            <span className="text-[#B4915C]/60 text-xs tracking-widest">✦</span>
            <div className="flex-1 h-px bg-gradient-to-l from-transparent to-[#B4915C]/30" />
          </div>

          {/* Pagination row */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-center">
            {/* Prev pill */}
            <button
              disabled={currentPage === 1}
              onClick={() => goToPage(currentPage - 1)}
              className="flex items-center gap-1.5 h-10 px-4 rounded-full border border-[#B4915C]/30 text-[#B4915C] text-sm font-medium
                hover:bg-[#B4915C] hover:text-white hover:border-[#B4915C]
                disabled:opacity-30 disabled:cursor-not-allowed
                transition-all duration-300 touch-manipulation"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Prev</span>
            </button>

            {/* Page numbers with ellipsis */}
            {visiblePageNumbers.reduce<(number | '...')[]>((acc, page, idx, arr) => {
              if (idx > 0 && page - (arr[idx - 1] as number) > 1) acc.push('...');
              acc.push(page);
              return acc;
            }, []).map((item, idx) =>
              item === '...' ? (
                <span key={`dots-${idx}`} className="w-10 h-10 flex items-center justify-center text-[#1C1917]/30 text-sm">…</span>
              ) : (
                <button
                  key={item}
                  onClick={() => goToPage(item as number)}
                  className={`w-10 h-10 rounded-full text-sm font-semibold transition-all duration-300 touch-manipulation
                    ${currentPage === item
                      ? 'bg-[#B4915C] text-white shadow-lg shadow-[#B4915C]/40 scale-110'
                      : 'text-[#1C1917]/60 border border-[#B4915C]/20 hover:border-[#B4915C]/50 hover:text-[#B4915C] hover:bg-[#B4915C]/5'
                    }`}
                >
                  {item}
                </button>
              )
            )}

            {/* Next pill */}
            <button
              disabled={currentPage === totalPages}
              onClick={() => goToPage(currentPage + 1)}
              className="flex items-center gap-1.5 h-10 px-4 rounded-full border border-[#B4915C]/30 text-[#B4915C] text-sm font-medium
                hover:bg-[#B4915C] hover:text-white hover:border-[#B4915C]
                disabled:opacity-30 disabled:cursor-not-allowed
                transition-all duration-300 touch-manipulation"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Bottom ornament */}
          <div className="flex items-center gap-3 w-full max-w-xs">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent to-[#B4915C]/20" />
            <span className="text-[#B4915C]/40 text-[10px] tracking-[0.4em] uppercase font-medium">
              Page {currentPage} / {totalPages}
            </span>
            <div className="flex-1 h-px bg-gradient-to-l from-transparent to-[#B4915C]/20" />
          </div>
        </div>
      )}

      {/* ─── Lightbox ─── */}
      <AnimatePresence>
        {previewFile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-stone-950/96 backdrop-blur-xl flex items-center justify-center p-4"
            onClick={() => setPreviewFile(null)}
          >
            <motion.button
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="absolute top-5 right-5 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all border border-white/10"
              onClick={() => setPreviewFile(null)}
            >
              <X className="w-5 h-5" />
            </motion.button>
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ type: 'spring', damping: 25 }}
              className="max-w-5xl w-full flex flex-col items-center justify-center gap-6"
              onClick={(e) => e.stopPropagation()}
            >
              {previewFile.type === 'image' ? (
                <img
                  src={previewFile.url}
                  alt={previewFile.name}
                  className="max-w-full max-h-[72vh] object-contain rounded-2xl shadow-2xl"
                />
              ) : (
                <video
                  src={previewFile.url}
                  controls
                  autoPlay
                  className="max-w-full max-h-[72vh] rounded-2xl shadow-2xl"
                />
              )}
              <div className="flex items-center gap-4">
                <p className="text-white/50 text-xs tracking-widest uppercase">{previewFile.name}</p>
                <Button
                  onClick={() => saveAs(previewFile.url, previewFile.name)}
                  className="bg-white/10 hover:bg-[#B4915C] text-white rounded-full gap-2 px-6 h-10 transition-all shadow-xl border border-white/20 text-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download
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