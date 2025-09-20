import type { User } from '../types';

export const mockUsers: User[] = [
  { id: 'user-1', name: 'Alex Johnson', initials: 'AJ', avatarUrl: 'https://i.pravatar.cc/150?u=alexjohnson' },
  { id: 'user-2', name: 'Maria Garcia', initials: 'MG', avatarUrl: 'https://i.pravatar.cc/150?u=mariagarcia' },
  { id: 'user-3', name: 'Chen Wei', initials: 'CW', avatarUrl: 'https://i.pravatar.cc/150?u=chenwei' },
  { id: 'user-4', name: 'Samira Khan', initials: 'SK', avatarUrl: 'https://i.pravatar.cc/150?u=samirakhan' },
];

// For simplicity in this standalone app, we'll assume the current user is always Alex Johnson.
export const getCurrentUser = (): User => mockUsers[0];

export const getUserById = (userId: string): User | undefined => mockUsers.find(u => u.id === userId);
