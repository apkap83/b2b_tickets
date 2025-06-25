import React, { useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  LinearProgress,
} from '@mui/material';
import {
  IoCloudUploadOutline,
  IoDocumentOutline,
  IoCloseOutline,
} from 'react-icons/io5';
import {
  TicketDetail,
  TicketDetailForTicketCreator,
  WebSocketMessage,
} from '@b2b-tickets/shared-models';
import toast from 'react-hot-toast';
interface FileAttachmentModalProps {
  ticketDetails: TicketDetail[] | TicketDetailForTicketCreator[];
  setShowFileAttachmentDialog: (show: boolean) => void;
}
import { formatFileSize } from '@b2b-tickets/utils';
import { config } from '@b2b-tickets/config';

import { processFileAttachment } from '@b2b-tickets/server-actions';
import { useWebSocketContext } from '@b2b-tickets/contexts';

export const FileAttachmentModal: React.FC<FileAttachmentModalProps> = ({
  ticketDetails,
  setShowFileAttachmentDialog,
}) => {
  const { data: session } = useSession();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const ticketNumber = ticketDetails[0].Ticket;
  const ticketId = ticketDetails[0].ticket_id;

  // Web Socket Connection
  const { emitEvent, latestEventEmitted, resetLatestEventEmitted } =
    useWebSocketContext();

  //@ts-ignore
  const userId = session?.user?.user_id;

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    // Filter files by allowed types and size (e.g., max 10MB)
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/zip',
      'application/x-rar-compressed',
    ];

    const maxSize = config.attachmentsMaxFileSize;

    const validFiles = files.filter((file) => {
      if (!allowedTypes.includes(file.type)) {
        toast.error(`File type not allowed: ${file.name}`);
        return false;
      }
      if (file.size > maxSize) {
        toast.error(
          `File too large: ${file.name} (max ${formatFileSize(
            config.attachmentsMaxFileSize
          )})`
        );
        return false;
      }
      return true;
    });

    setSelectedFiles((prev) => [...prev, ...validFiles]);
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Helper function to convert File to Buffer (Uint8Array)
  const fileToBuffer = async (file: File): Promise<Uint8Array> => {
    const arrayBuffer = await file.arrayBuffer();
    return new Uint8Array(arrayBuffer);
  };

  const uploadSingleFile = async (file: File): Promise<string | null> => {
    try {
      // Create FormData instead of converting to buffer
      const formData = new FormData();
      formData.append('file', file);
      formData.append('ticketId', ticketId);
      formData.append('originalFilename', file.name);

      const uploadResponse = await processFileAttachment(formData);

      if (uploadResponse.error) {
        throw new Error(`Failed to upload ${file.name}`);
      }

      emitEvent(WebSocketMessage.NEW_FILE_ATTACHMENT_FOR_TICKET, {
        ticket_id: ticketId,
      });

      emitEvent(WebSocketMessage.NEW_COMMENT_ADDED, {
        ticket_id: ticketId,
        date: new Date(),
        isTicketCreator: true,
      });

      return uploadResponse.data; // Return the server file path
    } catch (error) {
      console.error(`Error uploading ${file.name}:`, error);
      throw error;
    }
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;
    if (!userId) {
      toast.error('User not authenticated');
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    try {
      const totalFiles = selectedFiles.length;
      let completedFiles = 0;

      for (const file of selectedFiles) {
        try {
          // Step 1: Upload file to storage
          const filePath = await uploadSingleFile(file);
          if (!filePath) {
            throw new Error(`Failed to get file path for ${file.name}`);
          }

          completedFiles++;
          // await new Promise((res) => setTimeout(res, 1000));
          setUploadProgress((completedFiles / totalFiles) * 100);
          await new Promise((res) => setTimeout(res, 1000));
        } catch (fileError) {
          console.error(`Error processing ${file.name}:`, fileError);
          toast.error(`Failed to upload ${file.name}`);
        }
      }

      if (completedFiles > 0) {
        setTimeout(() => {
          toast.success(`Successfully uploaded ${completedFiles} file(s)`);
          setShowFileAttachmentDialog(false);
        }, 1000);
      } else {
        toast.error('No files were uploaded successfully');
      }
    } catch (error) {
      console.error('Upload process error:', error);
      toast.error('Upload process failed');
    } finally {
      // setUploading(false);
      setUploadProgress(100);
    }
  };

  return (
    <Dialog
      open={true}
      onClose={() => setShowFileAttachmentDialog(false)}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">
            Attach Files to Ticket {ticketNumber}
          </Typography>
          <Button
            onClick={() => setShowFileAttachmentDialog(false)}
            sx={{ minWidth: 'auto', p: 1 }}
          >
            <IoCloseOutline size={24} />
          </Button>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ mb: 3 }}>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            style={{ display: 'none' }}
            onChange={handleFileSelect}
            accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif,.zip,.rar"
          />

          <Button
            variant="outlined"
            onClick={() => fileInputRef.current?.click()}
            sx={{
              width: '100%',
              height: '100px',
              border: '2px dashed #ccc',
              '&:hover': {
                border: '2px dashed #474cae',
              },
            }}
            disabled={uploading}
          >
            <Box display="flex" flexDirection="column" alignItems="center">
              <IoCloudUploadOutline size={32} />
              <Typography variant="body2" sx={{ mt: 1 }}>
                Click to select files or drag and drop
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Max {formatFileSize(config.attachmentsMaxFileSize)} per file.
                Supported: PDF, DOC, DOCX, TXT, JPG, PNG, GIF, ZIP, RAR
              </Typography>
            </Box>
          </Button>
        </Box>

        {selectedFiles.length > 0 && (
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 2 }}>
              Selected Files ({selectedFiles.length})
            </Typography>
            {selectedFiles.map((file, index) => (
              <Box
                key={index}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  p: 2,
                  mb: 1,
                  border: '1px solid #e0e0e0',
                  borderRadius: 1,
                  backgroundColor: '#f9f9f9',
                }}
              >
                <Box display="flex" alignItems="center">
                  <IoDocumentOutline size={20} />
                  <Box sx={{ ml: 2 }}>
                    <Typography variant="body2">{file.name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formatFileSize(file.size)}
                    </Typography>
                  </Box>
                </Box>
                <Button
                  size="small"
                  onClick={() => handleRemoveFile(index)}
                  disabled={uploading}
                >
                  Remove
                </Button>
              </Box>
            ))}
          </Box>
        )}

        {uploading && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" sx={{ mb: 1 }}>
              Uploading files... {Math.round(uploadProgress)}%
            </Typography>
            <LinearProgress
              variant="determinate"
              value={uploadProgress}
              sx={{
                '& > .MuiLinearProgress-bar': {
                  backgroundColor: '#585ed6',
                },
              }}
            />
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button
          onClick={() => setShowFileAttachmentDialog(false)}
          disabled={uploading}
        >
          Cancel
        </Button>
        <Button
          onClick={handleUpload}
          variant="contained"
          disabled={selectedFiles.length === 0 || uploading}
          sx={{
            backgroundColor: '#474cae',
            '&:hover': {
              backgroundColor: '#585ed6',
            },
          }}
        >
          {uploading
            ? 'Uploading...'
            : `Upload ${selectedFiles.length} file(s)`}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
