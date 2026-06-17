import {
  buildMessageContent,
  buildMessageNotificationBody,
  buildMessagePreviewText,
} from './message-content';

describe('message-content', () => {
  it('builds plain text message content without attachments', () => {
    const content = buildMessageContent('hello world');

    expect(content.text).toBe('hello world');
    expect(content.attachments).toBeUndefined();
  });

  it('builds gif message content with attachment payload', () => {
    const content = buildMessageContent('', {
      url: 'https://media.giphy.com/gif.gif',
      previewUrl: 'https://media.giphy.com/gif-preview.gif',
      width: 320,
      height: 240,
      title: 'Funny gif',
      giphyId: 'abc123',
    });

    expect(content.attachments).toHaveLength(1);
    expect(content.attachments?.[0]).toEqual(
      expect.objectContaining({
        type: 'gif',
        title: 'Funny gif',
        giphyId: 'abc123',
      }),
    );
  });

  it('prefers text for preview when text is present', () => {
    const preview = buildMessagePreviewText('Hello there from text', {
      url: 'x',
      previewUrl: 'y',
      width: 100,
      height: 80,
      title: 'Gif title',
      giphyId: 'gid',
    });

    expect(preview).toBe('Hello there from text');
  });

  it('uses gif title for preview when no text and gif has title', () => {
    const preview = buildMessagePreviewText('', {
      url: 'x',
      previewUrl: 'y',
      width: 100,
      height: 80,
      title: 'My gif title',
      giphyId: 'gid',
    });

    expect(preview).toBe('GIF: My gif title');
  });

  it('falls back to generic gif preview text when title is missing', () => {
    const preview = buildMessagePreviewText('', {
      url: 'x',
      previewUrl: 'y',
      width: 100,
      height: 80,
      title: '',
      giphyId: 'gid',
    });

    expect(preview).toBe('Sent a GIF');
  });

  it('truncates notification body when preview is too long', () => {
    const text = 'a'.repeat(101);
    const body = buildMessageNotificationBody(text);

    expect(body).toHaveLength(103);
    expect(body.endsWith('...')).toBe(true);
  });
});
