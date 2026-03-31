import React, { useState } from 'react';
import { Upload, CheckCircle, AlertCircle, Loader, File } from 'lucide-react';
import { manualApi } from '../lib/api';

interface UploadState {
  loading: boolean;
  error: string | null;
  success: string | null;
}

interface BizonSummary {
  viewers?: number;
  duration?: number;
  peak?: number;
  engagementRate?: number;
  [key: string]: any;
}

export default function BizonUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>({
    loading: false,
    error: null,
    success: null,
  });
  const [summary, setSummary] = useState<BizonSummary | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      const droppedFile = files[0];
      if (
        droppedFile.type ===
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ) {
        setFile(droppedFile);
        setUploadState({ loading: false, error: null, success: null });
      } else {
        setUploadState({
          loading: false,
          error: 'Пожалуйста, загрузите файл XLSX',
          success: null,
        });
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      const selectedFile = files[0];
      if (
        selectedFile.type ===
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ) {
        setFile(selectedFile);
        setUploadState({ loading: false, error: null, success: null });
      } else {
        setUploadState({
          loading: false,
          error: 'Пожалуйста, загрузите файл XLSX',
          success: null,
        });
      }
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setUploadState({
        loading: false,
        error: 'Выберите файл для загрузки',
        success: null,
      });
      return;
    }

    setUploadState({ loading: true, error: null, success: null });

    try {
      const response = await manualApi.uploadBizonReport(file);
      setUploadState({
        loading: false,
        error: null,
        success: 'Отчёт успешно загружен!',
      });
      setSummary(response);
      setFile(null);

      setTimeout(() => {
        setUploadState({ ...uploadState, success: null });
      }, 5000);
    } catch (err: any) {
      setUploadState({
        loading: false,
        error: err.message || 'Ошибка при загрузке файла',
        success: null,
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
          <Upload size={24} className="text-accent" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white">Загрузить отчёт Bizon365</h1>
          <p className="text-gray-400 text-sm">Импортируйте данные из XLSX файла</p>
        </div>
      </div>

      <div className="max-w-2xl space-y-6">
        {/* Upload Card */}
        <div className="card p-8 space-y-6">
          {/* Error Message */}
          {uploadState.error && (
            <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
              <AlertCircle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-red-400 text-sm">{uploadState.error}</p>
            </div>
          )}

          {/* Success Message */}
          {uploadState.success && (
            <div className="flex items-start gap-3 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
              <CheckCircle size={20} className="text-green-500 flex-shrink-0 mt-0.5" />
              <p className="text-green-400 text-sm">{uploadState.success}</p>
            </div>
          )}

          {/* Upload Area */}
          <form onSubmit={handleUpload} className="space-y-4">
            {/* Drop Zone */}
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`relative border-2 border-dashed rounded-lg p-8 transition-colors ${
                dragActive
                  ? 'border-accent bg-accent/10'
                  : file
                    ? 'border-accent/50 bg-accent/5'
                    : 'border-dark-600 hover:border-dark-500 bg-dark-800/50'
              }`}
            >
              <input
                type="file"
                accept=".xlsx"
                onChange={handleFileSelect}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />

              <div className="flex flex-col items-center justify-center gap-3 text-center">
                {file ? (
                  <>
                    <File size={32} className="text-accent" />
                    <div>
                      <p className="font-medium text-white">{file.name}</p>
                      <p className="text-sm text-gray-400">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        setFile(null);
                      }}
                      className="text-sm text-accent hover:text-accent/80 transition-colors mt-2"
                    >
                      Выбрать другой файл
                    </button>
                  </>
                ) : (
                  <>
                    <Upload size={32} className="text-gray-500" />
                    <div>
                      <p className="font-medium text-white">
                        Перетащите файл сюда или нажмите для выбора
                      </p>
                      <p className="text-sm text-gray-400 mt-1">Формат: XLSX</p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Upload Button */}
            <button
              type="submit"
              disabled={!file || uploadState.loading}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {uploadState.loading ? (
                <>
                  <Loader size={16} className="animate-spin" />
                  Загрузка...
                </>
              ) : (
                <>
                  <Upload size={16} />
                  Загрузить отчёт
                </>
              )}
            </button>
          </form>

          {/* Info */}
          <div className="p-4 bg-dark-700/50 border border-dark-600 rounded-lg">
            <p className="text-sm text-gray-300">
              <span className="font-medium text-white">Требования:</span> Файл должен быть в формате
              XLSX и содержать данные о просмотрах вебинара Bizon365.
            </p>
          </div>
        </div>

        {/* Summary Card */}
        {summary && (
          <div className="card p-6 space-y-4 border border-green-500/30 bg-green-500/5">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <CheckCircle size={20} className="text-green-500" />
              Сводка загруженного отчёта
            </h2>

            <div className="grid grid-cols-2 gap-4">
              {summary.viewers !== undefined && (
                <div className="p-3 bg-dark-700 rounded-lg">
                  <p className="text-xs text-gray-400 mb-1">Просмотры</p>
                  <p className="text-2xl font-bold text-white">{summary.viewers}</p>
                </div>
              )}

              {summary.duration !== undefined && (
                <div className="p-3 bg-dark-700 rounded-lg">
                  <p className="text-xs text-gray-400 mb-1">Продолжительность (мин)</p>
                  <p className="text-2xl font-bold text-white">{summary.duration}</p>
                </div>
              )}

              {summary.peak !== undefined && (
                <div className="p-3 bg-dark-700 rounded-lg">
                  <p className="text-xs text-gray-400 mb-1">Пик просмотров</p>
                  <p className="text-2xl font-bold text-white">{summary.peak}</p>
                </div>
              )}

              {summary.engagementRate !== undefined && (
                <div className="p-3 bg-dark-700 rounded-lg">
                  <p className="text-xs text-gray-400 mb-1">Уровень вовлечённости</p>
                  <p className="text-2xl font-bold text-white">{summary.engagementRate}%</p>
                </div>
              )}
            </div>

            {Object.keys(summary).length > 4 && (
              <div className="pt-3 border-t border-dark-600">
                <p className="text-xs text-gray-400 mb-2">Дополнительные данные:</p>
                <div className="space-y-1">
                  {Object.entries(summary).map(([key, value]) => {
                    if (!['viewers', 'duration', 'peak', 'engagementRate'].includes(key)) {
                      return (
                        <div key={key} className="flex justify-between text-sm">
                          <span className="text-gray-400">{key}:</span>
                          <span className="text-white font-medium">
                            {typeof value === 'number' ? value.toFixed(2) : String(value)}
                          </span>
                        </div>
                      );
                    }
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
