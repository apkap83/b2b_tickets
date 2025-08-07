import {
  IoDocumentOutline,
  IoImageOutline,
  IoVideocamOutline,
  IoMusicalNotesOutline,
  IoArchiveOutline,
} from 'react-icons/io5';

export const getFileIcon = (filename: string) => {
  const extension = filename.split('.').pop()?.toLowerCase();

  switch (extension) {
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'webp':
    case 'svg':
    case 'jfif':
      return <IoImageOutline className="text-blue-500" size={24} />;
    case 'mp4':
    case 'avi':
    case 'mov':
    case 'wmv':
    case 'flv':
      return <IoVideocamOutline className="text-purple-500" size={24} />;
    case 'mp3':
    case 'wav':
    case 'flac':
    case 'aac':
      return <IoMusicalNotesOutline className="text-green-500" size={24} />;
    case 'zip':
    case 'rar':
    case '7z':
    case 'tar':
    case 'gz':
      return <IoArchiveOutline className="text-orange-500" size={24} />;
    case 'pdf':
      return <IoDocumentOutline className="text-red-500" size={24} />;
    case 'doc':
    case 'docx':
      return <IoDocumentOutline className="text-blue-600" size={24} />;
    case 'xls':
    case 'xlsx':
      return <IoDocumentOutline className="text-green-600" size={24} />;
    case 'ppt':
    case 'pptx':
      return <IoDocumentOutline className="text-orange-600" size={24} />;
    case 'txt':
    case 'log':
    case 'csv':
    case 'json':
    case 'xml':
    case 'html':
    case 'htm':
    case 'css':
    case 'js':
    case 'ts':
    case 'jsx':
    case 'tsx':
    case 'md':
      return <IoDocumentOutline className="text-gray-600" size={24} />;
    default:
      return <IoDocumentOutline className="text-gray-400" size={24} />;
  }
};
