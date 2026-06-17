import type { Logger } from '@nestjs/common';
import type { EncryptionService } from '@app/security';
import type {
  MessageContent,
  MessageGif,
  MessageResponse,
} from '@varaperformance/core';

type Decryptor = Pick<EncryptionService, 'decrypt'>;
type ErrorLogger = Pick<Logger, 'error'>;

export const transformMessageForResponse = (
  message: any,
  decryptor: Decryptor,
  logger: ErrorLogger,
): MessageResponse => {
  let text = '';
  let gif: MessageGif | undefined = undefined;

  if (!message.isDeleted) {
    try {
      const decrypted = decryptor.decrypt({
        encryptedContent: message.encryptedContent,
        contentIv: message.contentIv,
        contentAuthTag: message.contentAuthTag,
        wrappedKey: message.wrappedKey,
      });
      const content: MessageContent = JSON.parse(decrypted.toString());
      text = content.text;

      const gifAttachment = content.attachments?.find((a) => a.type === 'gif');
      if (gifAttachment && gifAttachment.type === 'gif') {
        gif = {
          url: gifAttachment.url,
          previewUrl: gifAttachment.previewUrl,
          width: gifAttachment.width,
          height: gifAttachment.height,
          title: gifAttachment.title,
          giphyId: gifAttachment.giphyId,
        };
      }
    } catch (error) {
      logger.error(`Failed to decrypt message ${message.id}`, error);
      text = '[Unable to decrypt message]';
    }
  }

  let replyTo: MessageResponse['replyTo'] = undefined;
  if (message.replyTo && !message.replyTo.isDeleted) {
    try {
      const replyDecrypted = decryptor.decrypt({
        encryptedContent: message.replyTo.encryptedContent,
        contentIv: message.replyTo.contentIv,
        contentAuthTag: message.replyTo.contentAuthTag,
        wrappedKey: message.replyTo.wrappedKey,
      });
      const replyContent: MessageContent = JSON.parse(
        replyDecrypted.toString(),
      );
      replyTo = {
        id: message.replyTo.id,
        text: replyContent.text.substring(0, 100),
        senderDisplayName: message.replyTo.sender?.profile?.displayName,
      };
    } catch {
      // Keep reply preview best-effort.
    }
  }

  return {
    id: message.id,
    conversationId: message.conversationId,
    senderId: message.senderId,
    senderDisplayName: message.sender?.profile?.displayName ?? undefined,
    senderAvatarUrl: message.sender?.profile?.avatarUrl ?? undefined,
    text: message.isDeleted ? '[Message deleted]' : text,
    gif,
    status: message.status,
    sentAt: message.sentAt.toISOString(),
    deliveredAt: message.deliveredAt?.toISOString(),
    readAt: message.readAt?.toISOString(),
    isEdited: message.isEdited,
    editedAt: message.editedAt?.toISOString(),
    isDeleted: message.isDeleted,
    replyToId: message.replyToId ?? undefined,
    replyTo,
    reactions:
      message.reactions?.map((r: any) => ({
        id: r.id,
        emoji: r.emoji,
        userId: r.userId,
        displayName: r.user?.profile?.displayName,
        createdAt: r.createdAt.toISOString(),
      })) ?? [],
    createdAt: message.createdAt.toISOString(),
    updatedAt: message.updatedAt.toISOString(),
  };
};
