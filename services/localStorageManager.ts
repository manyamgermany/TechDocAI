import type { StoredDocument, KnowledgeFile, DocumentVersion } from '../types';

const STORAGE_KEY = 'techDocAiDocuments';
const KNOWLEDGE_BASE_KEY = 'techDocAiKnowledgeBase';

// Helper function to check if a document is in the old format and migrate it
const migrateDocument = (doc: any): StoredDocument => {
    if ('versions' in doc && Array.isArray(doc.versions)) {
        return doc as StoredDocument;
    }
    // This is an old format document
    const firstVersion: DocumentVersion = {
        title: doc.title,
        sections: doc.sections,
        docType: doc.docType,
        contextFileNames: doc.contextFileNames,
        savedAt: doc.createdAt,
        savedBy: doc.lastModifiedBy,
    };
    return {
        id: doc.id,
        createdAt: doc.createdAt,
        versions: [firstVersion],
        sharedWith: doc.sharedWith,
    };
};


export const getStoredDocuments = (): StoredDocument[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const docs = (JSON.parse(stored) as any[]).map(migrateDocument);
      // Sort by date of the latest version, newest first
      return docs.sort((a, b) => {
        const lastVersionA = a.versions[a.versions.length - 1]?.savedAt || a.createdAt;
        const lastVersionB = b.versions[b.versions.length - 1]?.savedAt || b.createdAt;
        return new Date(lastVersionB).getTime() - new Date(lastVersionA).getTime();
      });
    }
  } catch (error) {
    console.error("Failed to retrieve or parse documents from local storage:", error);
    localStorage.removeItem(STORAGE_KEY);
    throw new Error("Could not load documents from local storage. The data might be corrupted and has been cleared.");
  }
  return [];
};

export const saveDocument = (doc: StoredDocument): void => {
  try {
    const existingDocs = getStoredDocuments();
    // Ensure the document being saved has at least one version
    if (!doc.versions || doc.versions.length === 0) {
        throw new Error("Cannot save a document with no versions.");
    }
    const newDocs = [doc, ...existingDocs.filter(d => d.id !== doc.id)];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newDocs));
  } catch (error: any) {
    console.error("Failed to save document to local storage:", error);
    if (error.name === 'QuotaExceededError') {
      throw new Error('Local storage is full. Please remove some documents to save new ones.');
    }
    throw new Error('An unexpected error occurred while saving the document.');
  }
};

export const deleteDocument = (docId: string): void => {
  try {
    const existingDocs = getStoredDocuments();
    const newDocs = existingDocs.filter(d => d.id !== docId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newDocs));
  } catch (error) {
    console.error("Failed to delete document from local storage:", error);
    throw new Error('An unexpected error occurred while deleting the document.');
  }
};

export const getKnowledgeFiles = (): KnowledgeFile[] => {
  try {
    const stored = localStorage.getItem(KNOWLEDGE_BASE_KEY);
    if (stored) {
      const files = JSON.parse(stored) as KnowledgeFile[];
      // Sort by date, newest first
      return files.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
  } catch (error) {
    console.error("Failed to retrieve or parse knowledge files from local storage:", error);
    localStorage.removeItem(KNOWLEDGE_BASE_KEY);
    throw new Error("Could not load knowledge files from local storage. The data might be corrupted and has been cleared.");
  }
  return [];
};

export const saveKnowledgeFile = (file: KnowledgeFile): void => {
  try {
    const existingFiles = getKnowledgeFiles();
    const newFiles = [file, ...existingFiles.filter(f => f.id !== file.id)];
    localStorage.setItem(KNOWLEDGE_BASE_KEY, JSON.stringify(newFiles));
  } catch (error: any) {
    console.error("Failed to save knowledge file to local storage:", error);
    if (error.name === 'QuotaExceededError') {
      throw new Error('Local storage is full. Please remove some documents or knowledge files to save new ones.');
    }
    throw new Error('An unexpected error occurred while saving the knowledge file.');
  }
};

export const deleteKnowledgeFile = (fileId: string): void => {
  try {
    const existingFiles = getKnowledgeFiles();
    const newFiles = existingFiles.filter(f => f.id !== fileId);
    localStorage.setItem(KNOWLEDGE_BASE_KEY, JSON.stringify(newFiles));
  } catch (error) {
    console.error("Failed to delete knowledge file from local storage:", error);
    throw new Error('An unexpected error occurred while deleting the knowledge file.');
  }
};