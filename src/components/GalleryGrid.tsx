import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Trash2, Eye, ImageIcon, Video, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fetchFiles, UploadedFile, deleteFile } from '@/lib/supabase';
import { toast } from 'sonner';
import { saveAs } from 'file-saver';

// Static imports for wedding images (Vite requires explicit imports for src/ assets)
import img1 from '@/public/images/1.jpg';
import img2 from '@/public/images/2.jpg';
import img3 from '@/public/images/3.jpg';
import img4 from '@/public/images/4.jpg';
import img5 from '@/public/images/5.jpg';
import img6 from '@/public/images/6.jpg';
import img7 from '@/public/images/7.jpg';
import img8 from '@/public/images/8.jpg';
import img9 from '@/public/images/9.jpg';
import img10 from '@/public/images/10.jpg';
import img11 from '@/public/images/11.jpg';
import img12 from '@/public/images/12.jpg';
import img13 from '@/public/images/13.jpg';
import img14 from '@/public/images/14.jpg';
import img15 from '@/public/images/15.jpg';
import img16 from '@/public/images/16.jpg';
import img17 from '@/public/images/17.jpg';

const WEDDING_IMAGES = [
  img1, img2, img3, img4, img5, img6, img7, img8, img9,
  img10, img11, img12, img13, img14, img15, img16, img17
];

interface GalleryGridProps {
  isAdmin?: boolean;
  onFilesLoaded?: (files: UploadedFile[]) => void;
}

const GalleryGrid: React.FC<GalleryGridProps> = ({ isAdmin = false, onFilesLoaded }) => {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [previewFile, setPreviewFile] = useState<UploadedFile | null>(null);

  useEffect(() => {
    loadFiles();
  }, []);

  const loadFiles = async () => {
    setIsLoading(true);
    try {
      // Use statically imported images (in numerical order 1–17)
      const staticImages = WEDDING_IMAGES.map((src, i) => ({
        id: `static-img-${i + 1}`,
        name: `Beautiful Memory ${i + 1}`,
        url: src,
        size: 0,
        type: 'image',
        created_at: new Date().toISOString()
      }));

      await new Promise(resolve => setTimeout(resolve, 800));

      setFiles(staticImages as any[]);
      onFilesLoaded?.(staticImages as any[]);
    } catch (error) {
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
    <div className="w-full">
      <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 space-y-6">
        {files.map((file) => (
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