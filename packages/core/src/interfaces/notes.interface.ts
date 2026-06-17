/**
 * Note response returned from API
 */
export interface NoteResponse {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Paginated notes list response
 */
export interface NotesListData {
  items: NoteResponse[];
  total: number;
  page: number;
  limit: number;
}
