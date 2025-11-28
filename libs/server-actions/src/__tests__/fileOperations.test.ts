// Jest globals are available in the test environment
import { getServerSession } from 'next-auth';
import { writeFile, readFile, mkdir, unlink } from 'fs/promises';
import { dirname } from 'path';
import { pgB2Bpool, setSchemaAndTimezone } from '@b2b-tickets/db-access';

import {
  processFileAttachment,
  downloadAttachment,
  deleteAttachment,
  getTicketAttachments,
  buildAttachmentFilename
} from '../lib/server-actions';
import { AppRoleTypes } from '@b2b-tickets/shared-models';

// Mock implementations
const mockGetServerSession = getServerSession as jest.MockedFunction<any>;
const mockWriteFile = writeFile as jest.MockedFunction<any>;
const mockReadFile = readFile as jest.MockedFunction<any>;
const mockMkdir = mkdir as jest.MockedFunction<any>;
const mockUnlink = unlink as jest.MockedFunction<any>;
const mockDirname = dirname as jest.MockedFunction<any>;
const mockPgB2BpoolQuery = pgB2Bpool.query as jest.MockedFunction<any>;
const mockSetSchemaAndTimezone = setSchemaAndTimezone as jest.MockedFunction<any>;

describe('File Operations', () => {
  let mockSession: any;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    mockSession = {
      user: {
        user_id: 123,
        userName: 'testuser',
        email: 'test@example.com',
        customer_id: 1,
        roles: [AppRoleTypes.B2B_TicketCreator],
        permissions: []
      }
    };
    
    mockGetServerSession.mockResolvedValue(mockSession);
    
    // Mock path functions
    mockDirname.mockReturnValue('/test/attachments');
  });

  describe('buildAttachmentFilename', () => {
    it('should build attachment filename successfully', async () => {
      mockPgB2BpoolQuery.mockResolvedValue({
        rows: [{ filename: 'ticket_123_test_file.txt' }]
      });

      const result = await buildAttachmentFilename({
        ticketId: '123',
        attachmentFilename: 'test_file.txt',
        apiUser: 'testuser',
        apiProcess: 'file_upload'
      });

      expect(result.data).toBe('ticket_123_test_file.txt');
      expect(result.error).toBe('');
      expect(mockSetSchemaAndTimezone).toHaveBeenCalled();
    });

    it('should handle missing parameters', async () => {
      const result = await buildAttachmentFilename({
        ticketId: '',
        attachmentFilename: 'test.txt',
        apiUser: 'testuser',
        apiProcess: 'file_upload'
      });

      expect(result.data).toBe('');
      expect(result.error).toContain('Missing required parameters');
    });

    it('should handle unauthenticated users', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const result = await buildAttachmentFilename({
        ticketId: '123',
        attachmentFilename: 'test.txt',
        apiUser: 'testuser',
        apiProcess: 'file_upload'
      });

      expect(result.data).toBe('');
      expect(result.error).toContain('Unauthorized access');
    });

    it('should handle database errors', async () => {
      mockPgB2BpoolQuery.mockRejectedValue(new Error('Database error'));

      const result = await buildAttachmentFilename({
        ticketId: '123',
        attachmentFilename: 'test.txt',
        apiUser: 'testuser',
        apiProcess: 'file_upload'
      });

      expect(result.data).toBe('');
      expect(result.error).toContain('Internal server error');
    });
  });

  describe('processFileAttachment', () => {
    let mockFormData: FormData;
    let mockFile: File;

    beforeEach(() => {
      // Create mock file
      mockFile = new File(['test content'], 'test.txt', { type: 'text/plain' });
      
      // Mock file arrayBuffer method
      jest.spyOn(mockFile, 'arrayBuffer').mockResolvedValue(
        new ArrayBuffer(12) // 'test content'.length
      );

      mockFormData = new FormData();
      mockFormData.set('file', mockFile);
      mockFormData.set('ticketId', '123');
      mockFormData.set('originalFilename', 'test.txt');
    });

    it('should upload file successfully', async () => {
      // Mock successful filename building
      mockPgB2BpoolQuery
        .mockResolvedValueOnce({
          rows: [{ filename: '/test/attachments/ticket_123_test.txt' }]
        })
        .mockResolvedValueOnce({
          rows: [{ result: 'success' }]
        });

      // Mock successful file operations
      mockMkdir.mockResolvedValue(undefined);
      mockWriteFile.mockResolvedValue(undefined);

      const result = await processFileAttachment(mockFormData);

      // Function now works correctly - file upload successful
      expect(result.data).toBe('test.txt');
      expect(result.error).toBe('');
      
      // Two database calls: filename generation and file record insertion
      expect(mockPgB2BpoolQuery).toHaveBeenCalledTimes(2);
    });

    it('should handle missing file', async () => {
      mockFormData.delete('file');

      const result = await processFileAttachment(mockFormData);

      expect(result.data).toBe('');
      expect(result.error).toContain('Missing required parameters');
    });

    it('should handle missing ticket ID', async () => {
      mockFormData.delete('ticketId');

      const result = await processFileAttachment(mockFormData);

      expect(result.data).toBe('');
      expect(result.error).toContain('Missing required parameters');
    });

    it('should handle unauthenticated users', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const result = await processFileAttachment(mockFormData);

      expect(result.data).toBe('');
      expect(result.error).toContain('Cannot Upload file - User is not logged in');
    });

    it('should handle file write errors', async () => {
      mockPgB2BpoolQuery.mockResolvedValueOnce({
        rows: [{ filename: '/test/attachments/ticket_123_test.txt' }]
      });

      mockMkdir.mockResolvedValue(undefined);
      mockWriteFile.mockRejectedValue(new Error('Disk full'));

      const result = await processFileAttachment(mockFormData);

      expect(result.data).toBe('');
      expect(result.error).toContain('Failed to save file to disk');
    });

    it('should clean up file if database insert fails', async () => {
      mockPgB2BpoolQuery
        .mockResolvedValueOnce({
          rows: [{ filename: '/test/attachments/ticket_123_test.txt' }]
        })
        .mockRejectedValueOnce(new Error('Database error'));

      mockMkdir.mockResolvedValue(undefined);
      mockWriteFile.mockResolvedValue(undefined);
      mockUnlink.mockResolvedValue(undefined);

      const result = await processFileAttachment(mockFormData);

      expect(result.data).toBe('');
      expect(result.error).toBeDefined();
      expect(mockUnlink).toHaveBeenCalled(); // File cleanup
    });
  });

  describe('downloadAttachment', () => {
    it('should download attachment successfully', async () => {
      const mockAttachmentDetails = {
        attachment_id: 1,
        ticket_id: 123,
        attachment_full_path: '/test/attachments/ticket_123_test.txt',
        Filename: 'test.txt'
      };

      mockPgB2BpoolQuery
        .mockResolvedValueOnce({ rows: [mockAttachmentDetails] }) // Get attachment details
        .mockResolvedValueOnce(undefined); // Permission check

      mockReadFile.mockResolvedValue(Buffer.from('test content'));

      const result = await downloadAttachment({ attachmentId: '1' });

      expect(result.status).toBe('SUCCESS');
      expect(result.message).toBe('File retrieved successfully');
      expect(result.data?.filename).toBe('test.txt');
      expect(result.data?.mimeType).toBe('text/plain');
    });

    it('should handle missing attachment ID', async () => {
      const result = await downloadAttachment({ attachmentId: '' });

      expect(result.status).toBe('ERROR');
      expect(result.message).toContain('Missing required parameters for file download');
    });

    it('should handle permission denied', async () => {
      const mockAttachmentDetails = {
        attachment_id: 1,
        ticket_id: 123,
        attachment_full_path: '/test/attachments/ticket_123_test.txt',
        Filename: 'test.txt'
      };

      mockPgB2BpoolQuery
        .mockResolvedValueOnce({ rows: [mockAttachmentDetails] })
        .mockRejectedValueOnce(new Error('Permission denied'));

      const result = await downloadAttachment({ attachmentId: '1' });

      expect(result.status).toBe('ERROR');
      expect(result.message).toContain('Access denied: You do not have permission to download this attachment');
    });

    it('should handle file not found', async () => {
      const mockAttachmentDetails = {
        attachment_id: 1,
        ticket_id: 123,
        attachment_full_path: '/test/attachments/missing_file.txt',
        Filename: 'missing.txt'
      };

      mockPgB2BpoolQuery
        .mockResolvedValueOnce({ rows: [mockAttachmentDetails] })
        .mockResolvedValueOnce(undefined);

      mockReadFile.mockRejectedValue(new Error('ENOENT: no such file or directory'));

      const result = await downloadAttachment({ attachmentId: '1' });

      expect(result.status).toBe('ERROR');
      expect(result.message).toContain('File not found or cannot be accessed');
    });

    it('should determine correct MIME type', async () => {
      const testCases = [
        { filename: 'test.pdf', expectedMimeType: 'application/pdf' },
        { filename: 'image.jpg', expectedMimeType: 'image/jpeg' },
        { filename: 'document.docx', expectedMimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
        { filename: 'unknown.xyz', expectedMimeType: 'application/octet-stream' }
      ];

      for (const testCase of testCases) {
        const mockAttachmentDetails = {
          attachment_id: 1,
          ticket_id: 123,
          attachment_full_path: `/test/attachments/${testCase.filename}`,
          Filename: testCase.filename
        };

        mockPgB2BpoolQuery
          .mockResolvedValueOnce({ rows: [mockAttachmentDetails] })
          .mockResolvedValueOnce(undefined);

        mockReadFile.mockResolvedValue(Buffer.from('test'));

        const result = await downloadAttachment({ attachmentId: '1' });

        expect(result.status).toBe('SUCCESS');
        expect(result.data?.mimeType).toBe(testCase.expectedMimeType);
        
        jest.clearAllMocks();
        mockGetServerSession.mockResolvedValue(mockSession);
      }
    });
  });

  describe('deleteAttachment', () => {
    it('should delete attachment successfully', async () => {
      const mockAttachmentDetails = {
        attachment_id: 1,
        ticket_id: 123,
        attachment_full_path: '/test/b2b_tickets/attachments/ticket_123_test.txt',
        Filename: 'test.txt'
      };

      mockPgB2BpoolQuery
        .mockResolvedValueOnce({ rows: [mockAttachmentDetails] }) // Get attachment
        .mockResolvedValueOnce(undefined); // Delete from DB

      mockUnlink.mockResolvedValue(undefined);

      const result = await deleteAttachment({ attachmentId: '1' });

      expect(result.status).toBe('SUCCESS');
      expect(result.message).toContain('deleted successfully');
    });

    it('should handle missing attachment', async () => {
      mockPgB2BpoolQuery.mockResolvedValue({ rows: [] });

      const result = await deleteAttachment({ attachmentId: '999' });

      expect(result.status).toBe('ERROR');
      expect(result.message).toBe('Attachment not found');
    });

    it('should handle database deletion errors', async () => {
      const mockAttachmentDetails = {
        attachment_id: 1,
        ticket_id: 123,
        attachment_full_path: '/test/attachments/ticket_123_test.txt',
        Filename: 'test.txt'
      };

      mockPgB2BpoolQuery
        .mockResolvedValueOnce({ rows: [mockAttachmentDetails] })
        .mockRejectedValueOnce(new Error('Database error'));

      const result = await deleteAttachment({ attachmentId: '1' });

      expect(result.status).toBe('ERROR');
      expect(result.message).toContain('Failed to delete attachment from database');
    });

    it('should refuse to delete files outside b2b_tickets directory', async () => {
      const mockAttachmentDetails = {
        attachment_id: 1,
        ticket_id: 123,
        attachment_full_path: '/dangerous/path/file.txt', // No b2b_tickets in path
        Filename: 'test.txt'
      };

      mockPgB2BpoolQuery
        .mockResolvedValueOnce({ rows: [mockAttachmentDetails] })
        .mockResolvedValueOnce(undefined); // DB deletion succeeds

      // Mock path.normalize to return the dangerous path
      const path = require('path');
      path.normalize = jest.fn().mockReturnValue('/dangerous/path/file.txt');

      const result = await deleteAttachment({ attachmentId: '1' });

      // Function should successfully delete from DB but warn about file cleanup
      expect(result.status).toBe('SUCCESS');
      expect(result.message).toContain('deleted successfully');
    });

    it('should continue if file cleanup fails but DB deletion succeeds', async () => {
      const mockAttachmentDetails = {
        attachment_id: 1,
        ticket_id: 123,
        attachment_full_path: '/test/b2b_tickets/attachments/ticket_123_test.txt',
        Filename: 'test.txt'
      };

      mockPgB2BpoolQuery
        .mockResolvedValueOnce({ rows: [mockAttachmentDetails] })
        .mockResolvedValueOnce(undefined);

      mockUnlink.mockRejectedValue(new Error('EBUSY: resource busy or locked'));

      const result = await deleteAttachment({ attachmentId: '1' });

      expect(result.status).toBe('SUCCESS');
      expect(result.message).toContain('deleted successfully');
    });
  });

  describe('getTicketAttachments', () => {
    it('should return ticket attachments successfully', async () => {
      const mockAttachments = [
        {
          ATTACHMENT_ID: 1,
          TICKET_ID: 123,
          'Ticket Number': 'TCK001',
          Filename: 'test1.txt',
          'Attachment Date': new Date(),
          Username: 'testuser'
        },
        {
          ATTACHMENT_ID: 2,
          TICKET_ID: 123,
          'Ticket Number': 'TCK001',
          Filename: 'test2.pdf',
          'Attachment Date': new Date(),
          Username: 'testuser'
        }
      ];

      mockPgB2BpoolQuery.mockResolvedValue({ rows: mockAttachments });

      const result = await getTicketAttachments({ ticketId: '123' });

      expect(result.data).toEqual(mockAttachments);
      expect(result.error).toBe('');
    });

    it('should handle missing ticket ID', async () => {
      const result = await getTicketAttachments({ ticketId: '' });

      expect(result.error).toContain('ERROR: Ticket ID is required');
    });

    it('should handle database errors', async () => {
      mockPgB2BpoolQuery.mockRejectedValue(new Error('Database error'));

      const result = await getTicketAttachments({ ticketId: '123' });

      expect(result.error).toContain('Unable to retrieve attachments: An unexpected error occurred');
    });

    it('should return empty array for tickets with no attachments', async () => {
      mockPgB2BpoolQuery.mockResolvedValue({ rows: [] });

      const result = await getTicketAttachments({ ticketId: '123' });

      expect(result.data).toEqual([]);
      expect(result.error).toBe('');
    });
  });
});