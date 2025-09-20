





import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { PlusIcon, DocumentIcon, PaperclipIcon, TrashIcon, DatabaseIcon, UploadIcon, XCircleIcon, SpinnerIcon, EditIcon, SearchIcon } from './Icons';
import type { StoredDocument, KnowledgeFile } from '../types';
import { DocumentType } from '../types';
import { getKnowledgeFiles, saveKnowledgeFile, deleteKnowledgeFile } from '../services/localStorageManager';


declare global {
    interface Window {
        'pdfjs-dist/build/pdf': any;
    }
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};


const KnowledgeBaseModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  addAppError: (message: string) => void;
}> = ({ isOpen, onClose, addAppError }) => {
  const [files, setFiles] = useState<KnowledgeFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingFiles, setProcessingFiles] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredFiles = useMemo(() => {
    if (!searchTerm.trim()) return files;
    return files.filter(file => file.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [files, searchTerm]);

  const loadFiles = useCallback(() => {
    setIsLoading(true);
    try {
      setFiles(getKnowledgeFiles());
    } catch (e) {
      if (e instanceof Error) addAppError(e.message);
    } finally {
      setIsLoading(false);
    }
  }, [addAppError]);

  useEffect(() => {
    if (isOpen) {
      loadFiles();
      setSearchTerm('');
    }
  }, [isOpen, loadFiles]);
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (!selectedFiles) return;

    for (const file of Array.from(selectedFiles)) {
        setProcessingFiles(prev => new Set(prev).add(file.name));
        
        if (file.size > 1024 * 1024) { // 1MB limit
          addAppError(`File "${file.name}" exceeds the 1MB size limit.`);
          setProcessingFiles(prev => { const newSet = new Set(prev); newSet.delete(file.name); return newSet; });
          continue;
        }
        if (!file.type.startsWith('text/') && file.type !== 'application/pdf') {
          addAppError(`File "${file.name}" is not a supported text or PDF file.`);
          setProcessingFiles(prev => { const newSet = new Set(prev); newSet.delete(file.name); return newSet; });
          continue;
        }
        
        const saveNewFile = (content: string) => {
           const newFile: KnowledgeFile = {
                id: `file_${Date.now()}_${file.name}`,
                name: file.name,
                content,
                createdAt: new Date().toISOString(),
                size: file.size,
                type: file.type,
            };
            try {
                saveKnowledgeFile(newFile);
                setFiles(prev => [newFile, ...prev]);
            } catch (err) {
                if(err instanceof Error) addAppError(err.message);
            } finally {
                setProcessingFiles(prev => { const newSet = new Set(prev); newSet.delete(file.name); return newSet; });
            }
        };

        if (file.type.startsWith('text/')) {
            const reader = new FileReader();
            reader.onload = (e) => saveNewFile(e.target?.result as string);
            reader.onerror = () => {
                addAppError(`Failed to read file "${file.name}".`);
                setProcessingFiles(prev => { const newSet = new Set(prev); newSet.delete(file.name); return newSet; });
            };
            reader.readAsText(file);
        } else if (file.type === 'application/pdf') {
            const reader = new FileReader();
            reader.onload = async (e) => {
                const arrayBuffer = e.target?.result as ArrayBuffer;
                try {
                    const pdfjsLib = window['pdfjs-dist/build/pdf'];
                    if (!pdfjsLib) {
                        throw new Error("PDF processing library is not loaded.");
                    }
                    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs`;

                    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                    let fullText = '';
                    for (let i = 1; i <= pdf.numPages; i++) {
                        const page = await pdf.getPage(i);
                        const textContent = await page.getTextContent();
                        fullText += textContent.items.map((item: any) => item.str).join(' ') + '\n\n';
                    }
                    saveNewFile(fullText.trim());

                } catch (pdfError) {
                    if (pdfError instanceof Error) addAppError(`Failed to process PDF "${file.name}": ${pdfError.message}`);
                    setProcessingFiles(prev => { const newSet = new Set(prev); newSet.delete(file.name); return newSet; });
                }
            };
            reader.onerror = () => {
                addAppError(`Failed to read PDF file "${file.name}".`);
                setProcessingFiles(prev => { const newSet = new Set(prev); newSet.delete(file.name); return newSet; });
            }
            reader.readAsArrayBuffer(file);
        }
    }
    // Reset file input
    if(fileInputRef.current) fileInputRef.current.value = "";
  };
  
  const handleDelete = (fileId: string) => {
      if(window.confirm("Are you sure you want to delete this file from your knowledge base?")) {
          try {
              deleteKnowledgeFile(fileId);
              setFiles(prev => prev.filter(f => f.id !== fileId));
          } catch(err) {
              if(err instanceof Error) addAppError(err.message);
          }
      }
  };


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in" aria-modal="true" role="dialog" onClick={onClose}>
        <div className="bg-card border border-border rounded-lg shadow-2xl w-full max-w-2xl p-6 flex flex-col max-h-[80vh]" onClick={(e) => e.stopPropagation()}>
            <header className="flex items-center justify-between pb-4 border-b border-border">
              <h2 className="text-xl font-bold text-card-foreground">Knowledge Base</h2>
               <button onClick={onClose} aria-label="Close" className="p-1 text-muted-foreground hover:text-foreground rounded-full">
                  <XCircleIcon className="w-8 h-8"/>
               </button>
            </header>
            
            <div className="flex flex-col sm:flex-row gap-4 my-4">
              <div className="relative flex-grow">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none" aria-hidden="true">
                      <SearchIcon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <input
                      type="search"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="block w-full pl-10 pr-3 py-2 border border-input rounded-md leading-5 bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring sm:text-sm transition-colors"
                      placeholder="Search knowledge files..."
                      aria-label="Search knowledge files"
                  />
              </div>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".txt,text/plain,application/pdf" className="sr-only" id="kb-file-upload" multiple disabled={processingFiles.size > 0}/>
              <label htmlFor="kb-file-upload" className={`flex-shrink-0 flex items-center justify-center gap-2 bg-primary/10 text-primary font-semibold border-2 border-dashed border-primary/50 rounded-lg px-4 py-2 transition-colors ${processingFiles.size > 0 ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-primary/20'}`}>
                {processingFiles.size > 0 ? (
                  <>
                    <SpinnerIcon />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <UploadIcon className="w-5 h-5"/>
                    <span>Upload Files</span>
                  </>
                )}
              </label>
            </div>

            <div className="flex-grow overflow-y-auto pr-2 border-t border-border pt-2">
                {isLoading ? <p>Loading files...</p> : (
                    filteredFiles.length > 0 ? (
                        <ul className="divide-y divide-border">
                           {filteredFiles.map(file => (
                               <li key={file.id} className="py-3 flex items-center justify-between gap-4">
                                   <div className="flex items-center gap-3 min-w-0">
                                     <DocumentIcon className="w-6 h-6 text-muted-foreground flex-shrink-0"/>
                                     <div className="min-w-0">
                                         <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                                         <p className="text-sm text-muted-foreground">{formatFileSize(file.size)}</p>
                                     </div>
                                   </div>
                                   <button onClick={() => handleDelete(file.id)} aria-label={`Delete file ${file.name}`} className="p-1 text-muted-foreground hover:text-destructive rounded-full">
                                     <TrashIcon className="w-5 h-5" />
                                   </button>
                               </li>
                           ))}
                        </ul>
                    ) : (
                        <div className="text-center text-muted-foreground py-8">
                            <p>{files.length > 0 ? 'No files match your search.' : 'Your knowledge base is empty.'}</p>
                            <p className="mt-1 text-sm">{files.length === 0 && 'Upload text and PDF files to provide context for document generation.'}</p>
                        </div>
                    )
                )}
            </div>
        </div>
    </div>
  )
}

interface DashboardProps {
  onStartGeneration: () => void;
  recentDocuments: StoredDocument[];
  onOpenDocument: (docId: string) => void;
  onDeleteDocument: (docId: string) => void;
  searchQuery: string;
  addAppError: (message: string) => void;
}

const formatRelativeDate = (dateString: string): string => {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return "Invalid date";
    }
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

    if (diffInSeconds < 60) return rtf.format(-diffInSeconds, 'second');
    if (diffInSeconds < 3600) return rtf.format(-Math.floor(diffInSeconds / 60), 'minute');
    if (diffInSeconds < 86400) return rtf.format(-Math.floor(diffInSeconds / 3600), 'hour');
    if (diffInSeconds < 604800) return rtf.format(-Math.floor(diffInSeconds / 86400), 'day');
    
    return date.toLocaleDateString();
};

const fuzzySearchAndRank = (documents: StoredDocument[], query: string): StoredDocument[] => {
    if (!query.trim()) return [];

    const queryTokens = query.toLowerCase().split(' ').filter(t => t);

    const scoredDocuments = documents.map(doc => {
        let score = 0;
        const latestVersion = doc.versions[doc.versions.length - 1];
        if (!latestVersion) return { doc, score: 0 };

        const title = latestVersion.title.toLowerCase();
        const contextFiles = (latestVersion.contextFileNames || []).join(' ').toLowerCase();
        const docType = latestVersion.docType.toLowerCase();

        queryTokens.forEach(token => {
            // Title matches (highest weight)
            if (title.includes(token)) score += 10;
            if (title.split(' ').some(word => word.startsWith(token))) score += 5;

            // Context file matches
            if (contextFiles.includes(token)) score += 5;

            // Doc type matches
            if (docType.includes(token)) score += 3;
        });

        return { doc, score };
    });

    return scoredDocuments
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .map(item => item.doc);
};


const Dashboard: React.FC<DashboardProps> = ({ onStartGeneration, recentDocuments, onOpenDocument, onDeleteDocument, searchQuery, addAppError }) => {
  const [filterType, setFilterType] = useState<string>('ALL');
  const [dateFilter, setDateFilter] = useState<string>('any');
  const [sortOrder, setSortOrder] = useState<string>('date-desc');
  const [isKnowledgeModalOpen, setIsKnowledgeModalOpen] = useState(false);

  const validDocuments = recentDocuments.filter(doc => doc && doc.id && doc.versions && doc.versions.length > 0);
  
  const filteredAndSortedDocuments = useMemo(() => {
    let documents = [...validDocuments];
    const isSearching = searchQuery.trim() !== '';

    // If searching, use the fuzzy search algorithm
    if (isSearching) {
        documents = fuzzySearchAndRank(documents, searchQuery);
    }

    // Filter by document type
    if (filterType !== 'ALL') {
      documents = documents.filter(doc => doc.versions[doc.versions.length - 1]?.docType === filterType);
    }

    // Filter by date
    const now = new Date();
    switch (dateFilter) {
        case 'day':
            documents = documents.filter(doc => (now.getTime() - new Date(doc.createdAt).getTime()) < 24 * 3600 * 1000);
            break;
        case 'week':
            documents = documents.filter(doc => (now.getTime() - new Date(doc.createdAt).getTime()) < 7 * 24 * 3600 * 1000);
            break;
        case 'month':
             documents = documents.filter(doc => (now.getTime() - new Date(doc.createdAt).getTime()) < 30 * 24 * 3600 * 1000);
            break;
    }

    // Sort the documents only if not searching (search results are already sorted by relevance)
    if (!isSearching) {
        switch (sortOrder) {
        case 'date-asc':
            documents.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
            break;
        case 'title-asc':
            documents.sort((a, b) => (a.versions[a.versions.length - 1]?.title || '').localeCompare(b.versions[b.versions.length - 1]?.title || ''));
            break;
        case 'title-desc':
            documents.sort((a, b) => (b.versions[b.versions.length - 1]?.title || '').localeCompare(a.versions[a.versions.length - 1]?.title || ''));
            break;
        case 'date-desc':
        default:
            documents.sort((a, b) => new Date(b.versions[b.versions.length - 1]?.savedAt || b.createdAt).getTime() - new Date(a.versions[a.versions.length - 1]?.savedAt || a.createdAt).getTime());
            break;
        }
    }

    return documents;
  }, [validDocuments, filterType, sortOrder, searchQuery, dateFilter]);


  return (
    <div className="animate-fade-in">
      <div className="text-center mb-12">
        <h2 className="text-4xl font-extrabold text-foreground mb-3">Welcome to TechDocAI</h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">Your intelligent partner for creating professional technical documentation with ease.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-16">
        <button
          onClick={onStartGeneration}
          className="group bg-card p-8 rounded-lg border border-border text-left hover:border-primary hover:bg-accent transition-all duration-300 transform hover:-translate-y-1 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:ring-primary focus:outline-none"
        >
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary mb-4">
              <PlusIcon className="w-7 h-7" />
          </div>
          <h3 className="text-xl font-bold text-card-foreground mb-2">Create New Document</h3>
          <p className="text-muted-foreground">Start with a prompt and let our AI agents build a comprehensive technical document for you.</p>
        </button>
        <button
          onClick={() => setIsKnowledgeModalOpen(true)}
          className="group bg-card p-8 rounded-lg border border-border text-left hover:border-primary hover:bg-accent transition-all duration-300 transform hover:-translate-y-1 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:ring-primary focus:outline-none"
        >
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary mb-4">
              <DatabaseIcon className="w-7 h-7" />
          </div>
          <h3 className="text-xl font-bold text-card-foreground mb-2">Manage Knowledge Base</h3>
          <p className="text-muted-foreground">Upload and manage your context files (PDFs, text) to provide tailored knowledge for the AI.</p>
        </button>
      </div>


      <section className="max-w-4xl mx-auto" aria-labelledby="recent-docs-heading">
        <div className="flex justify-between items-center mb-2 flex-wrap gap-4">
          <h3 id="recent-docs-heading" className="text-2xl font-bold text-foreground">Recent Documents</h3>
          <div className="flex items-center gap-2 sm:gap-4">
              <div>
                  <label htmlFor="date-filter-select" className="sr-only">Filter by date</label>
                  <select
                      id="date-filter-select"
                      value={dateFilter}
                      onChange={(e) => setDateFilter(e.target.value)}
                      className="bg-background border border-input rounded-md py-2 pl-3 pr-8 text-sm text-foreground focus:ring-2 focus:ring-ring focus:outline-none transition"
                  >
                      <option value="any">Any time</option>
                      <option value="day">Past 24 hours</option>
                      <option value="week">Past week</option>
                      <option value="month">Past month</option>
                  </select>
              </div>
              <div>
                  <label htmlFor="filter-select" className="sr-only">Filter by type</label>
                  <select
                      id="filter-select"
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value)}
                      className="bg-background border border-input rounded-md py-2 pl-3 pr-8 text-sm text-foreground focus:ring-2 focus:ring-ring focus:outline-none transition"
                  >
                      <option value="ALL">All Types</option>
                      {Object.values(DocumentType).map(type => (
                          <option key={type} value={type}>{type}</option>
                      ))}
                  </select>
              </div>
              <div>
                  <label htmlFor="sort-select" className="sr-only">Sort by</label>
                  <select
                      id="sort-select"
                      value={sortOrder}
                      onChange={(e) => setSortOrder(e.target.value)}
                      disabled={!!searchQuery.trim()}
                      className="bg-background border border-input rounded-md py-2 pl-3 pr-8 text-sm text-foreground focus:ring-2 focus:ring-ring focus:outline-none transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                      <option value="date-desc">Date (Newest First)</option>
                      <option value="date-asc">Date (Oldest First)</option>
                      <option value="title-asc">Title (A-Z)</option>
                      <option value="title-desc">Title (Z-A)</option>
                  </select>
              </div>
          </div>
        </div>
        {searchQuery.trim() && <p className="text-sm text-muted-foreground text-right mb-4 -mt-2">Sorted by relevance</p>}
        
        {filteredAndSortedDocuments.length > 0 ? (
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredAndSortedDocuments.map(doc => {
                  const latestVersion = doc.versions[doc.versions.length - 1];
                  if (!latestVersion) return null;
                  return (
                      <div key={doc.id} className="group relative bg-card p-4 rounded-lg border border-border hover:border-primary/50 transition-all duration-200 flex flex-col justify-between">
                          <div>
                            <div className="flex items-center space-x-3 mb-2">
                                <DocumentIcon className="w-6 h-6 text-primary flex-shrink-0" />
                                <h4 className="font-semibold text-card-foreground truncate pr-16">{latestVersion.title}</h4>
                            </div>
                            <div className="flex items-center gap-x-3 text-sm text-muted-foreground pl-9">
                              <span className="flex-shrink-0 bg-secondary text-secondary-foreground px-2 py-0.5 rounded-md text-xs">{latestVersion.docType.split('-')[0]}</span>
                              <span>&middot;</span>
                              <span>{formatRelativeDate(latestVersion.savedAt)}</span>
                            </div>
                            {latestVersion.contextFileNames && latestVersion.contextFileNames.length > 0 && (
                                <div className="flex items-center gap-x-2 text-sm text-muted-foreground mt-2 pl-9" title={latestVersion.contextFileNames.join(', ')}>
                                  <PaperclipIcon className="w-4 h-4"/>
                                  <span className="truncate">{latestVersion.contextFileNames.length} context file(s)</span>
                                </div>
                            )}
                          </div>
                           <div className="absolute top-3 right-3 flex items-center gap-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <button onClick={() => onOpenDocument(doc.id)} aria-label={`Open document titled ${latestVersion.title}`} className="p-2 bg-secondary text-secondary-foreground rounded-full hover:bg-primary hover:text-primary-foreground focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-card focus-visible:ring-primary">
                                <EditIcon className="w-4 h-4" />
                            </button>
                            <button onClick={() => onDeleteDocument(doc.id)} aria-label={`Delete document titled ${latestVersion.title}`} className="p-2 bg-secondary text-secondary-foreground rounded-full hover:bg-destructive hover:text-destructive-foreground focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-card focus-visible:ring-destructive">
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          </div>
                      </div>
                  )
              })}
          </div>
        ) : (
          <div className="p-8 text-center text-muted-foreground bg-card border border-border rounded-lg min-h-[10rem] flex flex-col items-center justify-center">
            <p>{validDocuments.length > 0 ? 'No documents match the current filters.' : "You haven't created any documents yet."}</p>
            {validDocuments.length === 0 && <p className="mt-1">Click "Create New Document" to get started!</p>}
          </div>
        )}
      </section>
      <KnowledgeBaseModal isOpen={isKnowledgeModalOpen} onClose={() => setIsKnowledgeModalOpen(false)} addAppError={addAppError} />
    </div>
  );
};

export default Dashboard;