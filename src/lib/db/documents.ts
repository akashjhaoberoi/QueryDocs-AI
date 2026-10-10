import { createAdminClient } from './supabase-admin';
import fs from 'fs';
import path from 'path';

export interface DocumentRecord {
  id: string;
  user_id: string;
  file_name: string;
  file_url: string;
  file_size: number;
  page_count: number;
  processing_status: 'uploading' | 'processing' | 'extracting' | 'ocr' | 'embedding' | 'indexed' | 'failed';
  ocr_used: boolean;
  error_message?: string | null;
  created_at: string;
  updated_at: string;
}

export interface DocumentPageRecord {
  id: string;
  document_id: string;
  page_number: number;
  extracted_text: string;
  is_ocr: boolean;
  confidence: number;
  created_at: string;
}

// Persistent disk cache directory
const CACHE_DIR = path.join(process.cwd(), '.rag_cache');
const DOCS_FILE = path.join(CACHE_DIR, 'documents.json');
const PAGES_FILE = path.join(CACHE_DIR, 'pages.json');

function ensureCacheDir() {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
}

function loadDiskDocs(): DocumentRecord[] {
  try {
    ensureCacheDir();
    if (fs.existsSync(DOCS_FILE)) {
      const content = fs.readFileSync(DOCS_FILE, 'utf-8');
      return JSON.parse(content);
    }
  } catch (e) {
    console.warn('Error reading docs cache:', e);
  }
  return [];
}

function saveDiskDocs(docs: DocumentRecord[]) {
  try {
    ensureCacheDir();
    fs.writeFileSync(DOCS_FILE, JSON.stringify(docs, null, 2), 'utf-8');
  } catch (e) {
    console.warn('Error saving docs cache:', e);
  }
}

function loadDiskPages(): DocumentPageRecord[] {
  try {
    ensureCacheDir();
    if (fs.existsSync(PAGES_FILE)) {
      const content = fs.readFileSync(PAGES_FILE, 'utf-8');
      return JSON.parse(content);
    }
  } catch (e) {
    console.warn('Error reading pages cache:', e);
  }
  return [];
}

function saveDiskPages(pages: DocumentPageRecord[]) {
  try {
    ensureCacheDir();
    fs.writeFileSync(PAGES_FILE, JSON.stringify(pages, null, 2), 'utf-8');
  } catch (e) {
    console.warn('Error saving pages cache:', e);
  }
}

export async function createDocumentRecord(doc: Omit<DocumentRecord, 'id' | 'created_at' | 'updated_at'>): Promise<DocumentRecord> {
  let createdDoc: DocumentRecord;

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('documents')
      .insert({
        user_id: doc.user_id,
        file_name: doc.file_name,
        file_url: doc.file_url,
        file_size: doc.file_size,
        page_count: doc.page_count,
        processing_status: doc.processing_status,
        ocr_used: doc.ocr_used,
        error_message: doc.error_message || null
      })
      .select()
      .single();

    if (!error && data) {
      createdDoc = data as DocumentRecord;
    } else {
      createdDoc = {
        ...doc,
        id: `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }
  } catch {
    createdDoc = {
      ...doc,
      id: `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  // Save to persistent disk cache
  const diskDocs = loadDiskDocs().filter((d) => d.id !== createdDoc.id);
  diskDocs.push(createdDoc);
  saveDiskDocs(diskDocs);

  return createdDoc;
}

export async function updateDocumentStatus(
  id: string, 
  status: DocumentRecord['processing_status'], 
  updates: Partial<DocumentRecord> = {}
) {
  try {
    const supabase = createAdminClient();
    await supabase
      .from('documents')
      .update({
        processing_status: status,
        updated_at: new Date().toISOString(),
        ...updates
      })
      .eq('id', id);
  } catch (e) {
    console.warn('DB status update error:', e);
  }

  const diskDocs = loadDiskDocs();
  const index = diskDocs.findIndex((d) => d.id === id);
  if (index !== -1) {
    diskDocs[index] = {
      ...diskDocs[index],
      processing_status: status,
      ...updates,
      updated_at: new Date().toISOString(),
    };
    saveDiskDocs(diskDocs);
  }
}

export async function saveDocumentPages(pages: Array<Omit<DocumentPageRecord, 'id' | 'created_at'>>) {
  if (!pages.length) return;
  try {
    const supabase = createAdminClient();
    await supabase.from('document_pages').insert(pages);
  } catch (e) {
    console.warn('DB saving pages error:', e);
  }

  const docId = pages[0].document_id;
  const existingPages = loadDiskPages().filter((p) => p.document_id !== docId);
  const newPages: DocumentPageRecord[] = pages.map((p, idx) => ({
    ...p,
    id: `page_${docId}_${idx + 1}`,
    created_at: new Date().toISOString(),
  }));
  saveDiskPages([...existingPages, ...newPages]);
}

export async function getDocumentById(id: string, userId: string): Promise<DocumentRecord | null> {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase.from('documents').select('*').eq('id', id).single();
    if (data && (data.user_id === userId || userId === 'admin')) return data as DocumentRecord;
  } catch (e) {
    console.warn('DB document lookup error:', e);
  }

  const diskDocs = loadDiskDocs();
  const found = diskDocs.find((d) => d.id === id);
  if (found && (found.user_id === userId || userId === 'admin')) return found;
  return null;
}

export async function getUserDocuments(userId: string): Promise<DocumentRecord[]> {
  try {
    const supabase = createAdminClient();
    const query = supabase.from('documents').select('*').order('created_at', { ascending: false });
    if (userId !== 'admin') {
      query.eq('user_id', userId);
    }
    const { data, error } = await query;
    if (!error && data && data.length > 0) {
      return data as DocumentRecord[];
    }
  } catch (e) {
    console.warn('DB documents list error:', e);
  }

  const diskDocs = loadDiskDocs();
  const filtered = diskDocs.filter((d) => d.user_id === userId || userId === 'admin');
  return filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export async function deleteDocument(id: string, userId: string): Promise<boolean> {
  try {
    const supabase = createAdminClient();
    await supabase.from('documents').delete().eq('id', id).eq('user_id', userId);
    await supabase.from('document_chunks').delete().eq('document_id', id);
    await supabase.from('document_pages').delete().eq('document_id', id);
  } catch (e) {
    console.warn('DB delete document error:', e);
  }

  const diskDocs = loadDiskDocs().filter((d) => d.id !== id);
  saveDiskDocs(diskDocs);

  const diskPages = loadDiskPages().filter((p) => p.document_id !== id);
  saveDiskPages(diskPages);

  return true;
}
