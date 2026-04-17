import { createClient } from '@supabase/supabase-js';

// These would normally be environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder';

export const supabase = createClient(supabaseUrl, supabaseKey);

// Storage bucket name
export const BUCKET_NAME = 'wedding-uploads';

export interface UploadedFile {
  id: string;
  name: string;
  url: string;
  type: 'image' | 'video';
  created_at: string;
  size: number;
}

// Mocking the storage interaction for demo purposes if environment variables are not set
export const isMocked = !import.meta.env.VITE_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL.includes('placeholder');

export async function uploadFile(file: File, onProgress?: (progress: number) => void): Promise<string> {
  if (isMocked) {
    // Simulate upload progress
    return new Promise((resolve) => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 30;
        if (progress >= 100) {
          progress = 100;
          clearInterval(interval);
          onProgress?.(100);
          resolve(URL.createObjectURL(file));
        } else {
          onProgress?.(progress);
        }
      }, 500);
    });
  }

  const fileExt = file.name.split('.').pop();
  const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
  const filePath = `uploads/${fileName}`;

  // Supabase Storage Upload with progress tracking using XMLHttpRequest
  // because the standard fetch-based upload() doesn't expose progress easily
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${supabaseUrl}/storage/v1/object/${BUCKET_NAME}/${filePath}`, true);
    xhr.setRequestHeader('Authorization', `Bearer ${supabaseKey}`);
    xhr.setRequestHeader('apikey', supabaseKey);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percentComplete = (event.loaded / event.total) * 100;
        onProgress?.(percentComplete);
      }
    };

    xhr.onload = async () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const { data: { publicUrl } } = supabase.storage
          .from(BUCKET_NAME)
          .getPublicUrl(filePath);

        // Track in media table
        const { error: dbError } = await supabase
          .from('media')
          .insert({
            name: file.name,
            url: publicUrl,
            type: file.type.startsWith('video') ? 'video' : 'image',
            size: file.size
          });

        if (dbError) {
          console.error('Error recording media in database:', dbError);
          // We still resolve because the file was uploaded successfully
        }

        resolve(publicUrl);
      } else {
        reject(new Error(`Upload failed with status: ${xhr.status}`));
      }
    };

    xhr.onerror = () => reject(new Error('Network error during upload'));
    
    const formData = new FormData();
    formData.append('file', file);
    xhr.send(file); // Supabase expects the raw file body for object uploads via this endpoint
  });
}

export async function fetchFiles(): Promise<UploadedFile[]> {
  if (isMocked) {
    return [
      {
        id: '1',
        name: 'wedding-1.jpg',
        url: 'https://storage.googleapis.com/dala-prod-public-storage/generated-images/c5d2344f-c863-4a1f-8f52-371a8cada1b4/wedding-photo-1-0d71b83d-1776407915686.webp',
        type: 'image',
        created_at: new Date().toISOString(),
        size: 1024 * 1024 * 2
      },
      {
        id: '2',
        name: 'wedding-2.jpg',
        url: 'https://storage.googleapis.com/dala-prod-public-storage/generated-images/c5d2344f-c863-4a1f-8f52-371a8cada1b4/wedding-photo-2-dd142a1c-1776407914545.webp',
        type: 'image',
        created_at: new Date().toISOString(),
        size: 1024 * 1024 * 1.5
      },
      {
        id: '3',
        name: 'wedding-3.jpg',
        url: 'https://storage.googleapis.com/dala-prod-public-storage/generated-images/c5d2344f-c863-4a1f-8f52-371a8cada1b4/wedding-photo-3-ecc4654b-1776407914879.webp',
        type: 'image',
        created_at: new Date().toISOString(),
        size: 1024 * 1024 * 3
      },
      {
        id: '4',
        name: 'wedding-4.jpg',
        url: 'https://storage.googleapis.com/dala-prod-public-storage/generated-images/c5d2344f-c863-4a1f-8f52-371a8cada1b4/wedding-photo-4-c882dd2e-1776407915712.webp',
        type: 'image',
        created_at: new Date().toISOString(),
        size: 1024 * 1024 * 2.5
      },
      {
        id: '5',
        name: 'wedding-5.jpg',
        url: 'https://storage.googleapis.com/dala-prod-public-storage/generated-images/c5d2344f-c863-4a1f-8f52-371a8cada1b4/wedding-photo-5-e3208e3f-1776407915508.webp',
        type: 'image',
        created_at: new Date().toISOString(),
        size: 1024 * 1024 * 1.8
      },
      {
        id: '6',
        name: 'wedding-6.jpg',
        url: 'https://storage.googleapis.com/dala-prod-public-storage/generated-images/c5d2344f-c863-4a1f-8f52-371a8cada1b4/wedding-photo-6-57375e3e-1776407915724.webp',
        type: 'image',
        created_at: new Date().toISOString(),
        size: 1024 * 1024 * 2.2
      }
    ];
  }

  const { data, error } = await supabase
    .from('media')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;

  return data.map(file => ({
    id: file.id,
    name: file.name,
    url: file.url,
    type: file.type,
    created_at: file.created_at,
    size: file.size
  }));
}

export async function deleteFile(id: string, fileName: string) {
  if (isMocked) return;
  
  // Delete from storage
  const { error: storageError } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([`uploads/${fileName}`]);
  
  if (storageError) throw storageError;

  // Delete from media table
  const { error: dbError } = await supabase
    .from('media')
    .delete()
    .eq('id', id);
    
  if (dbError) throw dbError;
}