import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../utils/axios';

// Users per request: each email waits 2s server side, so a batch stays well under the serverless time limit
const SEND_BATCH_SIZE = 5;

const formatDateTime = (d) =>
  d
    ? new Date(d).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '—';

export default function AdminFijReapply() {
  const [data, setData] = useState({ list: [], summary: null, round: '', deadlineLabel: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [preview, setPreview] = useState(null);
  const [testEmail, setTestEmail] = useState('');
  const [sendingTest, setSendingTest] = useState(false);
  const [testMessage, setTestMessage] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [search, setSearch] = useState('');
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState(null); // { done, total, sent, failed: [] }
  const [proofs, setProofs] = useState({ list: [], loading: true });
  const [proofFilter, setProofFilter] = useState('all'); // 'all' | 'missing' | 'uploaded'
  const [downloadingId, setDownloadingId] = useState(null);

  const fetchList = useCallback(async () => {
    try {
      setError(null);
      const res = await api.get('/admin/fij-reapply');
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Error loading applicants');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchProofs = useCallback(async () => {
    try {
      const res = await api.get('/admin/fij-payment-proofs');
      setProofs({ list: res.data.list || [], loading: false });
    } catch (err) {
      setProofs({ list: [], loading: false, error: err.response?.data?.message || 'Error loading payment proofs' });
    }
  }, []);

  const downloadProof = async (row) => {
    setDownloadingId(row._id);
    try {
      const response = await api.get(`/admin/users/${row._id}/fij-payment-proof`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `FIJ_Payment_Proof_${(row.name || 'User').replace(/\s+/g, '_')}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      alert('Error downloading payment proof.');
    } finally {
      setDownloadingId(null);
    }
  };

  useEffect(() => {
    fetchList();
    fetchProofs();
    api
      .get('/admin/fij-reapply/preview')
      .then((res) => setPreview(res.data))
      .catch(() => setPreview(null));
  }, [fetchList, fetchProofs]);

  const handleSendTest = async (e) => {
    e.preventDefault();
    setSendingTest(true);
    setTestMessage(null);
    try {
      const res = await api.post('/admin/fij-reapply/test', { email: testEmail });
      setTestMessage({ ok: true, text: res.data.message });
    } catch (err) {
      setTestMessage({ ok: false, text: err.response?.data?.message || 'Error sending test email' });
    } finally {
      setSendingTest(false);
    }
  };

  const term = search.trim().toLowerCase();
  const visibleRows = term
    ? data.list.filter((u) => u.name?.toLowerCase().includes(term) || u.email.toLowerCase().includes(term))
    : data.list;
  const selectableRows = visibleRows.filter((u) => u.eligible);
  const allVisibleSelected = selectableRows.length > 0 && selectableRows.every((u) => selected.has(u._id));

  const toggle = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllVisible = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      selectableRows.forEach((u) => (allVisibleSelected ? next.delete(u._id) : next.add(u._id)));
      return next;
    });
  };

  const selectNotNotified = () => {
    setSelected(new Set(data.list.filter((u) => u.eligible && !u.notifiedAt).map((u) => u._id)));
  };

  const handleSend = async () => {
    const ids = [...selected];
    if (ids.length === 0) return;
    const alreadyNotified = data.list.filter((u) => selected.has(u._id) && u.notifiedAt).length;
    const warning = alreadyNotified ? `\n\n${alreadyNotified} of them were already notified and will receive it again.` : '';
    if (!window.confirm(`Send the invitation to ${ids.length} applicant(s)?${warning}`)) return;

    setSending(true);
    const state = { done: 0, total: ids.length, sent: 0, failed: [] };
    setProgress({ ...state });
    for (let i = 0; i < ids.length; i += SEND_BATCH_SIZE) {
      const batch = ids.slice(i, i + SEND_BATCH_SIZE);
      try {
        const res = await api.post('/admin/fij-reapply/notify', { userIds: batch });
        state.sent += res.data.sent;
        res.data.results.filter((r) => !r.success).forEach((r) => state.failed.push(r));
      } catch (err) {
        batch.forEach((userId) =>
          state.failed.push({ userId, reason: err.response?.data?.message || 'Request failed' })
        );
      }
      state.done += batch.length;
      setProgress({ ...state, failed: [...state.failed] });
    }
    setSending(false);
    setSelected(new Set());
    fetchList();
  };

  const summary = data.summary || {};
  const proofRows = proofs.list.filter((r) =>
    proofFilter === 'missing' ? !r.hasProof : proofFilter === 'uploaded' ? r.hasProof : true
  );
  const proofsUploaded = proofs.list.filter((r) => r.hasProof).length;
  const emailById = new Map(data.list.map((u) => [u._id, u.email]));

  return (
    <div className="min-h-screen bg-mesh-gradient relative">
      <div className="ambient-orb-1" />
      <div className="ambient-orb-2" />
      <div className="ambient-orb-3" />
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Future Innovators Japan: new call</h1>
            <p className="text-gray-600 mt-1">
              Payment proofs for {data.round || 'the current round'} and invitations for first-round applicants. Deadline: {data.deadlineLabel || '—'} (Japan time).
            </p>
          </div>
          <Link to="/admin" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Admin Panel
          </Link>
        </div>

        {error && <div className="glass-card p-4 mb-6 text-red-700">{error}</div>}

        {/* Payment proofs: first step for every applicant of the current round */}
        <div className="glass-card p-4 sm:p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Payment proofs ({data.round || '—'})</h2>
              <p className="text-sm text-gray-600">
                {proofs.loading ? 'Loading…' : `${proofsUploaded} of ${proofs.list.length} applicants uploaded their receipt`}
              </p>
            </div>
            <div className="flex gap-2">
              {[
                { value: 'all', label: 'All' },
                { value: 'missing', label: 'Missing' },
                { value: 'uploaded', label: 'Uploaded' },
              ].map((f) => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setProofFilter(f.value)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${
                    proofFilter === f.value ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-700 hover:bg-white/60'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          {proofs.error && <p className="text-sm text-red-700 mb-3">{proofs.error}</p>}
          <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-600 border-b border-gray-200">
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Email</th>
                  <th className="px-3 py-2">Applicant</th>
                  <th className="px-3 py-2">Payment proof</th>
                </tr>
              </thead>
              <tbody>
                {!proofs.loading && proofRows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-6 text-center text-gray-500">No applicants found.</td>
                  </tr>
                ) : (
                  proofRows.map((row) => (
                    <tr key={row._id} className="border-b border-gray-100">
                      <td className="px-3 py-2 text-gray-900">{row.name}</td>
                      <td className="px-3 py-2 text-gray-700">{row.email}</td>
                      <td className="px-3 py-2 text-gray-700">{row.reapplicant ? 'Applied again' : 'New'}</td>
                      <td className="px-3 py-2">
                        {row.hasProof ? (
                          <button
                            type="button"
                            onClick={() => downloadProof(row)}
                            disabled={downloadingId === row._id}
                            className="text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
                          >
                            {downloadingId === row._id ? 'Downloading…' : `Download (${formatDateTime(row.uploadedAt)})`}
                          </button>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">Not uploaded</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <h2 className="text-xl font-bold text-gray-900 mb-3">Invite first-round applicants</h2>

        {/* Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {[
            { label: 'First-round applicants', value: summary.total },
            { label: 'Invitation sent', value: summary.notified },
            { label: 'Applied again', value: summary.reapplied },
          ].map((card) => (
            <div key={card.label} className="glass-card p-4">
              <p className="text-sm text-gray-600">{card.label}</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{loading ? '…' : card.value ?? 0}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Email preview */}
          <div className="glass-card p-4 sm:p-6 lg:col-span-2 lg:order-1 order-2">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Email preview</h2>
            <p className="text-sm text-gray-600 mb-3">
              Subject: <span className="font-medium text-gray-800">{preview?.subject || '—'}</span>
            </p>
            {preview ? (
              <iframe
                title="Invitation email preview"
                srcDoc={preview.html}
                sandbox=""
                className="w-full h-[520px] rounded-lg border border-gray-200 bg-white"
              />
            ) : (
              <p className="text-sm text-gray-500">Preview not available.</p>
            )}
          </div>

          {/* Test send */}
          <div className="glass-card p-4 sm:p-6 h-fit lg:order-2 order-1">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Send a test</h2>
            <p className="text-sm text-gray-600 mb-4">
              Sends the invitation to any address. It does not mark anyone as notified.
            </p>
            <form onSubmit={handleSendTest} className="flex flex-col sm:flex-row gap-2">
              <input
                type="email"
                required
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="you@example.com"
                className="flex-1 px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                disabled={sendingTest}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold px-5 py-2 rounded-lg"
              >
                {sendingTest ? 'Sending…' : 'Send test'}
              </button>
            </form>
            {testMessage && (
              <p className={`mt-3 text-sm ${testMessage.ok ? 'text-green-700' : 'text-red-700'}`}>{testMessage.text}</p>
            )}
          </div>
        </div>

        {/* Recipients */}
        <div className="glass-card p-4 sm:p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Recipients</h2>
              <p className="text-sm text-gray-600">{selected.size} selected</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name or email"
                className="px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={selectNotNotified}
                disabled={sending}
                className="px-4 py-2 rounded-lg border border-blue-600 text-blue-700 font-medium hover:bg-blue-50 disabled:opacity-50"
              >
                Select not yet notified
              </button>
              <button
                type="button"
                onClick={handleSend}
                disabled={sending || selected.size === 0}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold px-5 py-2 rounded-lg"
              >
                {sending ? 'Sending…' : `Send invitation (${selected.size})`}
              </button>
            </div>
          </div>

          {progress && (
            <div className="mb-4 p-3 rounded-lg bg-white/60 border border-gray-200 text-sm">
              <p className="font-medium text-gray-800">
                {progress.done < progress.total ? 'Sending' : 'Finished'}: {progress.done}/{progress.total} processed · {progress.sent} sent · {progress.failed.length} failed
              </p>
              {progress.failed.length > 0 && (
                <ul className="mt-2 text-red-700 list-disc pl-5">
                  {progress.failed.map((f) => (
                    <li key={f.userId}>
                      {f.email || emailById.get(f.userId) || f.userId}: {f.reason}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-600 border-b border-gray-200">
                  <th className="px-3 py-2 w-10">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={toggleAllVisible}
                      disabled={sending || selectableRows.length === 0}
                      aria-label="Select all"
                    />
                  </th>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Email</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-6 text-center text-gray-500">Loading…</td>
                  </tr>
                ) : visibleRows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-6 text-center text-gray-500">No applicants found.</td>
                  </tr>
                ) : (
                  visibleRows.map((u) => (
                    <tr key={u._id} className="border-b border-gray-100">
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={selected.has(u._id)}
                          onChange={() => toggle(u._id)}
                          disabled={sending || !u.eligible}
                          aria-label={`Select ${u.name}`}
                        />
                      </td>
                      <td className="px-3 py-2 text-gray-900">{u.name}</td>
                      <td className="px-3 py-2 text-gray-700">{u.email}</td>
                      <td className="px-3 py-2">
                        {u.reapplied ? (
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800">Applied again</span>
                        ) : u.notifiedAt ? (
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                            Notified {formatDateTime(u.notifiedAt)}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">Not notified</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
