import { useState } from 'react';
import { useSelector } from 'react-redux';
import { api } from '../lib/api';

export default function ResumeUploadPage({ onParsed }) {
  const groqKey = useSelector((state) => state.user.apiKeys.groq);

  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [status, setStatus] = useState('idle');
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');

  function handleDrag(e) {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type === 'application/pdf') {
      setFile(droppedFile);
      setError('');
    } else {
      setError('please drop a PDF file');
    }
  }

  function handleFileSelect(e) {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError('');
    }
  }

  async function handleUpload() {
    if (!file) {
      setError('please select a PDF file first');
      return;
    }

    if (!groqKey) {
      setError('groq API key is missing. go back to the setup page and add it.');
      return;
    }

    setStatus('uploading');
    setProgress('uploading PDF...');
    setError('');

    try {
      // we need to send the file and the api key to the backend together
      const formData = new FormData();
      formData.append('file', file);
      formData.append('groq_key', groqKey);

      setProgress('extracting text and running ai...');
      setStatus('parsing');

      const response = await api.post('/api/resume/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        // giving the backend plenty of time since the ai can be slow
        timeout: 120000, 
      });

      setStatus('done');
      setProgress('parsing complete!');

      if (onParsed) {
        onParsed(response.data);
      }
    } catch (err) {
      setStatus('error');
      const message = err.response?.data?.detail || err.message || 'something went wrong';
      setError(message);
      setProgress('');
    }
  }

  return (
    <div style={{ maxWidth: '600px', margin: '40px auto', padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>upload your resume</h1>
      <p>drop a PDF below and we'll extract your skills using NER + AI.</p>

      {/* drag and drop zone */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        style={{
          border: `2px dashed ${dragActive ? '#0066cc' : '#ccc'}`,
          borderRadius: '12px',
          padding: '40px',
          textAlign: 'center',
          backgroundColor: dragActive ? '#e8f0fe' : '#fafafa',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          marginBottom: '20px',
        }}
        onClick={() => document.getElementById('file-input').click()}
      >
        <input
          id="file-input"
          type="file"
          accept=".pdf"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />

        {file ? (
          <div>
            <p style={{ fontSize: '18px', fontWeight: 'bold' }}>📄 {file.name}</p>
            <p style={{ color: '#666' }}>{(file.size / 1024).toFixed(1)} KB</p>
          </div>
        ) : (
          <div>
            <p style={{ fontSize: '24px', marginBottom: '8px' }}>📁</p>
            <p style={{ fontWeight: 'bold' }}>drag & drop your resume PDF here</p>
            <p style={{ color: '#999', fontSize: '14px' }}>or click to browse</p>
          </div>
        )}
      </div>

      {/* upload button */}
      <button
        onClick={handleUpload}
        disabled={!file || status === 'uploading' || status === 'parsing'}
        style={{
          width: '100%',
          padding: '12px',
          fontSize: '16px',
          backgroundColor: (!file || status === 'parsing') ? '#ccc' : '#0066cc',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: (!file || status === 'parsing') ? 'not-allowed' : 'pointer',
        }}
      >
        {status === 'parsing' ? 'parsing... (this takes ~30s)' : 'upload & parse resume'}
      </button>

      {/* progress indicator */}
      {progress && (
        <p style={{ marginTop: '15px', color: '#0066cc', fontWeight: 'bold' }}>
          ⏳ {progress}
        </p>
      )}

      {/* error message */}
      {error && (
        <p style={{ marginTop: '15px', color: 'red' }}>
          ❌ {error}
        </p>
      )}
    </div>
  );
}
