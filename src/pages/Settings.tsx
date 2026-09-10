import React, { useState, useEffect } from 'react';
import { UserCheck, Upload, Trash2, ShieldCheck, AlertCircle, RefreshCw, Plus, Cloud } from 'lucide-react';
import { AuthorizedPerson } from '../types';
import { extractFaceEmbeddingsFromVideo } from '../services/faceEngine';
import {
  savePersonToFirestore,
  deletePersonFromFirestore,
  subscribeToPersonsFromFirestore
} from '../services/firestorePersonService';

const STORAGE_KEY = 'stadium_sentinel_authorized_persons';

export const Settings: React.FC = () => {
  const [authorizedPersons, setAuthorizedPersons] = useState<AuthorizedPerson[]>([]);
  const [name, setName] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progressStatus, setProgressStatus] = useState<string>('Processing video...');
  const [samplesText, setSamplesText] = useState<string>('Collecting face samples: 0/30');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isCloudSynced, setIsCloudSynced] = useState<boolean>(false);

  // Load registered authorized persons from localStorage and Firestore
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setAuthorizedPersons(JSON.parse(stored));
      }
    } catch {
      console.warn('Failed to parse authorized persons from storage.');
    }

    const unsubscribe = subscribeToPersonsFromFirestore(
      (persons) => {
        setIsCloudSynced(true);
        if (persons.length > 0) {
          setAuthorizedPersons(persons);
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(persons));
          } catch {
            // fallback
          }
        }
      },
      () => {
        setIsCloudSynced(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const savePersonsToStorage = (list: AuthorizedPerson[]) => {
    setAuthorizedPersons(list);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch {
      console.warn('Failed to save authorized persons to storage.');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setErrorMessage(null);
    setSuccessMessage(null);

    if (file) {
      if (!file.type.startsWith('video/')) {
        setErrorMessage('Please select a valid video file (MP4/WebM/MOV).');
        return;
      }
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleAddAuthorizedPerson = async () => {
    if (!name.trim()) {
      setErrorMessage('Please enter a display name for the authorized person.');
      return;
    }

    if (!selectedFile) {
      setErrorMessage('Please upload a reference video file.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setProgressStatus('Processing video...');
    setSamplesText('Collecting face samples: 0/30');

    try {
      const result = await extractFaceEmbeddingsFromVideo(
        selectedFile,
        (progress) => {
          setProgressStatus(progress.statusText);
          setSamplesText(`Collecting face samples: ${progress.collectedCount}/${progress.targetCount}`);
        },
        30
      );

      const newPerson: AuthorizedPerson = {
        id: `auth_${Date.now()}`,
        name: name.trim(),
        photoUrl: result.thumbnailUrl,
        descriptor: result.representativeDescriptor,
        descriptors: result.descriptors,
        createdAt: new Date().toISOString()
      };

      const updated = [...authorizedPersons, newPerson];
      savePersonsToStorage(updated);
      savePersonToFirestore(newPerson);

      setSuccessMessage('Authorized person registered successfully.');
      setName('');
      setSelectedFile(null);
      setPreviewUrl(null);
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMessage(error.message || 'No usable face detected in video.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemovePerson = (id: string) => {
    const updated = authorizedPersons.filter((p) => p.id !== id);
    savePersonsToStorage(updated);
    deletePersonFromFirestore(id);
    setSuccessMessage('Removed authorized person record.');
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white tracking-wide uppercase font-mono">STADIUM MONITORING — SETTINGS & REGISTRATION</h2>
        <p className="text-xs text-slate-400 mt-1">Authorized Person registration and security system configuration</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Authorized Persons Registration Section */}
        <div className="bg-[#121722] border border-[#1f293d] rounded-xl p-6 space-y-5">
          <div className="flex items-center justify-between pb-4 border-b border-[#1f293d]">
            <div className="flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-emerald-400" />
              <h3 className="font-semibold text-base text-slate-200">Register Authorized Person</h3>
            </div>
            <span className="text-xs font-mono text-emerald-400 font-bold bg-emerald-950/60 px-2.5 py-1 rounded border border-emerald-800/60">
              AUTHORIZED GALLERY
            </span>
          </div>

          {errorMessage && (
            <div className="p-3 bg-rose-950/60 border border-rose-800/60 rounded-lg text-xs text-rose-300 flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-emerald-950/60 border border-emerald-800/60 rounded-lg text-xs text-emerald-300 flex items-center gap-2 font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {isProcessing && (
            <div className="p-3 bg-blue-950/40 border border-blue-800/60 rounded-lg text-xs text-blue-300 flex flex-col gap-1 font-mono">
              <div className="flex items-center gap-2 font-semibold text-blue-200">
                <RefreshCw className="w-4 h-4 animate-spin text-blue-400 shrink-0" />
                <span>{progressStatus}</span>
              </div>
              <div className="text-[11px] text-blue-400 pl-6">
                {samplesText}
              </div>
            </div>
          )}

          <div className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-400 font-mono mb-1.5">FULL DISPLAY NAME</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Player 1 / Official Staff"
                className="w-full bg-[#0a0d14] border border-[#1f293d] focus:border-blue-500 rounded-lg px-3 py-2.5 text-slate-200 outline-none font-medium text-sm"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-mono mb-1.5">UPLOAD REFERENCE VIDEO</label>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 px-4 py-2 bg-[#0a0d14] hover:bg-[#151c2b] text-slate-200 border border-[#1f293d] rounded-lg cursor-pointer transition-all font-semibold text-xs">
                  <Upload className="w-4 h-4 text-blue-400" />
                  <span>{selectedFile ? 'CHANGE VIDEO' : 'UPLOAD VIDEO'}</span>
                  <input type="file" accept="video/*" onChange={handleFileChange} className="hidden" />
                </label>
                {selectedFile && (
                  <span className="text-slate-400 font-mono text-[11px] truncate max-w-[180px]">
                    {selectedFile.name}
                  </span>
                )}
              </div>
            </div>

            {/* Reference Video Preview */}
            {previewUrl && (
              <div className="p-3 bg-[#0a0d14] rounded-lg border border-[#1f293d] flex items-center gap-4">
                <video
                  src={previewUrl}
                  controls
                  className="w-36 h-24 object-cover rounded-lg border border-[#1f293d]"
                />
                <div className="text-xs text-slate-400 space-y-1">
                  <div className="font-semibold text-slate-200">Video Reference Preview</div>
                  <div className="text-[11px] text-slate-500">
                    Click 'Register Authorized Person' to sample frames and extract multi-angle 128D face embeddings.
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={handleAddAuthorizedPerson}
              disabled={isProcessing || !name.trim() || !selectedFile}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-xs rounded-lg shadow-lg shadow-emerald-900/30 transition-all"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>PROCESSING VIDEO...</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>REGISTER AUTHORIZED PERSON</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Registered Authorized Persons Gallery */}
        <div className="bg-[#121722] border border-[#1f293d] rounded-xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-[#1f293d] mb-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-400" />
                <h3 className="font-semibold text-base text-slate-200">Authorized Gallery</h3>
              </div>
              <span className="text-xs font-mono text-slate-400 font-bold">
                {authorizedPersons.length} REGISTERED
              </span>
            </div>

            {authorizedPersons.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500 space-y-2">
                <div className="p-3 bg-[#0a0d14] rounded-full border border-[#1f293d] inline-block">
                  <UserCheck className="w-8 h-8 text-slate-600" />
                </div>
                <div className="font-medium text-slate-400">No Authorized Persons Registered</div>
                <p className="max-w-xs mx-auto text-[11px] text-slate-500">
                  Register team members, players, or stadium officials above to prevent false intrusion alarms when they enter restricted zones.
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                {authorizedPersons.map((person) => (
                  <div
                    key={person.id}
                    className="p-3 bg-[#0a0d14] rounded-lg border border-[#1f293d] flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={person.photoUrl}
                        alt={person.name}
                        className="w-11 h-11 object-cover rounded-lg border border-emerald-800/60"
                      />
                      <div>
                        <div className="font-bold text-slate-200 text-sm flex items-center gap-2">
                          <span>{person.name}</span>
                          <span className="text-[10px] font-mono px-2 py-0.5 bg-emerald-950 text-emerald-400 rounded border border-emerald-800 font-bold flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" />
                            AUTHORIZED
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                          ID: {person.id.slice(0, 14)} • Registered {new Date(person.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleRemovePerson(person.id)}
                      className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 rounded transition-all"
                      title="Remove Authorized Person"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-[#1f293d] text-[11px] text-slate-500 font-mono flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Cloud className="w-3.5 h-3.5 text-blue-400" />
              STORAGE: {isCloudSynced ? 'FIRESTORE + LOCAL' : 'BROWSER-LOCAL'}
            </span>
            <span>EMBEDDING: 128D VECTOR</span>
          </div>
        </div>
      </div>


    </div>
  );
};
