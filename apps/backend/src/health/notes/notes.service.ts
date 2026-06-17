import { Injectable } from '@nestjs/common';
import { DatabaseService } from '@app/database';
import { EncryptionService } from '@app/security';
import { noteSelect } from './selectors/notes.selector';
import type {
  CreateNote,
  UpdateNote,
  NoteQuery,
  NoteResponse,
  NotesListData,
  SuccessResponse,
  ErrorResponse,
} from '@varaperformance/core';

interface NoteData {
  title: string;
  content: string;
}

@Injectable()
export class NotesService {
  constructor(
    private readonly db: DatabaseService,
    private readonly encryption: EncryptionService,
  ) {}

  /**
   * Create a new encrypted note
   */
  async create(
    userId: string,
    data: CreateNote,
  ): Promise<SuccessResponse<NoteResponse>> {
    const noteData: NoteData = { title: data.title, content: data.content };
    const encrypted = this.encryption.encrypt(JSON.stringify(noteData));

    const note = await this.db.note.create({
      data: {
        userId,
        encryptedData: encrypted.encryptedContent,
        dataIv: encrypted.contentIv,
        dataAuthTag: encrypted.contentAuthTag,
        wrappedKey: encrypted.wrappedKey,
      },
    });

    return { success: true, data: this.formatResponse(note, noteData) };
  }

  /**
   * Get all notes for a user (decrypted)
   */
  async findAll(
    userId: string,
    query: NoteQuery,
  ): Promise<SuccessResponse<NotesListData>> {
    const { page, limit } = query;
    const skip = (page - 1) * limit;

    const [notes, total] = await Promise.all([
      this.db.note.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
        select: noteSelect,
      }),
      this.db.note.count({ where: { userId } }),
    ]);

    const items = notes.map((note) => {
      const decrypted = this.decryptNote(note);
      return this.formatResponse(note, decrypted);
    });

    return { success: true, data: { items, total, page, limit } };
  }

  /**
   * Get a single note by ID (decrypted)
   */
  async findOne(
    userId: string,
    noteId: string,
  ): Promise<SuccessResponse<NoteResponse> | ErrorResponse> {
    const note = await this.db.note.findFirst({
      where: { id: noteId, userId },
      select: noteSelect,
    });

    if (!note) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Note not found' },
      };
    }

    const decrypted = this.decryptNote(note);
    return { success: true, data: this.formatResponse(note, decrypted) };
  }

  /**
   * Update an encrypted note
   */
  async update(
    userId: string,
    noteId: string,
    data: UpdateNote,
  ): Promise<SuccessResponse<NoteResponse> | ErrorResponse> {
    const existing = await this.db.note.findFirst({
      where: { id: noteId, userId },
      select: noteSelect,
    });

    if (!existing) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Note not found' },
      };
    }

    // Decrypt existing, merge with updates
    const oldData = this.decryptNote(existing);
    const newData: NoteData = {
      title: data.title ?? oldData.title,
      content: data.content ?? oldData.content,
    };

    const encrypted = this.encryption.encrypt(JSON.stringify(newData));

    const note = await this.db.note.update({
      where: { id: noteId },
      data: {
        encryptedData: encrypted.encryptedContent,
        dataIv: encrypted.contentIv,
        dataAuthTag: encrypted.contentAuthTag,
        wrappedKey: encrypted.wrappedKey,
      },
    });

    return { success: true, data: this.formatResponse(note, newData) };
  }

  /**
   * Delete a note
   */
  async remove(
    userId: string,
    noteId: string,
  ): Promise<SuccessResponse<{ message: string }> | ErrorResponse> {
    const note = await this.db.note.findFirst({
      where: { id: noteId, userId },
      select: { id: true },
    });

    if (!note) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Note not found' },
      };
    }

    await this.db.note.delete({ where: { id: noteId } });

    return { success: true, data: { message: 'Note deleted successfully' } };
  }

  /**
   * Decrypt note data from database record
   */
  private decryptNote(note: {
    encryptedData: Uint8Array;
    dataIv: Uint8Array;
    dataAuthTag: Uint8Array;
    wrappedKey: Uint8Array;
  }): NoteData {
    const decrypted = this.encryption.decrypt({
      encryptedContent: Buffer.from(note.encryptedData),
      contentIv: Buffer.from(note.dataIv),
      contentAuthTag: Buffer.from(note.dataAuthTag),
      wrappedKey: Buffer.from(note.wrappedKey),
    });
    return JSON.parse(decrypted.toString()) as NoteData;
  }

  /**
   * Format note for response
   */
  private formatResponse(
    note: { id: string; createdAt: Date; updatedAt: Date },
    data: NoteData,
  ): NoteResponse {
    return {
      id: note.id,
      title: data.title,
      content: data.content,
      createdAt: note.createdAt.toISOString(),
      updatedAt: note.updatedAt.toISOString(),
    };
  }
}
