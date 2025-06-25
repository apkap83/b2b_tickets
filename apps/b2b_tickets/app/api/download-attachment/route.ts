// app/api/download-attachment/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { fileTypeFromBuffer } from 'file-type'; // npm install file-type
import { options } from '@b2b-tickets/auth-options';
import { downloadAttachment } from '@b2b-tickets/server-actions';
import { getServerSession } from 'next-auth';
import {
  SAFE_PREVIEW_TYPES,
  getFallbackMimeType,
  isTextContent,
} from '@b2b-tickets/utils';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(options);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const attachmentId = searchParams.get('attachmentId');
    const mode = searchParams.get('mode');

    if (!attachmentId) {
      return NextResponse.json(
        { error: 'Missing attachment ID' },
        { status: 400 }
      );
    }

    // Get file data
    const result = await downloadAttachment({ attachmentId });
    if (result.status === 'ERROR' || !result.data) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    const { fileBuffer, filename } = result.data;

    const isPreview = mode === 'preview';

    // Add before MIME detection
    const MAX_PREVIEW_SIZE = 20 * 1024 * 1024; // 20MB
    if (isPreview && fileBuffer.length > MAX_PREVIEW_SIZE) {
      return NextResponse.json(
        { error: 'File too large for preview' },
        { status: 413 }
      );
    }

    // Secure MIME type detection with proper fallback
    let detectedMimeType = 'application/octet-stream';

    try {
      // Primary: Detect from file content
      const fileType = await fileTypeFromBuffer(fileBuffer);
      if (fileType) {
        detectedMimeType = fileType.mime;
        console.log(`Detected MIME type from content: ${detectedMimeType}`);
      } else {
        // Fallback: Use extension-based detection
        detectedMimeType = getFallbackMimeType(filename);
        console.log(
          `Using fallback MIME type: ${detectedMimeType} for ${filename}`
        );

        // Additional validation for text files
        if (detectedMimeType === 'text/plain' && !isTextContent(fileBuffer)) {
          // If it's supposed to be text but doesn't look like text, be cautious
          detectedMimeType = 'application/octet-stream';
          console.log(`Content doesn't look like text, using octet-stream`);
        }
      }
    } catch (error) {
      console.warn('MIME detection failed, using fallback:', error);
      detectedMimeType = getFallbackMimeType(filename);

      // Additional validation for text files
      if (detectedMimeType === 'text/plain' && !isTextContent(fileBuffer)) {
        detectedMimeType = 'application/octet-stream';
      }
    }

    console.log(`Final MIME type: ${detectedMimeType} for file: ${filename}`);

    // Security check for preview mode
    if (isPreview && !SAFE_PREVIEW_TYPES.has(detectedMimeType)) {
      console.log(
        `MIME type ${detectedMimeType} not in safe preview types:`,
        Array.from(SAFE_PREVIEW_TYPES)
      );
      return NextResponse.json(
        {
          error: `File type ${detectedMimeType} not allowed for preview`,
          supportedTypes: Array.from(SAFE_PREVIEW_TYPES),
        },
        { status: 415 } // Unsupported Media Type
      );
    }

    // Additional security headers for preview
    const headers: Record<string, string> = {
      'Content-Type': detectedMimeType,
      'Content-Length': fileBuffer.length.toString(),
      'X-Content-Type-Options': 'nosniff', // Prevent MIME sniffing
      'X-Frame-Options': 'SAMEORIGIN',
    };

    if (isPreview) {
      headers['Content-Disposition'] = `inline; filename="${encodeURIComponent(
        filename
      )}"`;
      headers['Cache-Control'] = 'private, max-age=3600';
      headers['Content-Security-Policy'] =
        "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline';";
    } else {
      headers[
        'Content-Disposition'
      ] = `attachment; filename="${encodeURIComponent(filename)}"`;
      headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
      headers['Pragma'] = 'no-cache';
      headers['Expires'] = '0';
    }

    return new NextResponse(fileBuffer, { status: 200, headers });
  } catch (error) {
    console.error('Download API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
