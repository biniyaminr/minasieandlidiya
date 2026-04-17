import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import { Toaster } from 'sonner';
import Home from './pages/Home';
import Upload from './pages/Upload';
import Admin from './pages/Admin';

function App() {
  // Inject fonts and global styles since index.css is protected
  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400..900;1,400..900&family=Inter:wght@300;400;500;600&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);

    const style = document.createElement('style');
    style.innerHTML = `
      body { 
        font-family: 'Inter', sans-serif; 
        background-color: #FDFBF7;
      }
      h1, h2, h3, h4, h5, h6 { 
        font-family: 'Playfair Display', serif; 
      }
      .glass-morphism {
        backdrop-filter: blur(12px);
        background-color: rgba(255, 255, 255, 0.3);
        border: 1px solid rgba(255, 255, 255, 0.2);
      }
      .masonry-grid {
        columns: 1;
        column-gap: 1rem;
      }
      .masonry-item {
        break-inside: avoid;
        margin-bottom: 1rem;
      }
      @media (min-width: 640px) { .masonry-grid { columns: 2; } }
      @media (min-width: 1024px) { .masonry-grid { columns: 3; } }
      @media (min-width: 1280px) { .masonry-grid { columns: 4; } }
    `;
    document.head.appendChild(style);
  }, []);

  return (
    <Router>
      <div className="min-h-screen bg-[#FDFBF7] text-[#1C1917]">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/upload" element={<Upload />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
        <Toaster position="top-center" richColors />
      </div>
    </Router>
  );
}

export default App;