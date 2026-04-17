import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { LogIn, Grid, FileArchive, Search, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { UploadedFile } from '@/lib/supabase';
import { toast } from 'sonner';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import GalleryGrid from '@/components/GalleryGrid';

const Admin = () => {
  const [password, setPassword] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDownloading, setIsDownloading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'MinasieLidiya2026') {
      setIsAuthorized(true);
      toast.success('Access granted');
    } else {
      toast.error('Incorrect password');
    }
  };

  const downloadAll = async () => {
    if (files.length === 0) return;
    setIsDownloading(true);
    const zip = new JSZip();
    
    try {
      toast.info('Preparing your download... this may take a moment.');
      
      const downloadPromises = files.map(async (file) => {
        try {
          const response = await fetch(file.url);
          const blob = await response.blob();
          zip.file(file.name, blob);
        } catch (e) {
          console.error(`Failed to download ${file.name}`, e);
        }
      });

      await Promise.all(downloadPromises);
      const content = await zip.generateAsync({ type: 'blob' });
      const dateStr = new Date().toLocaleDateString().split('/').join('-');
      saveAs(content, `wedding-memories-${dateStr}.zip`);
      toast.success('Download started!');
    } catch (error) {
      console.error(error);
      toast.error('Failed to create zip archive');
    } finally {
      setIsDownloading(false);
    }
  };

  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[#FDFBF7]">
        <Card className="w-full max-w-md border-none shadow-2xl rounded-[40px] overflow-hidden">
          <CardContent className="p-12 space-y-10">
            <div className="text-center space-y-4">
              <div className="w-24 h-24 bg-[#B4915C]/10 rounded-full flex items-center justify-center text-[#B4915C] mx-auto">
                <LogIn className="w-12 h-12" />
              </div>
              <h2 className="text-3xl font-serif text-[#1C1917]">Admin Access</h2>
              <p className="text-[#1C1917]/50 text-sm italic">Secure access for Minasie & Lidiya</p>
            </div>
            <form onSubmit={handleLogin} className="space-y-8">
              <Input
                type="password"
                placeholder="Enter password..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-16 border-[#B4915C]/10 focus-visible:ring-[#B4915C]/20 rounded-2xl bg-[#FDFBF7] text-lg text-center font-serif"
                autoFocus
              />
              <Button type="submit" className="w-full h-16 bg-[#1C1917] hover:bg-[#1C1917]/90 text-white rounded-2xl text-lg shadow-2xl transition-all active:scale-[0.98]">
                Unlock Gallery
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7]">
      <header className="sticky top-0 z-20 backdrop-blur-xl bg-white/70 border-b border-stone-100 p-6 md:p-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="flex items-center gap-6">
            <div>
              <h1 className="text-3xl font-serif text-[#1C1917]">Admin Dashboard</h1>
              <p className="text-[10px] text-[#B4915C] uppercase tracking-[0.4em] font-bold">Management Portal</p>
            </div>
            <div className="hidden md:flex items-center gap-2 px-5 py-2 bg-[#B4915C]/10 text-[#B4915C] rounded-full text-xs font-bold tracking-widest uppercase shadow-sm">
              <Grid className="w-4 h-4" />
              {files.length} Shared Moments
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="relative flex-1 md:w-80">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <Input 
                placeholder="Search memories..." 
                className="pl-12 h-14 rounded-2xl bg-white border-none shadow-inner ring-offset-0 focus-visible:ring-[#B4915C]/20"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button 
              onClick={downloadAll} 
              disabled={isDownloading || files.length === 0}
              className="bg-[#B4915C] hover:bg-[#B4915C]/90 text-white rounded-2xl gap-3 px-8 h-14 shadow-xl shadow-[#B4915C]/20 transition-all hover:scale-[1.02]"
            >
              {isDownloading ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileArchive className="w-5 h-5" />}
              <span className="hidden sm:inline font-medium">Export All</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-8 md:p-12">
        <GalleryGrid 
          isAdmin={true} 
          onFilesLoaded={setFiles}
        />
      </main>
      
      <footer className="p-12 text-center opacity-30">
        <p className="text-xs font-serif italic text-[#1C1917]">Secure Admin Panel &bull; 2026</p>
      </footer>
    </div>
  );
};

export default Admin;