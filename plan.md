# Plan: Replace QR Code with Upload Button on Home Page

## 1. Analysis
- **Goal**: Remove QR code functionality from `src/pages/Home.tsx` and replace it with a styled "Upload Photos" button/input that handles file selection and upload logic.
- **Current State**: `Home.tsx` displays a QR code and a link to `/upload`. `Upload.tsx` contains the actual upload logic (Supabase integration, progress tracking, drag-and-drop).
- **Strategy**: Port the robust upload logic from `Upload.tsx` into `Home.tsx` to provide a seamless "one-page" experience for guests. The "Upload Photos" button will replace the QR code in the existing styled card.

## 2. Implementation Steps
### 1. Update `src/pages/Home.tsx`
- **Imports**: 
    - Remove `QRCodeSVG` from `qrcode.react`.
    - Add `useState`, `useRef`, `useCallback` from `react`.
    - Add `AnimatePresence` from `framer-motion`.
    - Add icons from `lucide-react`: `Upload`, `Camera`, `Video`, `CheckCircle2`, `Loader2`, `X`, `ImageIcon`, `Plus`.
    - Import `uploadFile` from `@/lib/supabase`.
    - Import `cn` from `@/lib/utils`.
- **Logic**:
    - Define `UploadState` interface.
    - Add states: `uploads`, `isSuccess`, `isDragging`.
    - Port functions from `Upload.tsx`: `startUploads`, `processFiles`, `handleFileChange`, `handleDragEnter`, `handleDragOver`, `handleDragLeave`, `handleDrop`, `removeUpload`.
- **JSX Changes**:
    - Locate the QR Code Section (`section` with "Share Your View" title).
    - Remove the `QRCodeSVG` and the "Download QR Code" button.
    - If `uploads.length === 0` and not `isSuccess`:
        - Show the "Upload Photos" trigger (styled button/drop zone).
    - If `uploads.length > 0`:
        - Show the upload progress list and "Finish & Share" button.
    - If `isSuccess`:
        - Show a beautiful success message within the card.

### 2. Cleanup `src/pages/Upload.tsx` (Optional but good)
- Since the home page now handles the primary upload, I'll keep this page but it will remain a dedicated upload space for those who navigate there directly.

## 3. Verification
- Verify that clicking "Upload Photos" opens the file dialog.
- Verify that selected files appear in the progress list.
- Verify that files are actually uploaded via `uploadFile` (simulated or real).
- Verify that the QR code is completely gone.
- Verify that mobile responsiveness is maintained.
- Run `validate_build` to ensure no errors.
