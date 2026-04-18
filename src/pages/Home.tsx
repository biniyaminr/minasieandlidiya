import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, 
  Heart, 
  Sparkles, 
  Upload as UploadIcon, 
  Camera, 
  Video, 
  CheckCircle2, 
  Loader2, 
  X, 
  Image as ImageIcon, 
  Plus 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import GalleryGrid from '@/components/GalleryGrid';
import { uploadFile } from '@/lib/supabase';
import { cn } from '@/lib/utils';

interface UploadState {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  url?: string;
}

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB limit

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      let encoded = reader.result?.toString().replace(/^data:(.*,)?/, '');
      if ((encoded!.length % 4) > 0) {
        encoded += '='.repeat(4 - (encoded!.length % 4));
      }
      resolve(encoded!);
    };
    reader.onerror = error => reject(error);
  });
};
const Home = () => {
  // Upload States
  const [uploads, setUploads] = useState<UploadState[]>([]);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startUploads = useCallback(async (newUploadItems: UploadState[]) => {
    const appsScriptUrl = import.meta.env.VITE_APPS_SCRIPT_URL;

    for (const uploadItem of newUploadItems) {
      try {
        setUploads(prev => prev.map(u => 
          u.file === uploadItem.file ? { ...u, status: 'uploading', progress: 50 } : u
        ));

        // 1. Convert file to Base64 (Ensure fileToBase64 helper is in Home.tsx)
        const base64Data = await fileToBase64(uploadItem.file);

        // 2. The Plain Text Bypass to Google Apps Script
        const response = await fetch(appsScriptUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'text/plain;charset=utf-8',
          },
          body: JSON.stringify({
            filename: uploadItem.file.name,
            mimetype: uploadItem.file.type,
            data: base64Data
          })
        });

        const resultText = await response.text();
        const resultData = JSON.parse(resultText);
        
        if (resultData.status !== 'success') {
          throw new Error(resultData.message || "Apps script returned an error");
        }

        setUploads(prev => prev.map(u => 
          u.file === uploadItem.file ? { ...u, status: 'completed', progress: 100 } : u
        ));
      } catch (error) {
        console.error('Upload failed:', error);
        setUploads(prev => prev.map(u => 
          u.file === uploadItem.file ? { ...u, status: 'error' } : u
        ));
        toast.error(`Failed to upload ${uploadItem.file.name}`);
      }
    }
  }, []);

  const processFiles = useCallback((files: File[]) => {
    if (files.length === 0) return;

    const validFiles: File[] = [];
    const invalidFiles: string[] = [];
    const oversizedFiles: string[] = [];

    files.forEach(file => {
      const isAccepted = file.type.startsWith('image/') || file.type.startsWith('video/');
      const isWithinSize = file.size <= MAX_FILE_SIZE;

      if (!isAccepted) {
        invalidFiles.push(file.name);
      } else if (!isWithinSize) {
        oversizedFiles.push(file.name);
      } else {
        const isDuplicate = uploads.some(u => u.file.name === file.name && u.file.size === file.size);
        if (!isDuplicate) {
          validFiles.push(file);
        }
      }
    });

    if (invalidFiles.length > 0) {
      toast.error(`Skipped ${invalidFiles.length} invalid files (only images & videos allowed).`);
    }

    if (oversizedFiles.length > 0) {
      toast.error(`Skipped ${oversizedFiles.length} files exceeding 100MB.`);
    }

    if (validFiles.length === 0) return;

    const newUploads = validFiles.map(file => ({
      file,
      progress: 0,
      status: 'pending' as const
    }));

    setUploads(prev => [...prev, ...newUploads]);
    startUploads(newUploads);
  }, [uploads, startUploads]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(Array.from(e.target.files));
    }
    if (e.target) e.target.value = '';
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(Array.from(e.dataTransfer.files));
    }
  };

  const removeUpload = (file: File) => {
    setUploads(prev => prev.filter(u => u.file !== file));
  };

  const allCompleted = uploads.length > 0 && uploads.every(u => u.status === 'completed');
  const isCurrentlyUploading = uploads.some(u => u.status === 'uploading');

  return (
    <div className="min-h-screen bg-[#FDFBF7] font-sans selection:bg-[#B4915C]/20">
      {/* Hero Section */}
      <header className="relative py-12 md:py-20 px-4 text-center overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#B4915C]/5 via-transparent to-transparent opacity-50" />
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 max-w-2xl mx-auto space-y-6"
        >
          <div className="flex justify-center mb-4">
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 4, repeat: Infinity }}
              className="w-16 h-16 bg-white rounded-full shadow-lg flex items-center justify-center text-[#B4915C]"
            >
              <Heart className="w-8 h-8 fill-current" />
            </motion.div>
          </div>
          <h1 className="text-4xl md:text-7xl font-serif text-[#1C1917] tracking-tight">
            Minasie & Lidiya
          </h1>
          <div className="flex flex-col items-center gap-3">
            <p className="text-lg md:text-xl text-[#B4915C] font-serif italic flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              April 19, 2026
            </p>
            <div className="h-px w-24 bg-[#B4915C]/20" />
            <p className="text-xs text-[#1C1917]/50 uppercase tracking-[0.4em] font-semibold">
              Celebrating Our Love
            </p>
          </div>
        </motion.div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 pb-16 md:pb-24 space-y-16 md:space-y-24">
        {/* Upload Section — shown first so guests see it immediately */}
        <section className="flex flex-col items-center">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="w-full max-w-xl"
          >
            <Card className="glass-morphism border-none shadow-2xl overflow-hidden rounded-[40px] relative transition-all duration-500">
              <div className="absolute -top-12 -right-12 w-32 h-32 bg-[#B4915C]/10 rounded-full blur-3xl" />
              <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-[#B4915C]/10 rounded-full blur-3xl" />
              
              <CardContent className="p-5 sm:p-8 md:p-10 space-y-6 md:space-y-8 relative z-10">
                {isSuccess ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center space-y-6 py-10"
                  >
                    <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center text-green-600 shadow-sm mx-auto mb-6">
                      <CheckCircle2 className="w-16 h-16" />
                    </div>
                    <div className="space-y-3">
                      <h2 className="text-3xl font-serif text-[#1C1917]">Successfully Shared</h2>
                      <p className="text-[#1C1917]/60 max-w-xs mx-auto leading-relaxed">
                        Thank you for sharing your beautiful moments with Minasie & Lidiya. Your memories are now part of our story!
                      </p>
                    </div>
                    <Button 
                      onClick={() => {
                        setUploads([]);
                        setIsSuccess(false);
                      }}
                      className="bg-[#B4915C] hover:bg-[#B4915C]/90 text-white rounded-full px-10 h-14 shadow-lg shadow-[#B4915C]/20 transition-all hover:scale-[1.02] active:scale-95"
                    >
                      Upload More
                    </Button>
                  </motion.div>
                ) : (
                  <>
                    <div className="text-center space-y-2 mb-8">
                      <h3 className="text-2xl font-serif text-[#1C1917]">Share Your View</h3>
                      <p className="text-sm text-[#1C1917]/50">Upload your favorite moments from the wedding</p>
                    </div>

                    <div 
                      onDragEnter={handleDragEnter}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      className={cn(
                        "group border-2 border-dashed rounded-2xl sm:rounded-[32px] flex flex-col items-center justify-center p-6 sm:p-12 text-center transition-all duration-500 relative overflow-hidden",
                        isDragging 
                          ? "border-[#B4915C] bg-[#B4915C]/5 scale-[0.98] shadow-2xl shadow-[#B4915C]/10" 
                          : "border-[#B4915C]/20 bg-white/40 hover:bg-white/60 hover:border-[#B4915C]/40"
                      )}
                    >
                      <input 
                        type="file" 
                        id="wedding-upload-home"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        multiple 
                        accept="image/*,video/*" 
                        className="sr-only"
                        aria-label="Upload wedding photos and videos"
                      />
                      
                      <motion.div 
                        animate={{ 
                          scale: isDragging ? 1.15 : 1,
                          y: isDragging ? -12 : 0,
                        }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        className={cn(
                          "w-20 h-20 rounded-full flex items-center justify-center mb-6 shadow-inner transition-colors duration-300",
                          isDragging ? "bg-[#B4915C] text-white" : "bg-[#B4915C]/10 text-[#B4915C]"
                        )}
                      >
                        {isDragging ? (
                          <Plus className="w-10 h-10 animate-pulse" />
                        ) : (
                          <UploadIcon className="w-8 h-8" />
                        )}
                      </motion.div>

                      <div className="space-y-3 mb-8 z-10 relative">
                        <h4 className="text-xl font-serif text-[#1C1917]">
                          {isDragging ? 'Release to Share' : 'Select Photos & Videos'}
                        </h4>
                        <p className="text-[#1C1917]/50 text-xs max-w-[200px] mx-auto leading-relaxed">
                          Drag and drop your memories here, or tap the button below
                        </p>
                      </div>

                      <Button 
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isCurrentlyUploading}
                        className={cn(
                          "w-full bg-[#B4915C] hover:bg-[#B4915C]/90 text-white rounded-full px-8 h-12 sm:h-12 shadow-lg shadow-[#B4915C]/10 transition-all hover:scale-[1.05] active:scale-95 z-10 font-medium touch-manipulation",
                          isCurrentlyUploading && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        {isCurrentlyUploading ? (
                          <span className="flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Uploading...
                          </span>
                        ) : (
                          'Upload Photos'
                        )}
                      </Button>

                      <div className="flex gap-6 mt-8 z-10 opacity-60">
                        <div className="flex flex-col items-center gap-1">
                          <Camera className="w-5 h-5 text-[#B4915C]" />
                          <span className="text-[9px] font-bold uppercase tracking-widest text-[#1C1917]/30">Photos</span>
                        </div>
                        <div className="flex flex-col items-center gap-1">
                          <Video className="w-5 h-5 text-[#B4915C]" />
                          <span className="text-[9px] font-bold uppercase tracking-widest text-[#1C1917]/30">Videos</span>
                        </div>
                      </div>

                      <AnimatePresence>
                        {isDragging && (
                          <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-[#B4915C]/5 pointer-events-none flex items-center justify-center"
                          >
                            <div className="absolute inset-4 border-2 border-[#B4915C] border-dashed rounded-[32px] opacity-30 animate-pulse" />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Upload List & Progress */}
                    <AnimatePresence>
                      {uploads.length > 0 && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="space-y-6 pt-8 border-t border-[#B4915C]/10"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex flex-col">
                              <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#1C1917]/40 mb-1">
                                Sharing Status
                              </h4>
                              <p className="text-sm font-serif text-[#1C1917]">
                                {allCompleted ? 'Ready to send' : 'Uploading your memories...'}
                              </p>
                            </div>
                            <div className="bg-white px-3 py-1 rounded-full shadow-sm border border-[#B4915C]/10">
                              <span className="text-[11px] font-bold text-[#B4915C]">
                                {uploads.filter(u => u.status === 'completed').length} / {uploads.length}
                              </span>
                            </div>
                          </div>
                          
                          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                            {uploads.map((upload, index) => (
                              <Card key={`${upload.file.name}-${index}`} className="p-3 border-none shadow-sm flex items-center gap-4 bg-white/70 rounded-2xl group transition-all hover:bg-white">
                                <div className="w-12 h-12 rounded-xl bg-[#FDFBF7] flex items-center justify-center overflow-hidden flex-shrink-0 relative">
                                  {upload.file.type.startsWith('image') ? (
                                    <ImageIcon className="w-5 h-5 text-[#B4915C]/40" />
                                  ) : (
                                    <Video className="w-5 h-5 text-[#B4915C]/40" />
                                  )}
                                  {upload.status === 'completed' && (
                                    <div className="absolute inset-0 bg-green-500/10 flex items-center justify-center">
                                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex justify-between items-start mb-1">
                                    <p className="text-[10px] font-semibold text-[#1C1917] truncate">{upload.file.name}</p>
                                  </div>
                                  <div className="mt-1.5 relative">
                                    <div className="h-1 w-full bg-[#B4915C]/10 rounded-full overflow-hidden">
                                      <motion.div 
                                        className={cn(
                                          "h-full transition-colors",
                                          upload.status === 'error' ? "bg-red-400" : "bg-[#B4915C]"
                                        )}
                                        initial={{ width: 0 }}
                                        animate={{ width: `${upload.progress}%` }}
                                        transition={{ duration: 0.5, ease: "easeOut" }}
                                      />
                                    </div>
                                  </div>
                                </div>
                                <div className="flex-shrink-0 flex items-center ml-2">
                                  {upload.status === 'uploading' && (
                                    <Loader2 className="w-4 h-4 animate-spin text-[#B4915C]" />
                                  )}
                                  {(upload.status === 'error' || upload.status === 'completed' || upload.status === 'pending') && (
                                    <button 
                                      onClick={() => removeUpload(upload.file)} 
                                      className="p-2 hover:bg-red-50 rounded-full transition-colors text-[#1C1917]/20 hover:text-red-400"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </Card>
                            ))}
                          </div>
                          
                          <div className="pt-2">
                            <Button 
                              disabled={!allCompleted}
                              onClick={() => {
                                toast.success('Thank you for sharing!');
                                setIsSuccess(true);
                              }}
                              className="w-full h-14 bg-[#B4915C] hover:bg-[#B4915C]/90 text-white rounded-2xl sm:rounded-[22px] shadow-xl shadow-[#B4915C]/20 disabled:opacity-30 disabled:grayscale text-base sm:text-lg font-serif transition-all active:scale-[0.98] touch-manipulation"
                            >
                              {allCompleted ? 'Finish & Share Moments' : `Uploading (${uploads.filter(u => u.status === 'uploading').length} left)...`}
                            </Button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </>
                )}
              </CardContent>
            </Card>
            <p className="text-center mt-8 text-xs text-[#1C1917]/40 max-w-[280px] mx-auto leading-relaxed tracking-wide uppercase">
              Share your beautiful photos and videos to be featured in our collective wedding gallery.
            </p>
          </motion.div>
        </section>

        {/* Gallery Section — below upload so guests scroll down to see shared memories */}
        <section className="space-y-10">
          <div className="flex flex-col items-center text-center space-y-5">
            {/* Ornamental top mark */}
            <div className="flex items-center gap-3 w-full max-w-sm">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent to-[#B4915C]/40" />
              <span className="text-[#B4915C]/60 text-xs tracking-[0.4em]">✦</span>
              <div className="flex-1 h-px bg-gradient-to-l from-transparent to-[#B4915C]/40" />
            </div>

            <div className="space-y-3 px-4">
              <p className="text-[10px] text-[#B4915C]/70 uppercase tracking-[0.4em] font-semibold">
                A Shared Odyssey
              </p>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-serif text-[#1C1917] leading-tight tracking-wide">
                Our Sacred Chapters
              </h2>
              <p className="text-xs sm:text-sm text-[#B4915C]/80 uppercase tracking-[0.3em] font-medium italic">
                Paginated Memories, One Extraordinary Love.
              </p>
            </div>

            {/* Ornamental bottom mark */}
            <div className="flex items-center gap-3 w-full max-w-sm">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent to-[#B4915C]/40" />
              <span className="text-[#B4915C]/40 text-[10px] tracking-widest">✦ ✦ ✦</span>
              <div className="flex-1 h-px bg-gradient-to-l from-transparent to-[#B4915C]/40" />
            </div>
          </div>
          <GalleryGrid />
        </section>
      </main>

      <footer className="py-12 text-center border-t border-[#B4915C]/10">
        <p className="text-[10px] text-[#1C1917]/30 uppercase tracking-[0.5em] font-bold">
          Minasie & Lidiya &bull; April 19, 2026
        </p>
      </footer>

      {/* Custom Styles for Scrollbar */}
      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #B4915C20;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #B4915C40;
        }
      `}} />
    </div>
  );
};

export default Home;