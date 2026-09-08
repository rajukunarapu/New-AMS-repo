import React from 'react';
import { UploadPageComponent } from '../components/Upload/UploadPage';

interface UploadPageProps {
  onUploadSuccess?: () => void;
}

export const UploadPage: React.FC<UploadPageProps> = ({ onUploadSuccess }) => {
  return <UploadPageComponent onUploadSuccess={onUploadSuccess} />;
};
