import React, { useState, useRef, useEffect } from 'react';
import type { ChatMessage } from '../types';
import { XCircleIcon, SparklesIcon, SpinnerIcon } from './Icons';

interface AgentChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  isReplying: boolean;
}

const MessageBubble: React.FC<{ message: ChatMessage }> = ({ message }) => {
  const isAgent = message.sender === 'agent';
  return (
    <div className={`flex items-start gap-3 ${isAgent ? '' : 'justify-end'}`}>
      {isAgent && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <SparklesIcon className="w-5 h-5 text-primary" />
        </div>
      )}
      <div className={`max-w-xs md:max-w-md px-4 py-2 rounded-lg ${isAgent ? 'bg-secondary text-secondary-foreground' : 'bg-primary text-primary-foreground'}`}>
        <p className="text-sm whitespace-pre-wrap">{message.text}</p>
      </div>
    </div>
  );
};

const AgentChatPanel: React.FC<AgentChatPanelProps> = ({ isOpen, onClose, messages, onSendMessage, isReplying }) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  useEffect(() => {
    if (isOpen) {
        setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isReplying) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  return (
    <>
      <div
        className={`fixed inset-0 bg-background/80 backdrop-blur-sm z-30 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className={`fixed top-0 right-0 h-full w-96 max-w-[90vw] bg-card border-l border-border shadow-2xl z-40 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
        role="complementary"
        aria-labelledby="agent-chat-heading"
      >
        <div className="h-full flex flex-col">
          <header className="flex items-center justify-between p-4 border-b border-border flex-shrink-0">
            <h3 id="agent-chat-heading" className="text-lg font-bold text-card-foreground flex items-center gap-2">
              <SparklesIcon className="w-6 h-6 text-primary" />
              AI Assistant
            </h3>
            <button onClick={onClose} aria-label="Close AI Assistant" className="p-1 text-muted-foreground hover:text-foreground rounded-full">
              <XCircleIcon className="w-6 h-6" />
            </button>
          </header>

          <div className="flex-grow overflow-y-auto p-4 space-y-4">
            {messages.map(msg => <MessageBubble key={msg.id} message={msg} />)}
            {isReplying && (
                <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <SparklesIcon className="w-5 h-5 text-primary" />
                    </div>
                     <div className="max-w-xs md:max-w-md px-4 py-3 rounded-lg bg-secondary">
                        <div className="flex items-center gap-2">
                            <SpinnerIcon className="text-primary" />
                            <p className="text-sm italic text-muted-foreground">Agent is working...</p>
                        </div>
                    </div>
                </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <footer className="p-4 border-t border-border flex-shrink-0 bg-secondary/50">
            <form onSubmit={handleSubmit} className="relative">
              <label htmlFor="agent-chat-input" className="sr-only">Ask AI to modify the document</label>
              <textarea
                ref={textareaRef}
                id="agent-chat-input"
                rows={3}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmit(e);
                    }
                }}
                placeholder="e.g., 'Add a section about cost optimization...'"
                className="w-full bg-background border border-input rounded-md p-2 pr-12 text-sm focus:ring-2 focus:ring-ring focus:outline-none transition resize-none"
                disabled={isReplying}
              />
              <button
                type="submit"
                className="absolute bottom-2 right-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold p-2 rounded-lg text-sm transition-colors disabled:bg-muted disabled:cursor-not-allowed"
                disabled={!input.trim() || isReplying}
                aria-label="Send message"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                    <path d="M3.105 3.105a.75.75 0 0 1 .814-.156l14.682 4.894a.75.75 0 0 1 0 1.312L3.919 14.05a.75.75 0 0 1-.814-.156L2.25 13.04l1.28-4.268a.75.75 0 0 1 1.112-.318l3.415 1.707a.75.75 0 0 0 1.112-.318L10.94 5.53a.75.75 0 0 0-1.112-.318L6.413 6.92a.75.75 0 0 1-1.112-.318L4.02 2.332 3.105 3.105Z" />
                </svg>
              </button>
            </form>
          </footer>
        </div>
      </aside>
    </>
  );
};

export default AgentChatPanel;