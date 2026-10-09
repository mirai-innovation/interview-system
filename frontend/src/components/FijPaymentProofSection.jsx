import { useRef, useState } from 'react';
import api from '../utils/axios';

const formatDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

/**
 * Future Innovators Japan: first step of the process. Applicants pay on the program website
 * and upload the receipt (PDF) here. No admin review: uploading unlocks the application form.
 */
const FijPaymentProofSection = ({ fijPaymentProof, onSuccess }) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  if (!fijPaymentProof?.required) return null;
  const uploadedAt = fijPaymentProof.uploadedAt;

  const handleUpload = async (e) => {
    const file = e?.target?.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      setError('Please select a PDF file.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('PDF must be 10MB or less.');
      return;
    }
    setError('');
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      await api.post('/application/upload-fij-payment-proof', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (typeof onSuccess === 'function') onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || 'Error uploading payment proof.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="mt-8 pt-6 border-t border-white/40">
      <h3 className="text-lg font-bold text-gray-900 mb-2">Payment Proof</h3>
      <p className="text-sm text-gray-600 mb-4">
        Apply and complete the payment on the{' '}
        <a
          href={fijPaymentProof.applicationUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-700 font-medium underline"
        >
          Future Innovators Japan program page
        </a>
        , then upload your payment receipt in PDF format. Once uploaded, the application form is unlocked.
      </p>

      {error && <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>}

      {uploadedAt && (
        <div className="mb-3 p-4 rounded-xl bg-green-50 border border-green-200">
          <p className="text-sm font-medium text-green-800">Payment proof uploaded</p>
          <p className="text-sm text-green-700 mt-1">Uploaded on {formatDate(uploadedAt)}</p>
        </div>
      )}

      <input ref={fileInputRef} type="file" accept="application/pdf" onChange={handleUpload} className="hidden" />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className={
          uploadedAt
            ? 'inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-700 disabled:opacity-50'
            : 'inline-flex items-center justify-center bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold text-sm rounded-full px-6 py-2.5 shadow-lg hover:shadow-xl transition-all disabled:opacity-50'
        }
      >
        {uploading ? 'Uploading...' : uploadedAt ? 'Replace receipt' : 'Upload payment receipt (PDF)'}
        {!uploadedAt && (
          <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        )}
      </button>
      {!uploadedAt && <p className="text-xs text-gray-500 mt-2">PDF only, max 10MB</p>}
    </div>
  );
};

export default FijPaymentProofSection;
