import React, { useState, useEffect } from 'react';
import { TicketAttachmentDetails } from '@b2b-tickets/shared-models';
import {
  Dialog,
  DialogContent,
  DialogActions,
  DialogTitle,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tabs,
  Tab,
  Box,
} from '@mui/material';
import Button from '@mui/material/Button';
import { IoClose, IoDownloadOutline, IoEyeOutline } from 'react-icons/io5';
import toast from 'react-hot-toast';
// You'll need to install these packages:
// npm install mammoth xlsx
import * as mammoth from 'mammoth';
import * as XLSX from 'xlsx';

interface FilePreviewModalProps {
  attachment: TicketAttachmentDetails;
  onClose: () => void;
  onDownload: () => void;
}

interface ExcelSheet {
  name: string;
  data: any[][];
}

export function FilePreviewModal({
  attachment,
  onClose,
  onDownload,
}: FilePreviewModalProps) {
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [excelSheets, setExcelSheets] = useState<ExcelSheet[]>([]);
  const [activeSheetIndex, setActiveSheetIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Image zoom and pan state
  const [imageScale, setImageScale] = useState(1);
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const getFileExtension = (filename: string): string => {
    return filename.toLowerCase().split('.').pop() || '';
  };

  const getFileType = (filename: string): string => {
    const ext = getFileExtension(filename);

    if (
      ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'jfif'].includes(ext)
    ) {
      return 'image';
    }
    if (ext === 'pdf') {
      return 'pdf';
    }
    if (
      [
        'txt',
        'log',
        'csv',
        'json',
        'xml',
        'html',
        'htm',
        'css',
        'js',
        'ts',
        'jsx',
        'tsx',
        'md',
        'markdown',
      ].includes(ext)
    ) {
      return 'text';
    }
    if (['doc', 'docx'].includes(ext)) {
      return 'document';
    }
    if (['xls', 'xlsx', 'csv'].includes(ext)) {
      return 'spreadsheet';
    }
    return 'unsupported';
  };

  const parseDocxFile = async (arrayBuffer: ArrayBuffer): Promise<string> => {
    try {
      const result = await mammoth.convertToHtml({ arrayBuffer });
      if (result.messages.length > 0) {
        console.warn('DOCX parsing warnings:', result.messages);
      }
      return result.value;
    } catch (error) {
      throw new Error('Failed to parse DOCX file');
    }
  };

  const parseExcelFile = async (
    arrayBuffer: ArrayBuffer
  ): Promise<ExcelSheet[]> => {
    try {
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const sheets: ExcelSheet[] = [];

      workbook.SheetNames.forEach((sheetName) => {
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
          defval: '',
          raw: false,
        });

        sheets.push({
          name: sheetName,
          data: jsonData as any[][],
        });
      });

      return sheets;
    } catch (error) {
      throw new Error('Failed to parse Excel file');
    }
  };

  const fetchFileContent = async () => {
    try {
      setLoading(true);
      setError(null);

      // Create preview URL with parameters
      const previewUrl = new URL(
        '/api/download-attachment',
        window.location.origin
      );
      previewUrl.searchParams.set('attachmentId', attachment.attachment_id);
      previewUrl.searchParams.set('mode', 'preview');

      const response = await fetch(previewUrl.toString(), {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.status}`);
      }

      const fileType = getFileType(attachment.Filename);

      if (fileType === 'image' || fileType === 'pdf') {
        // For images and PDFs, create a blob URL
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        setFileContent(url);
      } else if (fileType === 'text') {
        // For text files, get the text content
        const text = await response.text();
        setFileContent(text);
      } else if (fileType === 'document') {
        // For DOCX files
        const arrayBuffer = await response.arrayBuffer();
        const htmlContent = await parseDocxFile(arrayBuffer);
        setFileContent(htmlContent);
      } else if (fileType === 'spreadsheet') {
        // For Excel files
        const arrayBuffer = await response.arrayBuffer();
        const sheets = await parseExcelFile(arrayBuffer);
        setExcelSheets(sheets);
        setActiveSheetIndex(0);
      } else {
        throw new Error('Unsupported file type for preview');
      }
    } catch (err) {
      console.error('Preview error:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to load file preview'
      );
    } finally {
      setLoading(false);
    }
  };

  // Reset zoom when new file is loaded
  useEffect(() => {
    setImageScale(1);
    setImagePosition({ x: 0, y: 0 });
    setIsDragging(false);
    setExcelSheets([]);
    setActiveSheetIndex(0);

    fetchFileContent();

    // Cleanup blob URL when component unmounts
    return () => {
      if (
        fileContent &&
        (getFileType(attachment.Filename) === 'image' ||
          getFileType(attachment.Filename) === 'pdf')
      ) {
        URL.revokeObjectURL(fileContent);
      }
    };
  }, [attachment.attachment_id]);

  // Image zoom and pan handlers
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.min(Math.max(imageScale * delta, 0.5), 3);
    setImageScale(newScale);

    // Reset position if zooming out to original size or below
    if (newScale <= 1) {
      setImagePosition({ x: 0, y: 0 });
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (imageScale > 1) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - imagePosition.x,
        y: e.clientY - imagePosition.y,
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && imageScale > 1) {
      setImagePosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const resetZoom = () => {
    setImageScale(1);
    setImagePosition({ x: 0, y: 0 });
  };

  const renderExcelSheet = (sheet: ExcelSheet) => {
    if (!sheet.data || sheet.data.length === 0) {
      return (
        <div className="flex items-center justify-center h-32 text-gray-500">
          <p>No data in this sheet</p>
        </div>
      );
    }

    // Limit the number of rows and columns for performance
    const maxRows = 1000;
    const maxCols = 50;
    const displayData = sheet.data
      .slice(0, maxRows)
      .map((row) => (Array.isArray(row) ? row.slice(0, maxCols) : []));

    const maxColumns = Math.max(...displayData.map((row) => row.length));

    return (
      <div className="h-[60vh] overflow-auto">
        <TableContainer component={Paper} className="shadow-none">
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                {Array.from({ length: maxColumns }, (_, index) => (
                  <TableCell
                    key={index}
                    className="bg-gray-50 font-semibold border-r"
                    style={{ minWidth: '120px' }}
                  >
                    {String.fromCharCode(65 + (index % 26))}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {displayData.map((row, rowIndex) => (
                <TableRow key={rowIndex} hover>
                  {Array.from({ length: maxColumns }, (_, colIndex) => (
                    <TableCell
                      key={colIndex}
                      className="border-r text-sm"
                      style={{
                        maxWidth: '200px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      title={String(row[colIndex] || '')}
                    >
                      {row[colIndex] || ''}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {sheet.data.length > maxRows && (
          <div className="p-2 text-center text-sm text-gray-500 bg-yellow-50">
            Showing first {maxRows} rows of {sheet.data.length} total rows.
            Download the file to view all data.
          </div>
        )}
      </div>
    );
  };

  const renderPreview = () => {
    const fileType = getFileType(attachment.Filename);

    if (loading) {
      return (
        <div className="flex items-center justify-center h-full inset-0 absolute">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <span className="ml-3 text-gray-600">Loading preview...</span>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center h-96 text-red-500">
          <IoEyeOutline size={48} className="mb-4 opacity-50" />
          <p className="text-lg font-medium">Preview not available</p>
          <p className="text-sm text-gray-500 mt-2">{error}</p>
          <Button
            onClick={onDownload}
            variant="outlined"
            className="mt-4"
            startIcon={<IoDownloadOutline />}
          >
            Download to view
          </Button>
        </div>
      );
    }

    switch (fileType) {
      case 'image':
        return (
          <div className="relative w-full h-[70vh] bg-gray-50 overflow-hidden">
            {/* Reset Button - only show when zoomed */}
            {imageScale !== 1 && (
              <div className="absolute top-4 right-4 z-10">
                <Button
                  variant="outlined"
                  size="small"
                  onClick={resetZoom}
                  className="bg-white shadow-lg"
                  title="Reset Zoom (1:1)"
                >
                  Reset
                </Button>
              </div>
            )}

            {/* Zoom Level Indicator */}
            {imageScale !== 1 && (
              <div className="absolute top-4 left-4 z-10 bg-black bg-opacity-75 text-white px-2 py-1 rounded text-sm">
                {Math.round(imageScale * 100)}%
              </div>
            )}

            {/* Image Container */}
            <div
              className="flex justify-center items-center w-full h-full"
              onWheel={handleWheel}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              style={{
                cursor:
                  imageScale > 1
                    ? isDragging
                      ? 'grabbing'
                      : 'grab'
                    : 'default',
              }}
            >
              <img
                src={fileContent || ''}
                alt={attachment.Filename}
                className="max-w-full max-h-full object-contain select-none"
                style={{
                  transform: `scale(${imageScale}) translate(${
                    imagePosition.x / imageScale
                  }px, ${imagePosition.y / imageScale}px)`,
                  transformOrigin: 'center center',
                  transition: isDragging ? 'none' : 'transform 0.1s ease-out',
                  maxWidth: '100%',
                  maxHeight: '100%',
                  width: 'auto',
                  height: 'auto',
                }}
                onError={() => setError('Failed to load image')}
                onDragStart={(e) => e.preventDefault()}
              />
            </div>

            {/* Instructions */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-75 text-white px-3 py-1 rounded text-sm">
              {imageScale > 1
                ? 'Mouse wheel to zoom • Click and drag to pan • Reset button to return to original size'
                : 'Mouse wheel to zoom in and out'}
            </div>
          </div>
        );

      case 'pdf':
        return (
          <div className="h-[70vh] w-full">
            <iframe
              src={fileContent || ''}
              className="w-full h-full border-0"
              title={attachment.Filename}
              onError={() => setError('Failed to load PDF')}
            />
          </div>
        );

      case 'text':
        const ext = getFileExtension(attachment.Filename);
        const language = ['js', 'jsx', 'ts', 'tsx'].includes(ext)
          ? 'javascript'
          : ['html', 'htm'].includes(ext)
          ? 'html'
          : ext === 'css'
          ? 'css'
          : ext === 'json'
          ? 'json'
          : ext === 'xml'
          ? 'xml'
          : 'text';

        return (
          <div className="h-[70vh] overflow-auto">
            <pre className="bg-gray-50 p-4 rounded text-sm font-mono whitespace-pre-wrap break-words">
              <code className={`language-${language}`}>{fileContent}</code>
            </pre>
          </div>
        );

      case 'document':
        return (
          <div className="h-[70vh] overflow-auto">
            <div className="max-w-4xl mx-auto bg-white p-8 shadow-sm">
              <div
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: fileContent || '' }}
                style={{
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  lineHeight: '1.6',
                  color: '#333',
                }}
              />
            </div>
            <div className="p-2 text-center text-sm text-gray-500 bg-blue-50">
              DOCX preview may not show all formatting. Download for full
              fidelity.
            </div>
          </div>
        );

      case 'spreadsheet':
        if (excelSheets.length === 0) {
          return (
            <div className="flex flex-col items-center justify-center h-96 text-gray-500">
              <IoEyeOutline size={48} className="mb-4 opacity-50" />
              <p className="text-lg font-medium">No sheets found</p>
            </div>
          );
        }

        return (
          <div className="h-[70vh]">
            {excelSheets.length > 1 && (
              <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs
                  value={activeSheetIndex}
                  onChange={(_, newValue) => setActiveSheetIndex(newValue)}
                  variant="scrollable"
                  scrollButtons="auto"
                >
                  {excelSheets.map((sheet, index) => (
                    <Tab
                      key={index}
                      label={sheet.name || `Sheet ${index + 1}`}
                      className="min-w-0"
                    />
                  ))}
                </Tabs>
              </Box>
            )}

            {excelSheets[activeSheetIndex] &&
              renderExcelSheet(excelSheets[activeSheetIndex])}

            <div className="p-2 text-center text-sm text-gray-500 bg-green-50">
              Excel preview may not show all formatting and formulas. Download
              for full functionality.
            </div>
          </div>
        );

      default:
        return (
          <div className="flex flex-col items-center justify-center h-96 text-gray-500">
            <IoEyeOutline size={48} className="mb-4 opacity-50" />
            <p className="text-lg font-medium">Preview not supported</p>
            <p className="text-sm text-gray-500 mt-2">
              This file type cannot be previewed in the browser.
            </p>
            <Button
              onClick={onDownload}
              variant="outlined"
              className="mt-4"
              startIcon={<IoDownloadOutline />}
            >
              Download File
            </Button>
          </div>
        );
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Dialog
      open={true}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        style: {
          minHeight: '80vh',
          maxHeight: '90vh',
        },
      }}
    >
      <DialogTitle className="flex items-center justify-between border-b">
        <div className="flex flex-col">
          <span
            className="text-lg font-semibold truncate max-w-md"
            title={attachment.Filename}
          >
            {attachment.Filename}
          </span>
        </div>
        <Button
          onClick={onClose}
          variant="text"
          size="small"
          className="min-w-0 p-2"
        >
          <IoClose size={20} />
        </Button>
      </DialogTitle>

      <DialogContent className="p-4 relative">{renderPreview()}</DialogContent>

      <DialogActions className="border-t px-6 py-4">
        <Button
          onClick={onDownload}
          variant="outlined"
          startIcon={<IoDownloadOutline />}
        >
          Download
        </Button>
        <Button
          onClick={onClose}
          variant="contained"
          sx={{
            backgroundColor: '#474cae',
            '&:hover': {
              backgroundColor: '#585ed6',
            },
          }}
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
