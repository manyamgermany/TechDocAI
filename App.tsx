


import React, { useState, useCallback, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import DocumentGenerator from './components/DocumentGenerator';
import Header from './components/Header';
import type { StoredDocument, GeneratedDocument, AppError, DocumentVersion } from './types';
import { getStoredDocuments, saveDocument, deleteDocument } from './services/localStorageManager';
import { XCircleIcon, WarningIcon } from './components/Icons';
import { getCurrentUser } from './services/mockData';

// A simple error banner component
const ErrorBanner: React.FC<{ error: AppError; onDismiss: (id: number) => void }> = ({ error, onDismiss }) => (
    <div role="alert" className="w-full max-w-sm p-4 rounded-lg shadow-2xl bg-card border border-destructive/50 text-foreground backdrop-blur-sm animate-fade-in">
        <div className="flex items-start">
            <div className="flex-shrink-0">
                <WarningIcon className="h-6 w-6 text-destructive" />
            </div>
            <div className="ml-3 w-0 flex-1">
                <p className="text-sm font-medium text-destructive">
                    An error occurred
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                    {error.message}
                </p>
            </div>
            <div className="ml-4 flex-shrink-0 flex">
                <button
                    onClick={() => onDismiss(error.id)}
                    className="inline-flex p-1 rounded-md text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-card focus:ring-ring"
                >
                    <span className="sr-only">Dismiss</span>
                    <XCircleIcon className="h-5 w-5" />
                </button>
            </div>
        </div>
    </div>
);


const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<'dashboard' | 'generator'>('dashboard');
  const [activeDocument, setActiveDocument] = useState<StoredDocument | null>(null);
  const [allDocuments, setAllDocuments] = useState<StoredDocument[]>([]);
  const [appErrors, setAppErrors] = useState<AppError[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const addAppError = useCallback((message: string) => {
    const newError: AppError = { message, id: Date.now() };
    setAppErrors(prev => [...prev.filter(e => e.message !== message), newError]); // Avoid duplicate messages
    
    const dismissAppError = (id: number) => {
        setAppErrors(prev => prev.filter(e => e.id !== id));
    };

    // Auto-dismiss after 10 seconds
    setTimeout(() => {
        dismissAppError(newError.id);
    }, 10000);
  }, []);
  
  const loadDocuments = useCallback(() => {
    try {
        setAllDocuments(getStoredDocuments());
    } catch (e) {
        if (e instanceof Error) addAppError(e.message);
        setAllDocuments([]); // Reset to empty on error
    }
  }, [addAppError]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const handleStartGeneration = useCallback(() => {
    setActiveDocument(null);
    setCurrentView('generator');
  }, []);

  const handleGenerationComplete = useCallback((document: GeneratedDocument) => {
    try {
        const now = new Date().toISOString();
        const currentUser = getCurrentUser();

        const firstVersion: DocumentVersion = {
            ...document,
            savedAt: now,
            savedBy: currentUser.id,
        };

        const newDoc: StoredDocument = {
            id: `doc_${Date.now()}`,
            createdAt: now,
            versions: [firstVersion]
        };

        saveDocument(newDoc);
        // Add to the top of the list
        setAllDocuments(prevDocs => [newDoc, ...prevDocs.filter(d => d.id !== newDoc.id)]);
        setActiveDocument(newDoc);
    } catch (e) {
        if (e instanceof Error) addAppError(e.message);
    }
  }, [addAppError]);
  
  const handleBackToDashboard = useCallback(() => {
    setCurrentView('dashboard');
    setActiveDocument(null);
    loadDocuments(); // Reload documents to reflect any edits
  }, [loadDocuments]);

  const handleOpenDocument = useCallback((docId: string) => {
    const docToOpen = allDocuments.find(d => d.id === docId);
    if (docToOpen) {
      setActiveDocument(docToOpen);
      setCurrentView('generator');
    }
  }, [allDocuments]);

  const handleDeleteDocument = useCallback((docId: string) => {
    if (window.confirm('Are you sure you want to delete this document? This action cannot be undone.')) {
      try {
        deleteDocument(docId);
        setAllDocuments(prevDocs => prevDocs.filter(d => d.id !== docId));
      } catch (e) {
         if (e instanceof Error) addAppError(e.message);
      }
    }
  }, [addAppError]);


  return (
    <div className="min-h-screen font-sans bg-background text-foreground">
      <Header
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        isDashboardVisible={currentView === 'dashboard'}
      />
      <div className="fixed top-20 right-4 z-50 flex flex-col gap-y-2">
         {appErrors.map(error => (
            <ErrorBanner key={error.id} error={error} onDismiss={(id) => setAppErrors(prev => prev.filter(e => e.id !== id))} />
        ))}
      </div>
      <main className="container mx-auto px-4 py-8">
        {currentView === 'dashboard' && (
          <Dashboard 
            onStartGeneration={handleStartGeneration} 
            recentDocuments={allDocuments}
            onOpenDocument={handleOpenDocument}
            onDeleteDocument={handleDeleteDocument}
            searchQuery={searchQuery}
            addAppError={addAppError}
          />
        )}
        {currentView === 'generator' && (
          <DocumentGenerator
            onGenerationComplete={handleGenerationComplete}
            generatedDocument={activeDocument}
            onBackToDashboard={handleBackToDashboard}
            onStartNewGeneration={handleStartGeneration}
            addAppError={addAppError}
          />
        )}
      </main>
    </div>
  );
};

export default App;