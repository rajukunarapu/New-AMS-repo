import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  ArrowRight,
} from 'lucide-react';
import { uploadDatasetFile } from '../../services/upload';
import type { UploadResponse } from '../../services/upload';
import { UploadProgress } from './UploadProgress';

interface UploadPageProps {
  onUploadSuccess?: () => void;
}

export const UploadPageComponent: React.FC<UploadPageProps> = ({ onUploadSuccess }) => {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [result, setResult] = useState<UploadResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const dropped = e.dataTransfer.files[0];
      if (dropped.name.endsWith('.xlsx') || dropped.name.endsWith('.xls') || dropped.name.endsWith('.csv')) {
        setFile(dropped);
        setStatus('idle');
        setError(null);
      } else {
        setError('Please drop an Excel (.xlsx, .xls) or CSV (.csv) file.');
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setStatus('idle');
      setError(null);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setStatus('uploading');
    setError(null);

    try {
      const res = await uploadDatasetFile(file);
      setResult(res);
      setStatus('success');
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || 'Upload failed. Please verify file format.';
      setError(msg);
      setStatus('error');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header Banner */}
      <div className="glass-panel p-6 bg-gradient-to-r from-white via-emerald-50/40 to-sky-50/30 border border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="p-3 bg-gradient-to-tr from-emerald-600 to-teal-600 rounded-2xl shadow-md shadow-emerald-600/20 text-white flex-shrink-0">
              <UploadCloud className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 uppercase tracking-wider">
                  Ingestion Pipeline
                </span>
                <span className="text-[11px] text-slate-400">Excel / CSV to HANA Vectors</span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
                Dataset Management & Ingestion
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Upload updated sales datasets to refresh in-memory analytics caching and sync HANA vector embeddings.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Upload Box */}
      <div className="glass-panel p-8 border border-slate-200 bg-white space-y-6">
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
            isDragOver
              ? 'border-sky-500 bg-sky-50/60 scale-[1.01]'
              : file
              ? 'border-emerald-400 bg-emerald-50/30'
              : 'border-slate-300 hover:border-sky-400 hover:bg-slate-50/60'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="p-4 bg-sky-50 text-sky-600 rounded-2xl mb-3">
            <FileSpreadsheet className="w-10 h-10" />
          </div>

          {file ? (
            <div className="space-y-1">
              <p className="text-sm font-bold text-slate-800">{file.name}</p>
              <p className="text-xs text-slate-400 font-mono">
                {(file.size / (1024 * 1024)).toFixed(2)} MB · Ready to ingest
              </p>
              <span className="text-xs text-sky-600 font-semibold hover:underline block pt-2">
                Click or drop another file to replace
              </span>
            </div>
          ) : (
            <div className="space-y-1">
              <p className="text-sm font-bold text-slate-800">
                Drag and drop your Excel or CSV dataset here
              </p>
              <p className="text-xs text-slate-400">
                Supported formats: .xlsx, .xls, .csv (e.g., SAC_Sales_Preprocessed.xlsx)
              </p>
              <button
                type="button"
                className="mt-3 px-4 py-2 text-xs font-semibold text-sky-700 bg-sky-50 border border-sky-200 rounded-xl hover:bg-sky-100 transition-colors"
              >
                Browse Local Files
              </button>
            </div>
          )}
        </div>

        {/* Action Button */}
        <div className="flex justify-end">
          <button
            onClick={handleUpload}
            disabled={!file || status === 'uploading'}
            className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm rounded-xl shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {status === 'uploading' ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Processing & Generating Vectors…</span>
              </>
            ) : (
              <>
                <UploadCloud className="w-4 h-4" />
                <span>Ingest & Synchronize Dataset</span>
              </>
            )}
          </button>
        </div>

        {/* Progress & Result feedback */}
        <UploadProgress status={status} result={result} errorMessage={error || undefined} />

        {status === 'success' && onUploadSuccess && (
          <div className="pt-2 flex justify-end">
            <button
              onClick={onUploadSuccess}
              className="flex items-center gap-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs"
            >
              <span>View Executive Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
