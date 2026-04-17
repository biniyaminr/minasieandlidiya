import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload as UploadIcon, Camera, Video, CheckCircle2, Loader2, X, Image as ImageIcon, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface UploadState {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  url?: string;
}

const MAX_FILE_SIZE = 40 * 1024 * 1024; // 40MB limit to prevent memory limits on Apps Script

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      if (reader.result) {
        const base64Data = reader.result.toString().split(',')[1];
        resolve(base64Data);
      } else {
        reject(new Error('Failed to convert file to Base64'));
      }
    };
    reader.onerror = error => reject(error);
  });
};

const Upload = () => {
  const [uploads, setUploads] = useState<UploadState[]>([]);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async () => {
    const appsScriptUrl = import.meta.env.VITE_APPS_SCRIPT_URL;

    if (!appsScriptUrl) {
      toast.error('Upload URL is not configured.');
      return;
    }

    const pendingUploads = uploads.filter(u => u.status === 'pending');
    if (pendingUploads.length === 0) return;

    let hasError = false;

    for (const uploadItem of pendingUploads) {
      try {
        setUploads(prev => prev.map(u => 
          u.file === uploadItem.file ? { ...u, status: 'uploading', progress: 25 } : u
        ));

        // Convert file to Base64
        const base64Data = await fileToBase64(uploadItem.file);

        setUploads(prev => prev.map(u => 
          u.file === uploadItem.file ? { ...u, progress: 50 } : u
        ));

        console.log("Sending file to Google Apps Script...");
        
        // Prepare URLSearchParams payload
        const params = new URLSearchParams();
        params.append('filename', uploadItem.file.name);
        params.append('mimetype', uploadItem.file.type);
        params.append('data', base64Data);

        const response = await fetch(appsScriptUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: params.toString(),
          // mode: 'cors' is default, but ensuring we don't trigger preflight is key
        });

        const resultText = await response.text();
        console.log("Raw Response from Google:", resultText);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        // Parse the JSON manually after checking text to prevent silent JSON parse crashes
        const resultData = JSON.parse(resultText);
        
        if (resultData.status !== 'success') {
          throw new Error(resultData.message || "Apps script returned an error");
        }

        setUploads(prev => prev.map(u => 
          u.file === uploadItem.file ? { ...u, status: 'completed', progress: 100 } : u
        ));
      } catch (error) {
        console.error("Upload failed miserably:", error);
        hasError = true;
        setUploads(prev => prev.map(u => 
          u.file === uploadItem.file ? { ...u, status: 'error' } : u
        ));
        toast.error(`Failed to upload ${uploadItem.file.name}`);
        break; // Stop uploading further files if one fails
      }
    }

    if (!hasError) {
      setIsSuccess(true);
    }
  };

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
        // Check if file is already in the list
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
      toast.error(`Skipped ${oversizedFiles.length} files exceeding 40MB.`);
    }

    if (validFiles.length === 0) return;

    const newUploads = validFiles.map(file => ({
      file,
      progress: 0,
      status: 'pending' as const
    }));

    setUploads(prev => [...prev, ...newUploads]);
  }, [uploads]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(Array.from(e.target.files));
    }
    // Reset input value so same file can be selected again if removed
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
    // Only set to false if we're actually leaving the drop zone, not entering a child
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
  const hasPending = uploads.some(u => u.status === 'pending');

  if (isSuccess) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center space-y-8 bg-[#FDFBF7]">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center text-green-600 shadow-sm"
        >
          <CheckCircle2 className="w-16 h-16" />
        </motion.div>
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
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex flex-col font-sans selection:bg-[#B4915C]/20">
      <header className="p-8 text-center space-y-2">
        <h1 className="text-3xl font-serif text-[#1C1917]">Minasie & Lidiya</h1>
        <p className="text-[10px] text-[#1C1917]/50 uppercase tracking-[0.3em]">Share Your Beautiful Moments</p>
      </header>

      <main className="flex-1 p-6 flex flex-col max-w-md mx-auto w-full space-y-8">
        {/* Main Upload Area / Drop Zone */}
        <div 
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            "group flex-1 min-h-[420px] border-2 border-dashed rounded-[48px] flex flex-col items-center justify-center p-8 text-center transition-all duration-500 relative overflow-hidden",
            isDragging 
              ? "border-[#B4915C] bg-[#B4915C]/5 scale-[0.98] shadow-2xl shadow-[#B4915C]/10" 
              : "border-[#B4915C]/20 bg-white/40 hover:bg-white/60 hover:border-[#B4915C]/40"
          )}
        >
          <input 
            type="file" 
            id="wedding-upload"
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
              "w-24 h-24 rounded-full flex items-center justify-center mb-8 shadow-inner transition-colors duration-300",
              isDragging ? "bg-[#B4915C] text-white" : "bg-[#B4915C]/10 text-[#B4915C]"
            )}
          >
            {isDragging ? (
              <Plus className="w-12 h-12 animate-pulse" />
            ) : (
              <UploadIcon className="w-10 h-10" />
            )}
          </motion.div>

          <div className="space-y-4 mb-10 z-10 relative">
            <h3 className="text-2xl font-serif text-[#1C1917]">
              {isDragging ? 'Release to Share' : 'Drop Memories Here'}
            </h3>
            <p className="text-[#1C1917]/50 text-sm max-w-[240px] mx-auto leading-relaxed">
              Drag and drop your photos and videos, or tap the button below to browse
            </p>
          </div>

          <Button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isCurrentlyUploading}
            className={cn(
              "bg-[#B4915C] hover:bg-[#B4915C]/90 text-white rounded-full px-8 h-12 shadow-lg shadow-[#B4915C]/10 transition-all hover:scale-[1.05] active:scale-95 mb-10 z-10 font-medium",
              isCurrentlyUploading && "opacity-50 cursor-not-allowed"
            )}
          >
            {isCurrentlyUploading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Uploading...
              </span>
            ) : (
              'Upload Wedding Memories'
            )}
          </Button>
          
          <div className="flex gap-10 z-10">
            <div className="flex flex-col items-center gap-2 group/icon">
              <div className="w-14 h-14 rounded-2xl bg-white shadow-sm flex items-center justify-center text-[#B4915C] transition-transform group-hover/icon:-translate-y-1">
                <Camera className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#1C1917]/30">Photos</span>
            </div>
            <div className="flex flex-col items-center gap-2 group/icon">
              <div className="w-14 h-14 rounded-2xl bg-white shadow-sm flex items-center justify-center text-[#B4915C] transition-transform group-hover/icon:-translate-y-1">
                <Video className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#1C1917]/30">Videos</span>
            </div>
          </div>

          {/* Decorative Background Elements */}
          <div className="absolute top-0 right-0 p-4 opacity-5">
             <Plus className="w-12 h-12 text-[#B4915C]" />
          </div>
          <div className="absolute bottom-0 left-0 p-4 opacity-5">
             <Plus className="w-8 h-8 text-[#B4915C]" />
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
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between px-2">
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
              
              <div className="space-y-3 max-h-[340px] overflow-y-auto pr-2 custom-scrollbar">
                {uploads.map((upload, index) => (
                  <Card key={`${upload.file.name}-${index}`} className="p-4 border-none shadow-sm flex items-center gap-4 bg-white/70 rounded-2xl group transition-all hover:bg-white">
                    <div className="w-14 h-14 rounded-xl bg-[#FDFBF7] flex items-center justify-center overflow-hidden flex-shrink-0 relative">
                      {upload.file.type.startsWith('image') ? (
                        <ImageIcon className="w-6 h-6 text-[#B4915C]/40" />
                      ) : (
                        <Video className="w-6 h-6 text-[#B4915C]/40" />
                      )}
                      {upload.status === 'completed' && (
                        <div className="absolute inset-0 bg-green-500/10 flex items-center justify-center">
                          <CheckCircle2 className="w-6 h-6 text-green-500" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-1">
                        <p className="text-xs font-semibold text-[#1C1917] truncate max-w-[140px]">{upload.file.name}</p>
                        <span className="text-[9px] font-bold text-[#1C1917]/30 uppercase">
                          {(upload.file.size / (1024 * 1024)).toFixed(1)}MB
                        </span>
                      </div>
                      <div className="mt-2 relative">
                        <div className="h-1.5 w-full bg-[#B4915C]/10 rounded-full overflow-hidden">
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
                        <Loader2 className="w-5 h-5 animate-spin text-[#B4915C]" />
                      )}
                      {upload.status === 'completed' && (
                         <div className="w-5 h-5 flex items-center justify-center">
                           <CheckCircle2 className="w-5 h-5 text-green-500" />
                         </div>
                      )}
                      {(upload.status === 'error' || upload.status === 'completed' || upload.status === 'pending') && (
                        <button 
                          onClick={() => removeUpload(upload.file)} 
                          className="p-2 hover:bg-red-50 rounded-full transition-colors text-[#1C1917]/20 hover:text-red-400"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
              
              <div className="pt-2">
                <Button 
                  disabled={!hasPending || isCurrentlyUploading}
                  onClick={handleUpload}
                  className="w-full h-16 bg-[#B4915C] hover:bg-[#B4915C]/90 text-white rounded-[28px] shadow-xl shadow-[#B4915C]/20 disabled:opacity-30 disabled:grayscale text-lg font-serif transition-all active:scale-[0.98] hover:scale-[1.01]"
                >
                  {isCurrentlyUploading ? `Uploading (${uploads.filter(u => u.status === 'pending' || u.status === 'uploading').length} left)...` : 'Confirm & Upload'}
                </Button>
                <p className="text-center mt-4 text-[10px] text-[#1C1917]/30 uppercase tracking-[0.2em]">
                  Your files are secure and private
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="p-10 text-center mt-auto">
        <p className="text-[10px] text-[#1C1917]/20 uppercase tracking-[0.5em] font-medium">
          Minasie & Lidiya &bull; 2026
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

export default Upload;