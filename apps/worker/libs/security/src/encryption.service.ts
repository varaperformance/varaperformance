import { Injectable, OnModuleInit } from "@nestjs/common";
import * as crypto from "crypto";
import { SecretsService } from "@app/common/secrets";

@Injectable()
export class EncryptionService implements OnModuleInit {
  private masterKey!: Buffer;

  constructor(private readonly secrets: SecretsService) {}

  onModuleInit() {
    const kekBase64 = this.secrets.getOrThrow("ENCRYPTION_KEK");
    this.masterKey = Buffer.from(kekBase64, "base64");
    if (this.masterKey.length !== 32)
      throw new Error("ENCRYPTION_KEK must be 32 bytes (base64)");
  }

  encrypt(plaintext: string | Buffer) {
    const dataKey = crypto.randomBytes(32);
    const contentIv = crypto.randomBytes(12);

    const cipher = crypto.createCipheriv("aes-256-gcm", dataKey, contentIv);
    const encryptedContent = Buffer.concat([
      cipher.update(plaintext),
      cipher.final(),
    ]);
    const contentAuthTag = cipher.getAuthTag();

    const keyIv = crypto.randomBytes(12);
    const keyCipher = crypto.createCipheriv(
      "aes-256-gcm",
      this.masterKey,
      keyIv,
    );
    const wrappedKeyCiphertext = Buffer.concat([
      keyCipher.update(dataKey),
      keyCipher.final(),
    ]);
    const keyAuthTag = keyCipher.getAuthTag();
    const wrappedKey = Buffer.concat([keyIv, wrappedKeyCiphertext, keyAuthTag]);

    return { encryptedContent, contentIv, contentAuthTag, wrappedKey };
  }

  decrypt(blob: {
    encryptedContent: Buffer;
    contentIv: Buffer;
    contentAuthTag: Buffer;
    wrappedKey: Buffer;
  }) {
    const { encryptedContent, contentIv, contentAuthTag, wrappedKey } = blob;

    const keyIv = wrappedKey.subarray(0, 12);
    const keyAuthTag = wrappedKey.subarray(wrappedKey.length - 16);
    const wrappedKeyCiphertext = wrappedKey.subarray(
      12,
      wrappedKey.length - 16,
    );

    const keyDecipher = crypto.createDecipheriv(
      "aes-256-gcm",
      this.masterKey,
      keyIv,
    );
    keyDecipher.setAuthTag(keyAuthTag);
    const dataKey = Buffer.concat([
      keyDecipher.update(wrappedKeyCiphertext),
      keyDecipher.final(),
    ]);

    const decipher = crypto.createDecipheriv("aes-256-gcm", dataKey, contentIv);
    decipher.setAuthTag(contentAuthTag);
    return Buffer.concat([decipher.update(encryptedContent), decipher.final()]);
  }
}
