import React, { useState, useRef, useEffect } from 'react';
import type { DocumentSection, Comment } from '../types';
import { getCurrentUser, getUserById } from '../services/mockData';
import { XCircleIcon } from './Icons';

interface CommentsSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  section: DocumentSection | null;
  onAddComment: (commentText: string) => void;
}

const CommentItem: React.FC<{ comment: Comment }> = ({ comment }) => {
  const user = getUserById(comment.userId);
  if (!user) return null;

  const date = new Date(comment.createdAt);
  const formattedTime = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const formattedDate = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date);


  return (
    <li className="flex items-start space-x-3 py-3">
      <img className="h-8 w-8 rounded-full" src={user.avatarUrl} alt={user.name} />
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-foreground">{user.name}</p>
          <p className="text-xs text-muted-foreground" title={date.toLocaleString()}>{formattedDate}, {formattedTime}</p>
        </div>
        <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">{comment.content}</p>
      </div>
    </li>
  );
};

const CommentsSidebar: React.FC<CommentsSidebarProps> = ({ isOpen, onClose, section, onAddComment }) => {
  const [newComment, setNewComment] = useState('');
  const currentUser = getCurrentUser();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newComment.trim()) {
      onAddComment(newComment.trim());
      setNewComment('');
    }
  };
  
  const sortedComments = section?.comments ? [...section.comments].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) : [];

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
        aria-labelledby="comments-heading"
      >
        <div className="h-full flex flex-col">
          <header className="flex items-center justify-between p-4 border-b border-border flex-shrink-0">
            <h3 id="comments-heading" className="text-lg font-bold text-card-foreground truncate">
              Comments on: "{section?.title || '...'}"
            </h3>
            <button onClick={onClose} aria-label="Close comments sidebar" className="p-1 text-muted-foreground hover:text-foreground rounded-full">
              <XCircleIcon className="w-6 h-6" />
            </button>
          </header>

          <div className="flex-grow overflow-y-auto px-4">
            <ul className="divide-y divide-border">
              {sortedComments.length > 0 ? (
                sortedComments.map(comment => <CommentItem key={comment.id} comment={comment} />)
              ) : (
                <li className="text-center text-muted-foreground py-10">No comments yet.</li>
              )}
            </ul>
          </div>

          <footer className="p-4 border-t border-border flex-shrink-0 bg-secondary/50">
            <form onSubmit={handleSubmit} className="flex items-start space-x-3">
              <img className="h-8 w-8 rounded-full" src={currentUser.avatarUrl} alt={currentUser.name} />
              <div className="flex-1">
                <label htmlFor="add-comment" className="sr-only">Add a comment</label>
                <textarea
                  ref={textareaRef}
                  id="add-comment"
                  rows={3}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  className="w-full bg-background border border-input rounded-md p-2 text-sm focus:ring-2 focus:ring-ring focus:outline-none transition resize-none"
                />
                <div className="mt-2 flex justify-end">
                  <button
                    type="submit"
                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-2 px-4 rounded-lg text-sm transition-colors disabled:bg-muted disabled:cursor-not-allowed"
                    disabled={!newComment.trim()}
                  >
                    Comment
                  </button>
                </div>
              </div>
            </form>
          </footer>
        </div>
      </aside>
    </>
  );
};

export default CommentsSidebar;