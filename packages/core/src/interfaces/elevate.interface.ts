export type ElevateRealtimeReason =
  | 'post_created'
  | 'post_updated'
  | 'post_deleted'
  | 'post_reacted'
  | 'comment_created'
  | 'comment_updated'
  | 'comment_deleted'
  | 'moderation_action';

export interface ElevateFeedRefreshEvent {
  reason: ElevateRealtimeReason;
  postId?: string;
  commentId?: string;
  actorUserId?: string;
  timestamp: string;
}

/**
 * Socket.IO events for Elevate realtime updates - Server to Client
 */
export interface ElevateServerToClientEvents {
  'elevate:feed:refresh': (data: ElevateFeedRefreshEvent) => void;
  error: (data: { message: string; code?: string }) => void;
}

/**
 * Socket.IO events for Elevate realtime updates - Client to Server
 */
export interface ElevateClientToServerEvents {
  'elevate:ping': () => void;
}
