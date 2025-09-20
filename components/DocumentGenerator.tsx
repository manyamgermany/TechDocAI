import React, { useState, useEffect, useCallback, useRef, useContext } from 'react';
import type { Agent, GeneratedDocument, StoredDocument, DocumentSection, KnowledgeFile, Comment, ChatMessage } from '../types';
import { AgentStatus, DocumentType } from '../types';
import { generateDocument, modifyDocumentWithAgents } from '../services/geminiService';
import { saveDocument, getKnowledgeFiles } from '../services/localStorageManager';
import { ArrowLeftIcon, ChatBubbleLeftRightIcon, CheckCircleIcon, CheckIcon, ChevronDownIcon, ClipboardIcon, DatabaseIcon, DocumentDuplicateIcon, DownloadIcon, EditIcon, ListIcon, PaperclipIcon, PlusIcon, QuestionMarkCircleIcon, SparklesIcon, SpinnerIcon, TrashIcon, WandIcon, WarningIcon, XCircleIcon } from './Icons';
import MarkdownRenderer from './MarkdownRenderer';
import MermaidEditorModal from './MermaidEditorModal';
import { ThemeContext } from '../index';
import CommentsSidebar from './CommentsSidebar';
import { getCurrentUser } from '../services/mockData';
import AgentChatPanel from './AgentChatPanel';

const initialAgents: Agent[] = [
  { id: 'csa', name: 'Chief Solution Architect', role: 'Strategic Vision & Alignment', status: AgentStatus.PENDING },
  { id: 'esa', name: 'Enterprise Architect', role: 'Multi-Cloud & Integration Strategy', status: AgentStatus.PENDING },
  { id: 'cia', name: 'Cloud Infrastructure Architect', role: 'Cloud-Native Services Design', status: AgentStatus.PENDING },
  { id: 'aa', name: 'Application Architect', role: 'Microservices & API Design', status: AgentStatus.PENDING },
  { id: 'sa', name: 'Security Architect', role: 'Cybersecurity & Compliance', status: AgentStatus.PENDING },
  { id: 'da', name: 'Data Architect', role: 'Big Data & Analytics Platforms', status: AgentStatus.PENDING },
  { id: 'qa', name: 'QA Architect', role: 'Test Automation & Quality Strategy', status: AgentStatus.PENDING },
];

const ContextSelectorModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSave: (selectedFiles: KnowledgeFile[]) => void;
  addAppError: (message: string) => void;
  initiallySelectedFiles: KnowledgeFile[];
}> = ({ isOpen, onClose, onSave, addAppError, initiallySelectedFiles }) => {
  const [availableFiles, setAvailableFiles] = useState<KnowledgeFile[]>([]);
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(() => new Set(initiallySelectedFiles.map(f => f.id)));

  useEffect(() => {
    if (isOpen) {
      try {
        setAvailableFiles(getKnowledgeFiles());
        setSelectedFileIds(new Set(initiallySelectedFiles.map(f => f.id)));
      } catch (e) {
        if (e instanceof Error) addAppError(e.message);
      }
    }
  }, [isOpen, addAppError, initiallySelectedFiles]);

  const handleToggleSelection = (fileId: string) => {
    setSelectedFileIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(fileId)) {
        newSet.delete(fileId);
      } else {
        newSet.add(fileId);
      }
      return newSet;
    });
  };

  const handleSave = () => {
    const selectedFiles = availableFiles.filter(f => selectedFileIds.has(f.id));
    onSave(selectedFiles);
    onClose();
  };

  if (!isOpen) return null;

  return (
     <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in" aria-modal="true" role="dialog" onClick={onClose}>
        <div className="bg-card border border-border rounded-lg shadow-2xl w-full max-w-xl p-6 flex flex-col max-h-[70vh]" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-card-foreground mb-4">Select Context Files</h2>
            <div className="flex-grow overflow-y-auto border-y border-border -mx-6 px-6 py-2">
                {availableFiles.length > 0 ? (
                    <ul className="space-y-2">
                       {availableFiles.map(file => (
                           <li key={file.id}>
                               <label className="flex items-center p-3 rounded-md hover:bg-accent cursor-pointer transition-colors">
                                   <input
                                       type="checkbox"
                                       checked={selectedFileIds.has(file.id)}
                                       onChange={() => handleToggleSelection(file.id)}
                                       className="h-4 w-4 rounded border-border text-primary focus:ring-ring"
                                   />
                                   <span className="ml-3 text-sm font-medium text-foreground">{file.name}</span>
                               </label>
                           </li>
                       ))}
                    </ul>
                ) : (
                    <p className="text-center text-muted-foreground py-6">No files in your Knowledge Base. Add files from the dashboard.</p>
                )}
            </div>
             <div className="mt-5 sm:mt-4 flex justify-end gap-3">
                <button type="button" onClick={onClose} className="bg-secondary hover:bg-secondary/80 text-secondary-foreground font-bold py-2 px-4 rounded-lg transition-colors">Cancel</button>
                <button type="button" onClick={handleSave} className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-2 px-4 rounded-lg transition-colors">Save Selection</button>
            </div>
        </div>
    </div>
  );
};


interface DocumentGeneratorProps {
  onGenerationComplete: (document: GeneratedDocument) => void;
  generatedDocument: StoredDocument | null;
  onBackToDashboard: () => void;
  onStartNewGeneration: () => void;
  addAppError: (message: string) => void;
}

const DocumentGenerator: React.FC<DocumentGeneratorProps> = ({ onGenerationComplete, generatedDocument, onBackToDashboard, onStartNewGeneration, addAppError }) => {
  const [userInput, setUserInput] = useState<string>('');
  const [docType, setDocType] = useState<DocumentType>(DocumentType.HLD);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [agents, setAgents] = useState<Agent[]>(initialAgents);
  const [selectedContextFiles, setSelectedContextFiles] = useState<KnowledgeFile[]>([]);
  const [isContextSelectorOpen, setIsContextSelectorOpen] = useState(false);

  const handleGenerate = async () => {
    if (!userInput.trim()) {
      setError('Please provide a description for the document.');
      return;
    }
    
    setIsGenerating(true);
    setError(null);
    setAgents(initialAgents); // Reset agents to initial state

    let agentIndex = 0;
    const interval = setInterval(() => {
      setAgents(prev => prev.map((agent, i) => 
        i === agentIndex ? { ...agent, status: AgentStatus.RUNNING } : agent
      ));

      if(agentIndex > 0) {
        setAgents(prev => prev.map((agent, i) => 
          i === agentIndex - 1 ? { ...agent, status: AgentStatus.COMPLETED } : agent
        ));
      }

      agentIndex++;
      if (agentIndex > agents.length) {
        clearInterval(interval);
      }
    }, 700);

    try {
      const contextContent = selectedContextFiles.map(file => `--- START OF FILE: ${file.name} ---\n${file.content}\n--- END OF FILE: ${file.name} ---`).join('\n\n');
      const doc = await generateDocument(userInput, docType, contextContent || null);
      onGenerationComplete({
        ...doc,
        contextFileNames: selectedContextFiles.map(f => f.name)
      });
      setAgents(prev => prev.map(agent => ({ ...agent, status: AgentStatus.COMPLETED })));
    } catch (e) {
      console.error(e);
      const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
      setError(`Failed to generate document: ${errorMessage}`);
      addAppError(`Failed to generate document: ${errorMessage}`);
      setAgents(prev => prev.map(agent => (agent.status === AgentStatus.RUNNING ? { ...agent, status: AgentStatus.FAILED } : agent)));
    } finally {
      clearInterval(interval);
      setIsGenerating(false);
    }
  };

  if (generatedDocument) {
    return <DocumentViewer doc={generatedDocument} onBackToDashboard={onBackToDashboard} onStartNewGeneration={onStartNewGeneration} addAppError={addAppError} />;
  }

  return (
    <div className="animate-fade-in max-w-5xl mx-auto">
       <ContextSelectorModal
          isOpen={isContextSelectorOpen}
          onClose={() => setIsContextSelectorOpen(false)}
          onSave={setSelectedContextFiles}
          addAppError={addAppError}
          initiallySelectedFiles={selectedContextFiles}
       />
      <button onClick={onBackToDashboard} className="flex items-center space-x-2 text-primary hover:underline mb-6 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:ring-primary rounded-sm">
        <ArrowLeftIcon className="w-5 h-5" />
        <span>Back to Dashboard</span>
      </button>
      
      <h2 className="text-3xl font-bold text-foreground mb-2">Create a New Technical Document</h2>
      <p id="description-label" className="text-muted-foreground mb-8">Describe the system, application, or architecture you need to document. Be as specific as possible.</p>

      <div className="bg-card p-6 rounded-lg border border-border">
        <div className="mb-4">
          <label htmlFor="doc-type-selector" className="block text-sm font-medium text-foreground mb-2">Document Type</label>
           <select
            id="doc-type-selector"
            value={docType}
            onChange={(e) => setDocType(e.target.value as DocumentType)}
            disabled={isGenerating}
            className={`w-full bg-background border border-input rounded-md p-2 text-foreground focus:ring-2 focus:ring-ring focus:outline-none transition ${isGenerating ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {Object.values(DocumentType).map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
        
        <div>
          <label htmlFor="user-input" className="sr-only">Document Description</label>
          <textarea
            id="user-input"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            aria-labelledby="description-label"
            placeholder="e.g., 'A high-level design for a scalable e-commerce platform using a microservices architecture on AWS...'"
            className="w-full h-40 bg-background border border-input rounded-md p-4 text-foreground focus:ring-2 focus:ring-ring focus:outline-none transition"
            disabled={isGenerating}
          />
        </div>

        <div className="mt-4">
           <p className="block text-sm font-medium text-foreground mb-2">Context (Optional)</p>
           <div className="bg-secondary/50 p-3 rounded-md min-h-[4rem]">
              <div className="flex flex-wrap gap-2 mb-2">
                {selectedContextFiles.map(file => (
                  <span key={file.id} className="flex items-center gap-x-2 bg-primary/20 text-primary-foreground text-sm font-medium px-2 py-1 rounded">
                    {file.name}
                    <button onClick={() => setSelectedContextFiles(prev => prev.filter(f => f.id !== file.id))} disabled={isGenerating} className="text-primary-foreground/70 hover:text-primary-foreground">
                      <XCircleIcon className="w-4 h-4" />
                    </button>
                  </span>
                ))}
              </div>
              <button onClick={() => setIsContextSelectorOpen(true)} disabled={isGenerating} className="flex items-center gap-2 text-sm text-primary hover:underline">
                <DatabaseIcon className="w-5 h-5" />
                <span>{selectedContextFiles.length > 0 ? "Edit selection" : "Select files from Knowledge Base"}</span>
              </button>
           </div>
        </div>
        
        {error && (
            <div role="alert" className="mt-4 flex items-center space-x-2 text-destructive-foreground bg-destructive/20 p-3 rounded-md">
                <WarningIcon className="w-5 h-5"/>
                <p>{error}</p>
            </div>
        )}

        <div className="mt-6 flex justify-end">
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="flex items-center space-x-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3 px-6 rounded-lg transition-all duration-300 disabled:bg-muted disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-card focus-visible:ring-primary"
          >
            {isGenerating ? <SpinnerIcon /> : <SparklesIcon className="w-5 h-5" />}
            <span>{isGenerating ? 'Generating...' : 'Generate Document'}</span>
          </button>
        </div>
      </div>
      
      {isGenerating && <AgentProgressView agents={agents} />}
    </div>
  );
};

// ---UNCHANGED COMPONENTS START HERE ---

const AgentProgressView: React.FC<{ agents: Agent[] }> = ({ agents }) => (
  <section className="mt-10" aria-live="polite" aria-atomic="true">
    <h3 className="text-2xl font-bold text-foreground mb-6 text-center">AI Agents at Work...</h3>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {agents.map(agent => (
        <div key={agent.id} className="bg-card p-4 rounded-lg border border-border flex items-start space-x-4">
          <div className="flex-shrink-0 pt-1" aria-hidden="true">
            {agent.status === AgentStatus.PENDING && <div className="w-5 h-5 rounded-full border-2 border-muted-foreground"></div>}
            {agent.status === AgentStatus.RUNNING && <SpinnerIcon className="text-primary" />}
            {agent.status === AgentStatus.COMPLETED && <CheckCircleIcon className="w-6 h-6 text-green-500" />}
            {agent.status === AgentStatus.FAILED && <XCircleIcon className="w-6 h-6 text-destructive" />}
          </div>
          <div>
            <p className="font-semibold text-card-foreground">{agent.name}</p>
            <p className="text-sm text-muted-foreground">{agent.role}</p>
          </div>
          <span className="sr-only">Status: {agent.status}</span>
        </div>
      ))}
    </div>
  </section>
);

interface DocumentViewerProps {
  doc: StoredDocument;
  onBackToDashboard: () => void;
  onStartNewGeneration: () => void;
  addAppError: (message: string) => void;
}

const EditableSection: React.FC<{
  section: DocumentSection;
  isEditing: boolean;
  onTitleChange: (newTitle: string) => void;
  onContentChange: (newContent: string) => void;
  theme: 'light' | 'dark';
  onEditMermaid: (mermaidCode: string, blockIndex: number) => void;
  onCopyMermaid: (mermaidCode: string, blockIndex: number) => void;
  copiedBlock: number | null;
  sectionId: string;
  onOpenComments: () => void;
}> = ({ section, isEditing, onTitleChange, onContentChange, theme, onEditMermaid, onCopyMermaid, copiedBlock, sectionId, onOpenComments }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [section.content, isEditing]);
  
  const commentButton = (
    <button
      onClick={onOpenComments}
      className="absolute -left-12 top-2 z-10 p-2 rounded-full text-muted-foreground hover:bg-accent hover:text-accent-foreground opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
      aria-label={`View comments on ${section.title}`}
    >
      <ChatBubbleLeftRightIcon className="w-5 h-5" />
      {section.comments && section.comments.length > 0 && (
        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
          {section.comments.length}
        </span>
      )}
    </button>
  );

  if (isEditing) {
    return (
      <section aria-labelledby={sectionId} className="relative group">
        {commentButton}
        <label htmlFor={sectionId} className="sr-only">Section Title</label>
        <input
          id={sectionId}
          value={section.title}
          onChange={(e) => onTitleChange(e.target.value)}
          className="text-2xl font-bold text-primary mb-4 bg-transparent w-full border-b-2 border-border focus:border-primary focus:outline-none transition-colors p-2"
          aria-label="Section title"
        />
        <label htmlFor={`${sectionId}-content`} className="sr-only">Section Content</label>
        <textarea
          ref={textareaRef}
          id={`${sectionId}-content`}
          value={section.content}
          onChange={(e) => onContentChange(e.target.value)}
          className="prose dark:prose-invert max-w-none w-full h-auto bg-background/50 border border-input rounded-md p-4 text-foreground focus:ring-2 focus:ring-ring focus:outline-none transition-colors resize-none overflow-hidden leading-relaxed"
          aria-label="Section content"
        />
      </section>
    );
  }

  return (
    <section aria-labelledby={sectionId} className="relative group">
      {commentButton}
      <h2 id={sectionId} className="text-2xl font-bold text-primary mb-4">{section.title}</h2>
      <MarkdownRenderer
        content={section.content}
        theme={theme}
        onEditMermaid={onEditMermaid}
        onCopyMermaid={onCopyMermaid}
        copiedBlock={copiedBlock}
      />
    </section>
  );
};

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  icon?: React.ReactNode;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ isOpen, onClose, onConfirm, title, description, confirmText = "Confirm", icon }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in" aria-modal="true" role="dialog" onClick={onClose}>
            <div className="bg-card border border-border rounded-lg shadow-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-start">
                    <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-primary/10 sm:mx-0 sm:h-10 sm:w-10">
                        {icon || <QuestionMarkCircleIcon className="h-6 w-6 text-primary" />}
                    </div>
                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                        <h3 className="text-lg leading-6 font-medium text-card-foreground" id="modal-title">{title}</h3>
                        <div className="mt-2">
                            <p className="text-sm text-muted-foreground">{description}</p>
                        </div>
                    </div>
                </div>
                <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse gap-3">
                    <button
                        type="button"
                        className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary text-base font-medium text-primary-foreground hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-card focus:ring-primary sm:w-auto sm:text-sm"
                        onClick={() => { onConfirm(); onClose(); }}
                    >
                        {confirmText}
                    </button>
                    <button
                        type="button"
                        className="mt-3 w-full inline-flex justify-center rounded-md border border-input shadow-sm px-4 py-2 bg-background text-base font-medium text-foreground hover:bg-accent focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-card focus:ring-ring sm:mt-0 sm:w-auto sm:text-sm"
                        onClick={onClose}
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

const DocumentOutline: React.FC<{
  sections: DocumentSection[];
  activeSectionId: string | null;
  onNavigate: (sectionId: string) => void;
}> = ({ sections, activeSectionId, onNavigate }) => {
  return (
    <nav className="w-full" aria-labelledby="document-outline-heading">
        <h3 id="document-outline-heading" className="text-lg font-semibold text-foreground mb-3 pl-2">
          On this page
        </h3>
        <ul className="space-y-1">
          {sections.map((section, index) => {
            const sectionId = `section-title-${index}`;
            const isActive = activeSectionId === sectionId;
            return (
              <li key={sectionId}>
                <a
                  href={`#${sectionId}`}
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigate(sectionId);
                  }}
                  className={`block text-sm transition-all duration-200 py-1 rounded-md ${
                    isActive
                      ? 'font-semibold text-primary bg-primary/10 border-l-4 border-primary pl-4'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent border-l-4 border-transparent pl-4'
                  }`}
                >
                  {section.title || 'Untitled Section'}
                </a>
              </li>
            );
          })}
        </ul>
    </nav>
  );
};


const DocumentViewer: React.FC<DocumentViewerProps> = ({ doc, onBackToDashboard, onStartNewGeneration, addAppError }) => {
  const [editableDoc, setEditableDoc] = useState<StoredDocument>(doc);
  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const [editorState, setEditorState] = useState<{
    isOpen: boolean;
    sectionIndex: number | null;
    blockIndex: number | null;
    initialCode: string | null;
  }>({ isOpen: false, sectionIndex: null, blockIndex: null, initialCode: null });
  const [copiedBlock, setCopiedBlock] = useState<{ sectionIndex: number; blockIndex: number } | null>(null);
  const themeContext = useContext(ThemeContext);
  const theme = themeContext?.theme || 'dark';

  // FIX: Document content (title, sections, etc.) is stored in versions. We'll work with the latest version.
  const latestVersion = editableDoc.versions.length > 0 ? editableDoc.versions[editableDoc.versions.length - 1] : null;

  const [confirmationState, setConfirmationState] = useState<{
        isOpen: boolean;
        title: string;
        description: string;
        onConfirm: (() => void) | null;
        confirmText: string;
        icon?: React.ReactNode;
    }>({ isOpen: false, title: '', description: '', onConfirm: null, confirmText: 'Confirm', icon: null });

  const [isOutlineVisible, setIsOutlineVisible] = useState(false);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const [commentsState, setCommentsState] = useState<{
    isOpen: boolean;
    sectionIndex: number | null;
  }>({ isOpen: false, sectionIndex: null });
  
  const [isChatPanelOpen, setIsChatPanelOpen] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isAgentReplying, setIsAgentReplying] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 1024px)');
    setIsOutlineVisible(mediaQuery.matches);
    
    const handleChange = (e: MediaQueryListEvent) => setIsOutlineVisible(e.matches);
    mediaQuery.addEventListener('change', handleChange);
    
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    if (observerRef.current) {
        observerRef.current.disconnect();
    }
    
    // FIX: Access sections from the latest version.
    const sectionHeadings = (latestVersion?.sections || [])
      .map((_, index) => document.getElementById(`section-title-${index}`))
      .filter((el): el is HTMLElement => el !== null);

    if (sectionHeadings.length === 0) return;

    const visibleSections = new Set<string>();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            visibleSections.add(entry.target.id);
          } else {
            visibleSections.delete(entry.target.id);
          }
        });

        const sortedVisibleSections = Array.from(visibleSections).sort(
          (a, b) => {
            const elA = document.getElementById(a);
            const elB = document.getElementById(b);
            return (elA?.offsetTop ?? 0) - (elB?.offsetTop ?? 0);
          }
        );

        if (sortedVisibleSections.length > 0) {
          setActiveSectionId(sortedVisibleSections[0]);
        }
      },
      {
        rootMargin: `-20% 0px -75% 0px`,
        threshold: 0
      }
    );

    sectionHeadings.forEach((heading) => observerRef.current?.observe(heading));
    
    if (sectionHeadings.length > 0 && !activeSectionId) {
      setActiveSectionId(sectionHeadings[0].id);
    }
    
    return () => {
      observerRef.current?.disconnect();
    };
  // FIX: Depend on the versions array for changes.
  }, [editableDoc.versions, isEditing, activeSectionId]);

  useEffect(() => {
    setEditableDoc(doc);
    setIsEditing(false);
  }, [doc]);

  const handleSaveChanges = () => {
    saveDocument(editableDoc);
    setIsEditing(false);
  };
  
  const handleCancelEdit = () => {
    setEditableDoc(doc);
    setIsEditing(false);
  };
  
  // FIX: Update title on the latest version immutably.
  const handleTitleChange = (newTitle: string) => {
    setEditableDoc(prevDoc => {
      const newVersions = [...prevDoc.versions];
      const latestVersionIndex = newVersions.length - 1;
      if (latestVersionIndex < 0) return prevDoc;
      const latestVersion = { ...newVersions[latestVersionIndex], title: newTitle };
      newVersions[latestVersionIndex] = latestVersion;
      return { ...prevDoc, versions: newVersions };
    });
  };
  
  // FIX: Update section on the latest version immutably.
  const handleSectionChange = (sectionIndex: number, field: 'title' | 'content', value: string) => {
    setEditableDoc(prevDoc => {
      const newVersions = [...prevDoc.versions];
      const latestVersionIndex = newVersions.length - 1;
      if (latestVersionIndex < 0) return prevDoc;
      const latestVersion = { ...newVersions[latestVersionIndex] };
      
      const newSections = [...latestVersion.sections];
      const oldSection = newSections[sectionIndex];
      if (oldSection) {
          newSections[sectionIndex] = { ...oldSection, [field]: value };
          latestVersion.sections = newSections;
          newVersions[latestVersionIndex] = latestVersion;
          return { ...prevDoc, versions: newVersions };
      }
      return prevDoc;
    });
  };

  const handleOpenComments = (sectionIndex: number) => {
    setCommentsState({ isOpen: true, sectionIndex });
  };

  const handleCloseComments = () => {
    setCommentsState({ isOpen: false, sectionIndex: null });
  };

  // FIX: Update comments on the latest version immutably.
  const handleAddComment = (commentText: string) => {
    if (commentsState.sectionIndex === null) return;
    
    const currentUser = getCurrentUser();
    const newComment: Comment = {
      id: `comment_${Date.now()}`,
      userId: currentUser.id,
      content: commentText,
      createdAt: new Date().toISOString(),
    };
    
    setEditableDoc(prevDoc => {
      const newVersions = [...prevDoc.versions];
      const latestVersionIndex = newVersions.length - 1;
      if (latestVersionIndex < 0) return prevDoc;
      
      const latestVersion = { ...newVersions[latestVersionIndex] };
      const newSections = [...latestVersion.sections];
      const sectionToUpdate = newSections[commentsState.sectionIndex];

      if (sectionToUpdate) {
        const existingComments = sectionToUpdate.comments || [];
        const updatedSection = { ...sectionToUpdate, comments: [...existingComments, newComment] };
        newSections[commentsState.sectionIndex] = updatedSection;
        latestVersion.sections = newSections;
        newVersions[latestVersionIndex] = latestVersion;
      }
      
      const updatedDoc = { ...prevDoc, versions: newVersions };
      // Save immediately when a comment is added, even if not in edit mode
      saveDocument(updatedDoc); 
      return updatedDoc;
    });
  };

  const handleOpenEditor = (sectionIndex: number, blockIndex: number, mermaidCode: string) => {
    setEditorState({ isOpen: true, sectionIndex, blockIndex, initialCode: mermaidCode });
  };
  
  const handleCloseEditor = () => {
    setEditorState({ isOpen: false, sectionIndex: null, blockIndex: null, initialCode: null });
  };
  
  const handleCopyMermaid = (mermaidCode: string, sectionIndex: number, blockIndex: number) => {
    navigator.clipboard.writeText(mermaidCode).then(() => {
      setCopiedBlock({ sectionIndex, blockIndex });
      setTimeout(() => {
        setCopiedBlock(null);
      }, 2000);
    }).catch(err => {
      console.error('Failed to copy mermaid code: ', err);
    });
  };

  // FIX: Update diagram content on the latest version immutably.
  const handleSaveDiagram = (newCode: string) => {
    if (editorState.sectionIndex === null || editorState.blockIndex === null) return;
    try {
        setEditableDoc(prevDoc => {
            const latestVersionIndex = prevDoc.versions.length - 1;
            if (latestVersionIndex < 0) return prevDoc;

            const newVersions = [...prevDoc.versions];
            const latestVersion = { ...newVersions[latestVersionIndex] };
            const updatedSections = [...latestVersion.sections];
            const sectionToUpdate = updatedSections[editorState.sectionIndex!];

            if (!sectionToUpdate) {
                console.error("Section to update not found.");
                return prevDoc;
            }

            const mermaidRegex = /```mermaid\n([\s\S]*?)\n```/g;
            
            let blockCount = -1;
            const newContent = sectionToUpdate.content.replace(mermaidRegex, (match) => {
              blockCount++;
              if (blockCount === editorState.blockIndex) {
                return `\`\`\`mermaid\n${newCode}\n\`\`\``;
              }
              return match;
            });

            if (blockCount < editorState.blockIndex) {
                console.error("Mermaid block index out of bounds during replacement.");
                return prevDoc;
            }
            
            updatedSections[editorState.sectionIndex!] = { ...sectionToUpdate, content: newContent };
            latestVersion.sections = updatedSections;
            newVersions[latestVersionIndex] = latestVersion;

            const newDoc = { ...prevDoc, versions: newVersions };
            saveDocument(newDoc);
            return newDoc;
        });
    } catch(e) {
        console.error("Failed to save diagram:", e);
    } finally {
        handleCloseEditor();
    }
  };

  // FIX: Get content from the latest version for markdown export.
  const getMarkdownContent = useCallback(() => {
    const title = latestVersion?.title ?? 'Untitled Document';
    const sections = latestVersion?.sections ?? [];
    return `# ${title}\n\n${sections.map(s => `## ${s?.title ?? 'Untitled Section'}\n\n${s?.content ?? ''}`).join('\n\n')}`;
  }, [latestVersion]);

  const copyToClipboard = useCallback(() => {
    navigator.clipboard.writeText(getMarkdownContent());
    setCopied(true);
    setIsExportMenuOpen(false);
    setTimeout(() => setCopied(false), 2000);
  }, [getMarkdownContent]);

  // FIX: Get title from the latest version for download filename.
  const downloadMarkdown = useCallback(() => {
    const content = getMarkdownContent();
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const sanitizedTitle = (latestVersion?.title ?? 'document').replace(/[^a-z0-9]/gi, '_').toLowerCase();
    a.download = `${sanitizedTitle}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setIsExportMenuOpen(false);
  }, [getMarkdownContent, latestVersion]);
  
  // FIX: Get title from the latest version for Word export.
  const downloadAsWord = useCallback((extension: 'docx' | 'doc') => {
    const printableElement = document.querySelector('.printable-area');
    if (!printableElement) {
        console.error("Printable area not found for Word export.");
        return;
    }

    const pageTitle = latestVersion?.title || 'Document';
    const sourceHTML = printableElement.innerHTML;
    
    const head = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>${pageTitle}</title>
        <style>
          body { font-family: Calibri, sans-serif; font-size: 11pt; }
          h1, h2, h3, h4, h5, h6 { page-break-after: avoid; }
          h1 { font-size: 20pt; color: #2F5496; }
          h2 { font-size: 16pt; color: #2F5496; }
          h3 { font-size: 12pt; color: #1F3864; }
          pre { background-color: #F3F3F3; border: 1px solid #CCC; padding: 10px; font-family: 'Courier New', monospace; white-space: pre-wrap; word-wrap: break-word; }
          code { font-family: 'Courier New', monospace; }
          .mermaid svg { max-width: 100%; height: auto; }
        </style>
      </head>
      <body>`;
      
    const foot = `</body></html>`;
    
    const fullHtml = head + sourceHTML + foot;

    const blob = new Blob(['\ufeff', fullHtml], { type: 'application/msword' });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const sanitizedTitle = (latestVersion?.title ?? 'document').replace(/[^a-z0-9]/gi, '_').toLowerCase();
    a.download = `${sanitizedTitle}.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setIsExportMenuOpen(false);
  }, [latestVersion]);

  const exportToPdf = () => {
    setIsExportMenuOpen(false);
    window.print();
  };
  
  const confirmAction = (
        title: string,
        description: string,
        onConfirm: () => void,
        confirmText: string,
        icon?: React.ReactNode
    ) => {
        setConfirmationState({ isOpen: true, title, description, onConfirm, confirmText, icon });
        setIsExportMenuOpen(false);
  };
  
   const handleOutlineClick = useCallback((sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (window.innerWidth < 1024) {
        setIsOutlineVisible(false);
      }
    }
  }, []);
  
  const handleSendMessageToAgent = async (message: string) => {
      const userMessage: ChatMessage = {
          id: `msg_${Date.now()}`,
          sender: 'user',
          text: message,
          timestamp: new Date().toISOString()
      };
      setChatHistory(prev => [...prev, userMessage]);
      setIsAgentReplying(true);

      try {
          const updatedDoc = await modifyDocumentWithAgents(editableDoc, message);
          const newDocState = {...editableDoc, ...updatedDoc};
          setEditableDoc(newDocState);
          saveDocument(newDocState);

          const agentMessage: ChatMessage = {
              id: `msg_${Date.now()}_agent`,
              sender: 'agent',
              text: "I've updated the document with your requested changes. Please review them.",
              timestamp: new Date().toISOString()
          };
          setChatHistory(prev => [...prev, agentMessage]);

      } catch (e) {
          const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
          addAppError(`Failed to modify document: ${errorMessage}`);
           const agentErrorMessage: ChatMessage = {
              id: `msg_${Date.now()}_agent_error`,
              sender: 'agent',
              text: `I'm sorry, I encountered an error trying to modify the document: ${errorMessage}`,
              timestamp: new Date().toISOString()
          };
          setChatHistory(prev => [...prev, agentErrorMessage]);
      } finally {
          setIsAgentReplying(false);
      }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setIsExportMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // FIX: Add a guard clause to handle cases where a document might have no versions.
  if (!latestVersion) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <WarningIcon className="w-12 h-12 text-destructive mb-4" />
        <h2 className="text-2xl font-bold mb-2">Document Error</h2>
        <p className="text-muted-foreground mb-4">This document has no content versions and cannot be displayed.</p>
        <button onClick={onBackToDashboard} className="flex items-center space-x-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-2 px-4 rounded-lg transition-colors">
            <ArrowLeftIcon className="w-5 h-5" />
            <span>Back to Dashboard</span>
        </button>
      </div>
    );
  }
    
  return (
    <div className="animate-fade-in">
        <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
            <button onClick={onBackToDashboard} className="flex items-center space-x-2 text-primary hover:underline focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:ring-primary rounded-sm">
                <ArrowLeftIcon className="w-5 h-5" />
                <span>Back to Dashboard</span>
            </button>
            
            <div className="flex items-center gap-x-2 sm:gap-x-4">
                {isEditing ? (
                    <>
                        <button
                            onClick={handleCancelEdit}
                            className="flex items-center space-x-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground font-bold py-2 px-4 rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:ring-ring"
                        >
                            <span>Cancel</span>
                        </button>
                         <button
                            onClick={handleSaveChanges}
                            className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:ring-green-500"
                        >
                            <CheckIcon className="w-5 h-5" />
                            <span>Save Changes</span>
                        </button>
                    </>
                ) : (
                    <>
                        <button
                            onClick={() => setIsEditing(true)}
                             className="flex items-center space-x-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground font-bold py-2 px-4 rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:ring-ring"
                        >
                            <EditIcon className="w-5 h-5" />
                            <span>Edit</span>
                        </button>
                        <button
                            onClick={onStartNewGeneration}
                            className="hidden sm:flex items-center space-x-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-2 px-4 rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:ring-primary"
                        >
                            <PlusIcon className="w-5 h-5" />
                            <span>New Document</span>
                        </button>
                        <div className="relative" ref={exportMenuRef}>
                             <button
                                onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                                aria-haspopup="true"
                                aria-expanded={isExportMenuOpen}
                                aria-label="Export document options"
                                className="flex items-center space-x-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground font-bold py-2 px-4 rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:ring-ring"
                            >
                                <span>Export</span>
                                <ChevronDownIcon className={`w-5 h-5 transition-transform ${isExportMenuOpen ? 'rotate-180' : ''}`} />
                            </button>
                            {isExportMenuOpen && (
                                <div className="absolute right-0 mt-2 w-56 origin-top-right bg-popover text-popover-foreground rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-20" role="menu" aria-orientation="vertical">
                                    <div className="py-1">
                                         <button onClick={() => confirmAction('Copy Markdown', 'Are you sure you want to copy the entire document as Markdown to your clipboard?', copyToClipboard, 'Copy', <DocumentDuplicateIcon className="h-6 w-6 text-primary" />)} className="w-full text-left flex items-center space-x-3 px-4 py-2 text-sm hover:bg-accent" role="menuitem">
                                            <DocumentDuplicateIcon className="w-5 h-5" />
                                            <span>{copied ? 'Copied!' : 'Copy Markdown'}</span>
                                        </button>
                                        <button onClick={() => confirmAction('Download .md', 'Are you sure you want to download the document as a Markdown file?', downloadMarkdown, 'Download', <DownloadIcon className="h-6 w-6 text-primary" />)} className="w-full text-left flex items-center space-x-3 px-4 py-2 text-sm hover:bg-accent" role="menuitem">
                                            <DownloadIcon className="w-5 h-5" />
                                            <span>Download .md</span>
                                        </button>
                                        <button onClick={() => confirmAction('Download .docx', 'Are you sure you want to download the document as a Microsoft Word (.docx) file?', () => downloadAsWord('docx'), 'Download', <DownloadIcon className="h-6 w-6 text-primary" />)} className="w-full text-left flex items-center space-x-3 px-4 py-2 text-sm hover:bg-accent" role="menuitem">
                                            <DownloadIcon className="w-5 h-5" />
                                            <span>Download .docx</span>
                                        </button>
                                        <button onClick={() => confirmAction('Download .doc', 'Are you sure you want to download the document as a Microsoft Word 97-2003 (.doc) file?', () => downloadAsWord('doc'), 'Download', <DownloadIcon className="h-6 w-6 text-primary" />)} className="w-full text-left flex items-center space-x-3 px-4 py-2 text-sm hover:bg-accent" role="menuitem">
                                            <DownloadIcon className="w-5 h-5" />
                                            <span>Download .doc</span>
                                        </button>
                                         <button onClick={() => confirmAction('Export as PDF', 'This will open your browser\'s print dialog to save the document as a PDF. Are you sure you want to continue?', exportToPdf, 'Continue', <DownloadIcon className="h-6 w-6 text-primary" />)} className="w-full text-left flex items-center space-x-3 px-4 py-2 text-sm hover:bg-accent" role="menuitem">
                                            <DownloadIcon className="w-5 h-5" />
                                            <span>Export as PDF</span>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>

        <div className="lg:flex lg:gap-x-8">
            <div
                className={`lg:hidden fixed inset-0 bg-background/80 backdrop-blur-sm z-30 transition-opacity duration-300 ${isOutlineVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={() => setIsOutlineVisible(false)}
                aria-hidden="true"
            />
            <aside
                className={`fixed lg:sticky top-0 lg:top-24 left-0 h-full lg:h-[calc(100vh-6rem)] w-64 flex-shrink-0 z-40 transform transition-transform duration-300 ease-in-out ${isOutlineVisible ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
                aria-label="Document Table of Contents"
            >
                <div className="h-full p-4 lg:p-0 bg-card lg:bg-transparent overflow-y-auto">
                    {/* FIX: Pass sections from the latest version to the outline. */}
                    <DocumentOutline
                        sections={latestVersion.sections}
                        activeSectionId={activeSectionId}
                        onNavigate={handleOutlineClick}
                    />
                </div>
            </aside>

            <main className="min-w-0 flex-grow">
                <article className={`bg-card border border-border rounded-lg p-8 sm:p-12 printable-area transition-all duration-300 ${isEditing ? 'ring-2 ring-primary/50' : ''}`}>
                    <header className="border-b-2 border-primary pb-4 mb-8">
                      {isEditing ? (
                        <div>
                          <label htmlFor="doc-title-editor" className="sr-only">Document Title</label>
                          {/* FIX: Use latestVersion.title and the corresponding handler. */}
                          <input
                            id="doc-title-editor"
                            value={latestVersion.title}
                            onChange={(e) => handleTitleChange(e.target.value)}
                            className="text-4xl font-extrabold text-foreground bg-transparent w-full border-b-2 border-border focus:border-primary focus:outline-none transition-colors p-2"
                            aria-label="Document Title"
                          />
                        </div>
                      ) : (
                        // FIX: Display title from the latest version.
                        <h1 className="text-4xl font-extrabold text-foreground">{latestVersion.title}</h1>
                      )}
                      <div className="flex items-center gap-x-4 mt-4 text-sm text-muted-foreground">
                        {/* FIX: Display docType from the latest version. */}
                        <span className="bg-primary/10 text-primary px-3 py-1 rounded-full">{latestVersion.docType}</span>
                        {/* FIX: Check for and display contextFileNames from the latest version. */}
                        {latestVersion.contextFileNames && latestVersion.contextFileNames.length > 0 && (
                          <div className="flex items-center gap-x-1" title={latestVersion.contextFileNames.join(', ')}>
                            <PaperclipIcon className="w-4 h-4"/>
                            <span>Context from {latestVersion.contextFileNames.length} file(s)</span>
                          </div>
                        )}
                      </div>
                    </header>
                    <div className="space-y-8">
                        {/* FIX: Map over sections from the latest version. */}
                        {latestVersion.sections.map((section, index) => (
                            <EditableSection
                                key={index}
                                section={section}
                                isEditing={isEditing}
                                onTitleChange={(newTitle) => handleSectionChange(index, 'title', newTitle)}
                                onContentChange={(newContent) => handleSectionChange(index, 'content', newContent)}
                                theme={theme}
                                onEditMermaid={(mermaidCode, blockIndex) => handleOpenEditor(index, blockIndex, mermaidCode)}
                                onCopyMermaid={(mermaidCode, blockIndex) => handleCopyMermaid(mermaidCode, index, blockIndex)}
                                copiedBlock={copiedBlock?.sectionIndex === index ? copiedBlock.blockIndex : null}
                                sectionId={`section-title-${index}`}
                                onOpenComments={() => handleOpenComments(index)}
                            />
                        ))}
                    </div>
                </article>
            </main>
        </div>


        <button
            onClick={() => setIsOutlineVisible(v => !v)}
            className="lg:hidden fixed bottom-4 right-4 z-50 p-3 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90 transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:ring-primary"
            aria-label={isOutlineVisible ? 'Hide document outline' : 'Show document outline'}
        >
            {isOutlineVisible ? <XCircleIcon className="w-6 h-6" /> : <ListIcon className="w-6 h-6" />}
        </button>

        <button
            onClick={() => setIsChatPanelOpen(v => !v)}
            className="fixed bottom-4 left-4 z-50 p-3 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90 transition-all transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:ring-primary"
            aria-label={isChatPanelOpen ? 'Close AI Assistant' : 'Open AI Assistant'}
        >
            {isChatPanelOpen ? <XCircleIcon className="w-6 h-6" /> : <WandIcon className="w-6 h-6" />}
        </button>


        {editorState.isOpen && (
          <MermaidEditorModal
            isOpen={editorState.isOpen}
            initialCode={editorState.initialCode || ''}
            onClose={handleCloseEditor}
            onSave={handleSaveDiagram}
          />
        )}
        <ConfirmationModal 
            isOpen={confirmationState.isOpen}
            onClose={() => setConfirmationState({ ...confirmationState, isOpen: false })}
            onConfirm={confirmationState.onConfirm || (() => {})}
            title={confirmationState.title}
            description={confirmationState.description}
            confirmText={confirmationState.confirmText}
            icon={confirmationState.icon}
        />
        <CommentsSidebar
          isOpen={commentsState.isOpen}
          onClose={handleCloseComments}
          // FIX: Pass the correct section from the latest version.
          section={commentsState.sectionIndex !== null ? latestVersion.sections[commentsState.sectionIndex] : null}
          onAddComment={handleAddComment}
        />
        <AgentChatPanel
            isOpen={isChatPanelOpen}
            onClose={() => setIsChatPanelOpen(false)}
            messages={chatHistory}
            onSendMessage={handleSendMessageToAgent}
            isReplying={isAgentReplying}
        />
    </div>
  );
};

export default DocumentGenerator;