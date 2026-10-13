import React, { useEffect, useState } from 'react';
import { X, KeyRound, Plus, Copy, Check, Trash2, AlertCircle, TriangleAlert } from 'lucide-react';
import { McpKey } from '../types';
import { api } from '../api';

interface McpKeysModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const McpKeysModal: React.FC<McpKeysModalProps> = ({ isOpen, onClose }) => {
  const [keys, setKeys] = useState<McpKey[]>([]);
  const [name, setName] = useState('');
  const [plaintext, setPlaintext] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setKeys(await api.listMcpKeys());
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setPlaintext(null);
      setCopied(false);
      setName('');
      load();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCreate = async () => {
    if (!name.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const created = await api.createMcpKey(name);
      setPlaintext(created.plaintext ?? null);
      setName('');
      setKeys(await api.listMcpKeys());
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!plaintext) return;
    try {
      await navigator.clipboard.writeText(plaintext);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Gagal menyalin ke clipboard. Salin manual dari kotak di atas.');
    }
  };

  const handleRevoke = async (id: string) => {
    setRevokingId(id);
    setError(null);
    try {
      await api.revokeMcpKey(id);
      setKeys(await api.listMcpKeys());
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setRevokingId(null);
    }
  };

  const activeKeys = keys.filter((k) => !k.revoked_at);
  const revokedKeys = keys.filter((k) => k.revoked_at);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom duration-200">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-emerald-600" />
            Kunci MCP
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-slate-500 leading-relaxed">
          Kunci ini memberi akses AI ke data keuangan Anda lewat protokol MCP. Simpan di tempat
          aman — nilainya hanya ditampilkan sekali.
        </p>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl p-3 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {plaintext && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 space-y-2">
            <div className="flex items-start gap-2">
              <TriangleAlert className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span className="text-xs text-emerald-800 leading-relaxed">
                Salin sekarang. Setelah modal ditutup, kunci ini tidak bisa dilihat lagi.
              </span>
            </div>
            <code className="block text-[11px] font-mono text-slate-800 bg-white border border-emerald-200 rounded-lg px-2.5 py-2 break-all">
              {plaintext}
            </code>
            <button
              onClick={handleCopy}
              className="w-full flex items-center justify-center gap-2 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Tersalin' : 'Salin Kunci'}
            </button>
          </div>
        )}

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreate();
            }}
            placeholder="Nama kunci, mis. OpenCode"
            maxLength={100}
            className="flex-1 min-w-0 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 placeholder:text-slate-400"
          />
          <button
            onClick={handleCreate}
            disabled={loading || !name.trim()}
            className="shrink-0 flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" />
            Buat
          </button>
        </div>

        <div className="space-y-2">
          {loading && activeKeys.length === 0 && revokedKeys.length === 0 && (
            <p className="text-xs text-slate-400 text-center py-3">Memuat kunci...</p>
          )}

          {!loading && activeKeys.length === 0 && revokedKeys.length === 0 && (
            <p className="text-xs text-slate-400 text-center py-3">Belum ada kunci MCP.</p>
          )}

          {activeKeys.map((key) => (
            <div
              key={key.id}
              className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-800 truncate">{key.name}</p>
                <p className="text-[11px] text-slate-400">
                  Dibuat {new Date(key.created_at).toLocaleDateString('id-ID')}
                  {key.last_used_at
                    ? ` • terakhir dipakai ${new Date(key.last_used_at).toLocaleDateString('id-ID')}`
                    : ' • belum pernah dipakai'}
                </p>
              </div>
              <button
                onClick={() => handleRevoke(key.id)}
                disabled={revokingId === key.id}
                title="Cabut kunci"
                className="shrink-0 p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-40"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}

          {revokedKeys.length > 0 && (
            <p className="text-[11px] text-slate-400 pt-1">
              {revokedKeys.length} kunci sudah dicabut.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};