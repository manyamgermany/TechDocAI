export enum AgentStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export interface Agent {
  id: string;
  name: string;
  role: string;
  status: AgentStatus;
}

export interface User {
  id: string;
  name: string;
  avatarUrl: string;
  initials: string;
}

export interface Comment {
  id: string;
  userId: string;
  content: string;
  createdAt: string;
}

export interface DocumentSection {
  title: string;
  content: string;
  comments?: Comment[];
}

export enum DocumentType {
  HLD = 'High-Level Design',
  LLD = 'Low-Level Design',
  TDD = 'Technical Design Document'
}

export interface KnowledgeFile {
  id: string;
  name: string;
  content: string;
  createdAt: string;
  size: number;
  type: string;
}

export interface GeneratedDocument {
  title: string;
  sections: DocumentSection[];
  docType: DocumentType;
  contextFileNames?: string[];
}

export interface DocumentVersion {
  title: string;
  sections: DocumentSection[];
  docType: DocumentType;
  contextFileNames?: string[];
  savedAt: string;
  savedBy?: string; // User ID
}

export interface StoredDocument {
  id: string;
  createdAt: string;
  versions: DocumentVersion[];
  sharedWith?: string[]; // Array of User IDs
}

export interface AppError {
  id: number;
  message: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  timestamp: string;
}