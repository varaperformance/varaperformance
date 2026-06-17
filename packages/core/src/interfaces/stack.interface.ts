import type { TimeSlot } from '../schemas/stack.schema';

/**
 * Stack tip - can be generic defaults or AI-generated personalized tips
 */
export interface StackTip {
  timeSlot: TimeSlot;
  title: string;
  content: string;
}

/**
 * Stack item response
 */
export interface StackItemResponse {
  id: string;
  name: string;
  dosage: string;
  timeSlot: TimeSlot | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Stack response with items
 */
export interface StackResponse {
  id: string;
  name: string;
  isActive: boolean;
  items: StackItemResponse[];
  tips: StackTip[] | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Minimal stack response (for list view)
 */
export interface StackListItem {
  id: string;
  name: string;
  isActive: boolean;
  itemCount: number;
  createdAt: string;
}

/**
 * Stack log entry
 */
export interface StackLogEntry {
  itemId: string;
  date: string;
  taken: boolean;
}

/**
 * Daily log response - logs for a specific date
 */
export interface DailyLogResponse {
  date: string;
  logs: { [itemId: string]: boolean };
}
