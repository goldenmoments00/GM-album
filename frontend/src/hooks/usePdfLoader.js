import { useState, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { createBlankPage, sliceSpread } from '../utils/pdfParser';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export function usePdfLoader(session, fileId) {
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [visualProgress, setVisualProgress] = useState(0);
  const [dimensions, setDimensions] = useState({ width: 500, height: 700 });

  useEffect(() => {
    let interval;
    if (loading) {
      interval = setInterval(() => {
        setVisualProgress(prev => {
          const remaining = 99 - prev;
          const increment = Math.max(0.5, Math.random() * (remaining / 8));
          return Math.min(99, prev + increment);
        });
      }, 200);
    }
    return () => clearInterval(interval);
  }, [loading]);

  useEffect(() => {
    if (!session || !fileId) return;
    
    let isMounted = true;
    
    const loadPDF = async () => {
      try {
        setLoading(true);
        let pdfUrl = `/api/pdf/${session.folderId}/${fileId}`;
        if (session.isR2 && session.albums) {
          const matchedAlbum = session.albums.find(a => a.file === fileId);
          if (matchedAlbum && matchedAlbum.url) {
            pdfUrl = matchedAlbum.url;
          }
        }
        
        const loadingTask = pdfjsLib.getDocument({ url: pdfUrl });

        loadingTask.onProgress = (p) => {
          if (p.total > 0 && isMounted) setProgress(Math.round((p.loaded / p.total) * 20));
        };

        const pdf = await loadingTask.promise;
        const numPages = pdf.numPages;
        const structure = [];
        const page1 = await pdf.getPage(1);
        const viewport1 = page1.getViewport({ scale: 1.5 });
        const singlePageWidth = viewport1.width;
        const singlePageHeight = viewport1.height;

        if (isMounted) {
          setDimensions({
            width: 500,
            height: 500 * (singlePageHeight / singlePageWidth)
          });
        }

        for (let i = 1; i <= numPages; i++) {
          if (i === 1) {
            structure.push({ pdfPage: 1, type: 'single', imgSrc: null, isCover: true });
            structure.push({ pdfPage: 1, type: 'blank', imgSrc: createBlankPage(singlePageWidth, singlePageHeight) });
          } else if (i === numPages) {
            if (structure.length % 2 === 0) {
              structure.push({ pdfPage: numPages, type: 'blank', imgSrc: createBlankPage(singlePageWidth, singlePageHeight), isLastBlank: true });
            }
            structure.push({ pdfPage: numPages, type: 'single', imgSrc: null, isCover: true });
          } else if (i === 2 || i === numPages - 1) {
            structure.push({ pdfPage: i, type: 'single', imgSrc: null });
          } else {
            structure.push({ pdfPage: i, type: 'spread-left', imgSrc: null });
            structure.push({ pdfPage: i, type: 'spread-right', imgSrc: null });
          }
        }

        if (isMounted) setPages([...structure]);

        const renderPageToImage = async (pdfPageNum, type, customScale = 1.5) => {
          const page = await pdf.getPage(pdfPageNum);
          const viewport = page.getViewport({ scale: customScale });
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          await page.render({ canvasContext: context, viewport: viewport }).promise;

          if (type === 'spread-left' || type === 'spread-right') {
            const [left, right] = sliceSpread(canvas);
            return type === 'spread-left' ? left : right;
          }
          return canvas.toDataURL('image/jpeg', 0.8);
        };

        const initialLoadCount = Math.min(2, structure.length);
        for (let i = 0; i < initialLoadCount; i++) {
          if (!structure[i].imgSrc && structure[i].type !== 'blank') {
            structure[i].imgSrc = await renderPageToImage(structure[i].pdfPage, structure[i].type, 0.5);
            structure[i].isLowRes = true;
          }
        }

        if (isMounted) {
          setPages([...structure]);
          setLoading(false);
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Load the rest of the pages in high resolution
        for (let i = initialLoadCount; i < structure.length; i++) {
          if (!isMounted) break;
          if (!structure[i].imgSrc && structure[i].type !== 'blank') {
            structure[i].imgSrc = await renderPageToImage(structure[i].pdfPage, structure[i].type, 1.5);
            setPages([...structure]); 
            await new Promise(resolve => setTimeout(resolve, 200));
          }
        }

        // Upgrade the initial low resolution pages to high resolution
        for (let i = 0; i < initialLoadCount; i++) {
          if (!isMounted) break;
          if (structure[i].isLowRes) {
            structure[i].imgSrc = await renderPageToImage(structure[i].pdfPage, structure[i].type, 1.5);
            structure[i].isLowRes = false;
            setPages([...structure]); 
            await new Promise(resolve => setTimeout(resolve, 200));
          }
        }
      } catch (error) {
        console.error('Error loading PDF:', error);
        alert('Failed to load PDF. Please try again.');
        if (isMounted) setLoading(false);
      }
    };

    loadPDF();

    return () => {
      isMounted = false;
    };
  }, [fileId, session]);

  return { pages, loading, visualProgress, dimensions };
}
