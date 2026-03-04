import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../utils/axios';

/**
 * Admin-only page: when visited (e.g. from Excel link), downloads the invoice PDF
 * for the given userId and then redirects back to Invoice Statistics.
 */
export default function AdminInvoicePdfDownload() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('downloading'); // 'downloading' | 'done' | 'error'

  useEffect(() => {
    if (!userId) {
      setStatus('error');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const response = await api.get(`/admin/users/${userId}/invoice`, { responseType: 'blob' });
        if (cancelled) return;
        const disposition = response.headers['content-disposition'];
        const fileNameMatch = disposition?.match(/filename="?([^"]+)"?/);
        const fileName = fileNameMatch?.[1] || `MIRI_Invoice_${userId}.pdf`;
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', fileName);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        setStatus('done');
        navigate('/admin/invoice-stats', { replace: true });
      } catch (err) {
        if (cancelled) return;
        setStatus('error');
        if (err.response?.data instanceof Blob) {
          err.response.data.text().then((text) => {
            try {
              const jsonError = JSON.parse(text);
              alert(jsonError.message || 'Error downloading invoice.');
            } catch {
              alert('Error downloading invoice.');
            }
          });
        } else {
          alert(err.response?.data?.message || 'Error downloading invoice.');
        }
        navigate('/admin/invoice-stats', { replace: true });
      }
    })();
    return () => { cancelled = true; };
  }, [userId, navigate]);

  return (
    <div className="min-h-screen bg-mesh-gradient relative">
      <div className="ambient-orb-1" />
      <div className="ambient-orb-2" />
      <div className="ambient-orb-3" />
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-7xl flex flex-col items-center justify-center min-h-[60vh]">
        {status === 'downloading' && (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mb-4" />
            <p className="text-gray-600">Downloading invoice PDF...</p>
          </>
        )}
        {status === 'error' && (
          <p className="text-red-600">Could not download invoice. Redirecting...</p>
        )}
      </div>
    </div>
  );
}
