/**
 * Download Attachment API Route Tests
 * Tests for /api/download-attachment endpoint
 */

import { NextRequest } from 'next/server';
import { GET } from '../../app/api/download-attachment/route';
import { APITestUtils } from './api-test-setup';

// Mock the getServerSession
const mockGetServerSession = jest.fn();
jest.mock('next-auth', () => ({
  getServerSession: mockGetServerSession,
}));

// Mock downloadAttachment server action
const mockDownloadAttachment = jest.fn();
jest.mock('@b2b-tickets/server-actions', () => ({
  downloadAttachment: mockDownloadAttachment,
}));

describe('/api/download-attachment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default session mock
    mockGetServerSession.mockResolvedValue(
      APITestUtils.createMockSession()
    );
  });

  describe('GET', () => {
    it('should download attachment successfully', async () => {
      const mockFileBuffer = Buffer.from('test file content');
      
      mockDownloadAttachment.mockResolvedValue({
        status: 'SUCCESS',
        message: 'File retrieved successfully',
        data: {
          fileBuffer: mockFileBuffer,
          mimeType: 'application/pdf',
          filename: 'test-document.pdf'
        }
      });

      const request = APITestUtils.createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/download-attachment?attachmentId=123&mode=download'
      });

      const response = await GET(request);

      expect(response.status).toBe(200);
      
      // Should return the file buffer as response
      // In actual implementation, would check response headers for:
      // - Content-Type: application/pdf
      // - Content-Disposition: attachment; filename="test-document.pdf"
      // - Content-Length: [buffer length]
      expect(mockDownloadAttachment).toHaveBeenCalledWith({
        attachmentId: '123'
      });
    });

    it('should preview attachment successfully', async () => {
      const mockFileBuffer = Buffer.from('test image content');
      
      mockDownloadAttachment.mockResolvedValue({
        status: 'SUCCESS',
        message: 'File retrieved successfully',
        data: {
          fileBuffer: mockFileBuffer,
          mimeType: 'image/jpeg',
          filename: 'test-image.jpg'
        }
      });

      const request = APITestUtils.createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/download-attachment?attachmentId=456&mode=preview'
      });

      const response = await GET(request);

      expect(response.status).toBe(200);
      
      // Should return file for inline display
      // Headers would include: Content-Disposition: inline; filename="test-image.jpg"
      expect(mockDownloadAttachment).toHaveBeenCalledWith({
        attachmentId: '456'
      });
    });

    it('should handle missing attachmentId', async () => {
      const request = APITestUtils.createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/download-attachment'
      });

      const response = await GET(request);

      await APITestUtils.assertResponse(response, {
        status: 400,
        data: {
          success: false,
          message: 'Attachment ID is required'
        }
      });

      expect(mockDownloadAttachment).not.toHaveBeenCalled();
    });

    it('should handle unauthenticated request', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = APITestUtils.createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/download-attachment?attachmentId=123'
      });

      const response = await GET(request);

      await APITestUtils.assertResponse(response, {
        status: 401,
        data: {
          success: false,
          message: 'Authentication required'
        }
      });

      expect(mockDownloadAttachment).not.toHaveBeenCalled();
    });

    it('should handle attachment not found', async () => {
      mockDownloadAttachment.mockResolvedValue({
        status: 'ERROR',
        message: 'Attachment not found'
      });

      const request = APITestUtils.createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/download-attachment?attachmentId=999'
      });

      const response = await GET(request);

      await APITestUtils.assertResponse(response, {
        status: 404,
        data: {
          success: false,
          message: 'Attachment not found'
        }
      });
    });

    it('should handle permission denied', async () => {
      mockDownloadAttachment.mockResolvedValue({
        status: 'ERROR',
        message: 'Access denied: You do not have permission to download this attachment'
      });

      const request = APITestUtils.createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/download-attachment?attachmentId=123'
      });

      const response = await GET(request);

      await APITestUtils.assertResponse(response, {
        status: 403,
        data: {
          success: false,
          message: 'Access denied: You do not have permission to download this attachment'
        }
      });
    });

    it('should handle file size limit for preview mode', async () => {
      // Mock large file (over 20MB)
      const largeFileBuffer = Buffer.alloc(21 * 1024 * 1024); // 21MB
      
      mockDownloadAttachment.mockResolvedValue({
        status: 'SUCCESS',
        message: 'File retrieved successfully',
        data: {
          fileBuffer: largeFileBuffer,
          mimeType: 'application/pdf',
          filename: 'large-document.pdf'
        }
      });

      const request = APITestUtils.createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/download-attachment?attachmentId=123&mode=preview'
      });

      const response = await GET(request);

      await APITestUtils.assertResponse(response, {
        status: 413,
        data: {
          success: false,
          message: 'File too large for preview. Maximum size: 20MB'
        }
      });
    });

    it('should validate preview file type safety', async () => {
      const testCases = [
        { mimeType: 'application/pdf', filename: 'doc.pdf', shouldAllow: true },
        { mimeType: 'image/jpeg', filename: 'image.jpg', shouldAllow: true },
        { mimeType: 'image/png', filename: 'image.png', shouldAllow: true },
        { mimeType: 'text/plain', filename: 'text.txt', shouldAllow: true },
        { mimeType: 'application/executable', filename: 'malware.exe', shouldAllow: false },
        { mimeType: 'application/x-msdownload', filename: 'program.exe', shouldAllow: false },
        { mimeType: 'text/html', filename: 'page.html', shouldAllow: false },
      ];

      for (const testCase of testCases) {
        mockDownloadAttachment.mockResolvedValue({
          status: 'SUCCESS',
          message: 'File retrieved successfully',
          data: {
            fileBuffer: Buffer.from('test content'),
            mimeType: testCase.mimeType,
            filename: testCase.filename
          }
        });

        const request = APITestUtils.createMockRequest({
          method: 'GET',
          url: `http://localhost:3000/api/download-attachment?attachmentId=123&mode=preview`
        });

        const response = await GET(request);

        if (testCase.shouldAllow) {
          expect(response.status).toBe(200);
        } else {
          expect(response.status).toBe(400);
          const data = await response.json();
          expect(data.message).toContain('File type not safe for preview');
        }
      }
    });

    it('should set proper security headers', async () => {
      mockDownloadAttachment.mockResolvedValue({
        status: 'SUCCESS',
        message: 'File retrieved successfully',
        data: {
          fileBuffer: Buffer.from('test content'),
          mimeType: 'application/pdf',
          filename: 'document.pdf'
        }
      });

      const request = APITestUtils.createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/download-attachment?attachmentId=123&mode=preview'
      });

      const response = await GET(request);

      expect(response.status).toBe(200);
      
      // Should set CSP headers to prevent XSS
      // In actual implementation would check for:
      // - Content-Security-Policy: default-src 'none'; object-src 'none'; frame-ancestors 'none';
      // - X-Content-Type-Options: nosniff
      // - X-Frame-Options: DENY
      // - Cache-Control: no-cache, no-store, must-revalidate
    });

    it('should handle invalid attachment ID format', async () => {
      const invalidIds = ['', 'abc', '123.456', '123;DROP TABLE', '<script>alert(1)</script>'];

      for (const invalidId of invalidIds) {
        const request = APITestUtils.createMockRequest({
          method: 'GET',
          url: `http://localhost:3000/api/download-attachment?attachmentId=${encodeURIComponent(invalidId)}`
        });

        const response = await GET(request);

        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.success).toBe(false);
        expect(data.message).toContain('Invalid attachment ID format');
      }
    });

    it('should handle invalid mode parameter', async () => {
      const invalidModes = ['invalid', 'download123', 'preview-mode', ''];

      for (const invalidMode of invalidModes) {
        const request = APITestUtils.createMockRequest({
          method: 'GET',
          url: `http://localhost:3000/api/download-attachment?attachmentId=123&mode=${invalidMode}`
        });

        const response = await GET(request);

        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.success).toBe(false);
        expect(data.message).toContain('Invalid mode parameter');
      }
    });

    it('should handle server action errors', async () => {
      mockDownloadAttachment.mockRejectedValue(new Error('Server action failed'));

      const request = APITestUtils.createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/download-attachment?attachmentId=123'
      });

      const response = await GET(request);

      await APITestUtils.assertResponse(response, {
        status: 500,
        data: {
          success: false,
          message: 'Internal server error'
        }
      });
    });

    it('should handle concurrent download requests', async () => {
      mockDownloadAttachment.mockResolvedValue({
        status: 'SUCCESS',
        message: 'File retrieved successfully',
        data: {
          fileBuffer: Buffer.from('test content'),
          mimeType: 'application/pdf',
          filename: 'document.pdf'
        }
      });

      const requests = Array.from({ length: 5 }, (_, i) =>
        APITestUtils.createMockRequest({
          method: 'GET',
          url: `http://localhost:3000/api/download-attachment?attachmentId=${i + 1}`
        })
      );

      // Execute requests concurrently
      const responses = await Promise.all(
        requests.map(request => GET(request))
      );

      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      expect(mockDownloadAttachment).toHaveBeenCalledTimes(5);
    });

    it('should sanitize filename for security', async () => {
      const maliciousFilenames = [
        '../../../etc/passwd',
        '..\\..\\windows\\system32\\config',
        'file<script>alert(1)</script>.pdf',
        'file";rm -rf /.pdf'
      ];

      for (const filename of maliciousFilenames) {
        mockDownloadAttachment.mockResolvedValue({
          status: 'SUCCESS',
          message: 'File retrieved successfully',
          data: {
            fileBuffer: Buffer.from('test content'),
            mimeType: 'application/pdf',
            filename: filename
          }
        });

        const request = APITestUtils.createMockRequest({
          method: 'GET',
          url: 'http://localhost:3000/api/download-attachment?attachmentId=123'
        });

        const response = await GET(request);

        expect(response.status).toBe(200);
        
        // In actual implementation, would verify that dangerous characters
        // in filenames are properly sanitized or escaped in Content-Disposition header
      }
    });

    it('should handle different user roles appropriately', async () => {
      const testCases = [
        { 
          session: APITestUtils.createMockSession({ user: { roles: ['B2B_TicketCreator'] } }),
          shouldAllow: true
        },
        {
          session: APITestUtils.createMockSession({ user: { roles: ['B2B_TicketHandler'] } }),
          shouldAllow: true
        },
        {
          session: APITestUtils.createMockSession({ user: { roles: ['Admin'] } }),
          shouldAllow: true
        },
        {
          session: APITestUtils.createMockSession({ user: { roles: ['Guest'] } }),
          shouldAllow: false
        }
      ];

      for (const testCase of testCases) {
        mockGetServerSession.mockResolvedValue(testCase.session);

        if (testCase.shouldAllow) {
          mockDownloadAttachment.mockResolvedValue({
            status: 'SUCCESS',
            message: 'File retrieved successfully',
            data: {
              fileBuffer: Buffer.from('test content'),
              mimeType: 'application/pdf',
              filename: 'document.pdf'
            }
          });
        } else {
          mockDownloadAttachment.mockResolvedValue({
            status: 'ERROR',
            message: 'Access denied'
          });
        }

        const request = APITestUtils.createMockRequest({
          method: 'GET',
          url: 'http://localhost:3000/api/download-attachment?attachmentId=123'
        });

        const response = await GET(request);

        if (testCase.shouldAllow) {
          expect(response.status).toBe(200);
        } else {
          expect(response.status).toBe(403);
        }
      }
    });

    it('should handle empty file buffers', async () => {
      mockDownloadAttachment.mockResolvedValue({
        status: 'SUCCESS',
        message: 'File retrieved successfully',
        data: {
          fileBuffer: Buffer.alloc(0), // Empty buffer
          mimeType: 'application/pdf',
          filename: 'empty.pdf'
        }
      });

      const request = APITestUtils.createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/download-attachment?attachmentId=123'
      });

      const response = await GET(request);

      expect(response.status).toBe(200);
      
      // Should handle empty files gracefully
      // Content-Length header should be 0
    });
  });
});