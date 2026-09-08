import React from 'react';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import type { UploadResponse } from '../../services/upload';

interface UploadProgressProps {
  status: 'idle' | 'uploading' | 'success' | 'error';
  result?: UploadResponse | null;
  errorMessage?: string;
}

export const UploadProgress: React.FC<UploadProgressProps> = ({ status, result, errorMessage }) => {
  if (status === 'idle') return null;

  if (status === 'uploading') {
    return (
      <div className="p-4 bg-sky-50 border border-sky-200 rounded-xl flex items-center space-x-3 text-sky-800">
        <div className="w-5 h-5 border-2 border-sky-600 border-t-transparent rounded-full animate-spin"></div>
        <span className="text-sm font-medium">Processing file & generating HANA vector embeddings...</span>
      </div>
    );
  }

  if (status === 'success' && result) {
    return (
      <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-xl space-y-3">
        <div className="flex items-center space-x-2 text-emerald-800 font-bold text-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          <span>Dataset Ingestion Complete!</span>
        </div>
        <div className="grid grid-cols-3 gap-3 text-xs">
          <div className="p-2.5 bg-white rounded-lg border border-emerald-100 shadow-2xs">
            <p className="text-slate-500">File Name</p>
            <p className="font-semibold text-slate-800 truncate mt-0.5">{result.filename}</p>
          </div>
          <div className="p-2.5 bg-white rounded-lg border border-emerald-100 shadow-2xs">
            <p className="text-slate-500">Rows Ingested</p>
            <p className="font-semibold text-emerald-700 mt-0.5">{result.rows_processed}</p>
          </div>
          <div className="p-2.5 bg-white rounded-lg border border-emerald-100 shadow-2xs">
            <p className="text-slate-500">Vector Embeddings</p>
            <p className="font-semibold text-sky-700 mt-0.5">{result.embeddings_generated}</p>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center space-x-3 text-rose-800 text-sm">
        <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
        <span>{errorMessage || "Failed to process dataset. Please check format."}</span>
      </div>
    );
  }

  return null;
};
