import React, { useState, useEffect, useCallback, useId, useContext, useRef } from 'react';
import { XCircleIcon, WarningIcon } from './Icons';
import { ThemeContext } from '../index';

interface MermaidEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (newCode: string) => void;
  initialCode: string;
}

declare global {
    interface Window {
        mermaid?: any;
    }
}

const highlightMermaidSyntax = (text: string): string => {
  if (!text) return '';
  let highlightedText = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Comments
  highlightedText = highlightedText.replace(
    /(%%.*$)/gm,
    '<span class="text-muted-foreground/80 italic">$1</span>'
  );

  // Keywords (Purple in dark, Indigo in light)
  highlightedText = highlightedText.replace(
    /\b(graph|flowchart|sequenceDiagram|gantt|classDiagram|stateDiagram|pie|erDiagram|journey|requirementDiagram|mindmap|participant|actor|as|note|over|left of|right of|activate|deactivate|loop|alt|opt|par|end)\b(?!-)/g,
    '<span class="text-purple-400 dark:text-purple-300 font-medium">$1</span>'
  );
  
  // Strings (Green)
  highlightedText = highlightedText.replace(
    /("(?:\\.|[^"\\])*")/g,
    '<span class="text-green-600 dark:text-green-400">$1</span>'
  );

  // Arrows and links (Cyan in dark, Teal in light)
  highlightedText = highlightedText.replace(
    /(-->|---|-->x|--x|-\.->|-\..->|===|==>|<==>|\.-\.)/g,
    '<span class="text-teal-600 dark:text-cyan-400 font-medium">$1</span>'
  );

  return highlightedText;
};


const MermaidEditorModal: React.FC<MermaidEditorModalProps> = ({ isOpen, onClose, onSave, initialCode }) => {
  const [code, setCode] = useState(initialCode);
  const [previewCode, setPreviewCode] = useState(initialCode);
  const [error, setError] = useState<string | null>(null);
  const previewId = useId();
  const themeContext = useContext(ThemeContext);
  const theme = themeContext?.theme || 'dark';

  const editorRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);

  // Sync scrolling between textarea and pre
  const handleScroll = () => {
    if (editorRef.current && preRef.current) {
      preRef.current.scrollTop = editorRef.current.scrollTop;
      preRef.current.scrollLeft = editorRef.current.scrollLeft;
    }
  };
  
  const handleSave = useCallback(() => {
    if (!error) {
      onSave(code);
    }
  }, [error, onSave, code]);


  // Debounce the preview update to avoid re-rendering on every keystroke
  useEffect(() => {
    const handler = setTimeout(() => {
      setPreviewCode(code);
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [code]);

  // Update the Mermaid preview when the debounced code changes
  useEffect(() => {
    if (isOpen && window.mermaid) {
      setError(null);
      const previewElement = document.getElementById(previewId);
      if (previewElement) {
        try {
          window.mermaid.initialize({ startOnLoad: false, theme: theme === 'dark' ? 'dark' : 'default' });
          // Check if the syntax is valid before rendering
          window.mermaid.parse(previewCode);
          previewElement.innerHTML = previewCode;
          previewElement.removeAttribute('data-processed');
          window.mermaid.run({ querySelector: `#${previewId}` });
        } catch (e: any) {
          const errorMessage = e.str || e.message || 'Invalid Mermaid syntax';
          // Clean up the error message for better readability
          const friendlyMessage = errorMessage.replace(/Parse error on line \d+:/, '').trim();
          setError(friendlyMessage);
          previewElement.innerHTML = ''; // Clear previous diagram if there's an error
        }
      }
    }
  }, [previewCode, isOpen, previewId, theme]);
  
  const handleEditorKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Tab') {
      event.preventDefault();
      const editor = event.currentTarget;
      const start = editor.selectionStart;
      const end = editor.selectionEnd;
      const value = editor.value;

      // Insert two spaces at the cursor position
      const newCode = value.substring(0, start) + '  ' + value.substring(end);
      
      setCode(newCode);

      // Defer cursor position update to after the state has been updated and re-rendered.
      setTimeout(() => {
        if (editorRef.current) {
          editorRef.current.selectionStart = editorRef.current.selectionEnd = start + 2;
        }
      }, 0);
    }
  };

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
      if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault();
        handleSave();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, handleSave]);


  if (!isOpen) {
    return null;
  }

  return (
    <div 
      className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in"
      aria-modal="true"
      role="dialog"
      aria-labelledby="dialog-title"
    >
      <div className="bg-card border border-border rounded-lg shadow-2xl w-[90vw] h-[90vh] flex flex-col overflow-hidden">
        <header className="flex items-center justify-between p-4 border-b border-border flex-shrink-0">
          <h2 id="dialog-title" className="text-xl font-bold text-card-foreground">Mermaid Diagram Editor</h2>
          <button onClick={onClose} aria-label="Close editor (Escape)" className="p-1 text-muted-foreground hover:text-foreground rounded-full">
            <XCircleIcon className="w-8 h-8"/>
          </button>
        </header>

        <main className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-4 p-4 overflow-auto">
          {/* Editor Panel */}
          <div className="flex flex-col h-full">
            <label htmlFor="mermaid-code-editor" id="editor-label" className="text-sm font-medium text-foreground mb-2">Diagram Code</label>
            <p id="editor-description" className="sr-only">Enter Mermaid diagram syntax in the code editor. A live preview of the diagram will update automatically. Use the Tab key to indent your code. Save changes with Control or Command plus S.</p>
            <div className="relative w-full h-full font-mono text-sm leading-6">
                 <pre
                    ref={preRef}
                    aria-hidden="true"
                    className="absolute top-0 left-0 w-full h-full bg-secondary/30 border border-input rounded-md p-4 overflow-auto whitespace-pre-wrap break-words pointer-events-none"
                >
                    <code dangerouslySetInnerHTML={{ __html: highlightMermaidSyntax(code) + '\n' }} />
                </pre>
                <textarea
                    ref={editorRef}
                    id="mermaid-code-editor"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    onKeyDown={handleEditorKeyDown}
                    onScroll={handleScroll}
                    className="absolute top-0 left-0 w-full h-full bg-transparent border-transparent rounded-md p-4 text-transparent caret-foreground resize-none focus:ring-2 focus:ring-ring focus:outline-none whitespace-pre-wrap break-words"
                    aria-labelledby="editor-label"
                    aria-describedby="editor-description"
                    role="textbox"
                    spellCheck="false"
                    autoFocus
                />
            </div>
          </div>

          {/* Preview Panel */}
          <div className="flex flex-col h-full">
            <h3 id="preview-label" className="text-sm font-medium text-foreground mb-2">Live Preview</h3>
            <div className={`w-full h-full bg-secondary/30 border ${error ? 'border-destructive' : 'border-input'} rounded-md p-4 flex items-center justify-center overflow-auto`} aria-live="polite" aria-labelledby="preview-label" role="region">
              {error ? (
                 <div role="alert" className="w-full h-full flex flex-col items-center justify-center text-center p-4">
                     <WarningIcon className="w-12 h-12 text-destructive mb-4" />
                     <h4 className="font-bold text-lg text-destructive-foreground mb-2">Invalid Syntax</h4>
                     <pre className="text-destructive-foreground text-sm whitespace-pre-wrap text-left bg-destructive/10 p-3 rounded-md w-full max-w-md">{error}</pre>
                 </div>
              ) : (
                <div id={previewId} className="mermaid w-full h-full text-foreground flex justify-center items-center" role="img" aria-labelledby="preview-label">
                  {previewCode}
                </div>
              )}
            </div>
          </div>
        </main>

        <footer className="flex items-center justify-end p-4 border-t border-border flex-shrink-0 space-x-4">
          <p className="text-sm text-muted-foreground mr-auto">
            <kbd className="font-sans font-semibold p-1 bg-secondary text-secondary-foreground rounded">Ctrl/Cmd + S</kbd> to save, <kbd className="font-sans font-semibold p-1 bg-secondary text-secondary-foreground rounded">Esc</kbd> to close.
          </p>
          <button
            onClick={onClose}
            className="bg-secondary hover:bg-secondary/80 text-secondary-foreground font-bold py-2 px-4 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!!error}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-2 px-4 rounded-lg transition-colors disabled:bg-muted disabled:cursor-not-allowed"
          >
            Save Changes
          </button>
        </footer>
      </div>
    </div>
  );
};

export default MermaidEditorModal;