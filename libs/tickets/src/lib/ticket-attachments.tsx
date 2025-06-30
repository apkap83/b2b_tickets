import React, { useState } from 'react';
import {
  IoDocumentOutline,
  IoImageOutline,
  IoVideocamOutline,
  IoMusicalNotesOutline,
  IoArchiveOutline,
  IoDownloadOutline,
  IoEyeOutline,
  IoCloseOutline,
  IoChevronDownOutline,
  IoChevronUpOutline,
} from 'react-icons/io5';
import { formatDate } from '@b2b-tickets/utils';
import { TicketAttachmentDetails } from '@b2b-tickets/shared-models';
import Button from '@mui/material/Button';
import { getFileIcon } from './get-file-icon';

import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';

interface TicketAttachmentsProps {
  attachments: TicketAttachmentDetails[];
  onDownload?: (attachment: TicketAttachmentDetails) => void;
  onPreview: (attachment: TicketAttachmentDetails) => void;
  isPreviewable: (filename: string) => boolean;
  onDelete: (attachment: TicketAttachmentDetails) => void;
  canDelete?: boolean;
  defaultExpanded?: boolean;
}

export function TicketAttachments({
  attachments,
  onDownload,
  onPreview,
  isPreviewable,
  onDelete,
  canDelete = false,
  defaultExpanded = true,
}: TicketAttachmentsProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="w-full">
      <div className="bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
        <div
          className="px-4 py-3 border-b border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors"
          onClick={toggleExpanded}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-base font-medium text-gray-900 flex items-center gap-2">
              <IoDocumentOutline size={18} />
              Attachments ({attachments.length})
            </h3>
            <Tooltip title={isExpanded ? 'Collapse' : 'Expand'}>
              <IconButton
                size="small"
                onClick={toggleExpanded}
                className="text-gray-600 hover:text-gray-800"
                sx={{
                  '&:hover': {
                    backgroundColor: 'rgba(0, 0, 0, 0.04)',
                  },
                }}
              >
                {isExpanded ? (
                  <IoChevronUpOutline size={20} />
                ) : (
                  <IoChevronDownOutline size={20} />
                )}
              </IconButton>
            </Tooltip>
          </div>
        </div>

        {isExpanded && (
          <div className="p-2">
            <div
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
              // style={{ gridTemplateColumns: 'repeat(4, 200px)' }}
            >
              {attachments.map((attachment) => (
                <div
                  key={attachment.attachment_id}
                  className="group bg-gray-50 border border-gray-200 rounded-lg p-3 hover:bg-gray-100 transition-colors"
                >
                  {/* File Header with Icon and Name */}
                  <div className="flex items-start gap-3 mb-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {getFileIcon(attachment.Filename)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-sm font-medium text-gray-900 break-words"
                        title={attachment.Filename}
                      >
                        {attachment.Filename}
                      </p>
                    </div>
                    {/* Delete Button - Top Right Corner */}
                    {canDelete && (
                      <div>
                        <Tooltip title="Delete file">
                          <IconButton
                            size="small"
                            onClick={() => onDelete(attachment)}
                            className="text-red-600 hover:text-red-800 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                            sx={{
                              '&:hover': {
                                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                              },
                            }}
                          >
                            <IoCloseOutline size={18} />
                          </IconButton>
                        </Tooltip>
                      </div>
                    )}
                  </div>

                  {/* File Details */}
                  <div className="space-y-1 mb-3">
                    {attachment['Username'] && (
                      <div className="text-xs text-gray-600">
                        <span className="font-medium">By:</span>{' '}
                        {attachment['Username']}
                      </div>
                    )}
                    {attachment['Attachment Date'] && (
                      <div className="text-xs text-gray-600">
                        <span className="font-medium">Date:</span>{' '}
                        {new Date(
                          attachment['Attachment Date']
                        ).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: '2-digit',
                          year: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 ">
                    {isPreviewable(attachment.Filename) && (
                      <Button
                        onClick={() => onPreview(attachment)}
                        variant="text"
                        size="small"
                        startIcon={<IoEyeOutline size={14} />}
                        sx={{
                          fontSize: '0.75rem',
                          textTransform: 'none',
                          minWidth: 'auto',
                          padding: '4px 8px',
                          color: '#3b82f6',
                          '&:hover': {
                            backgroundColor: '#dbeafe',
                          },
                        }}
                      >
                        Preview
                      </Button>
                    )}

                    <Button
                      onClick={() => onDownload && onDownload(attachment)}
                      variant="text"
                      size="small"
                      startIcon={<IoDownloadOutline size={14} />}
                      sx={{
                        fontSize: '0.75rem',
                        textTransform: 'none',
                        minWidth: 'auto',
                        padding: '4px 8px',
                        color: '#3b82f6',
                        '&:hover': {
                          backgroundColor: '#dbeafe',
                        },
                      }}
                    >
                      Download
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
