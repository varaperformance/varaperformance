import type { MessageContent, SendGif } from '@varaperformance/core';

export const buildMessageContent = (
  text: string,
  gif?: SendGif,
): MessageContent => ({
  text,
  ...(gif && {
    attachments: [
      {
        type: 'gif' as const,
        url: gif.url,
        previewUrl: gif.previewUrl,
        width: gif.width,
        height: gif.height,
        title: gif.title,
        giphyId: gif.giphyId,
      },
    ],
  }),
});

export const buildMessagePreviewText = (
  text: string,
  gif?: SendGif,
): string => {
  const hasText = text.trim().length > 0;
  if (hasText) {
    return text.substring(0, 100);
  }

  if (gif?.title) {
    return `GIF: ${gif.title.substring(0, 90)}`;
  }

  return 'Sent a GIF';
};

export const buildMessageNotificationBody = (previewText: string): string =>
  previewText.length > 100 ? `${previewText.slice(0, 100)}...` : previewText;
