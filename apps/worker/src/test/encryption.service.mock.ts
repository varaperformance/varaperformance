export class EncryptionService {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  encrypt(plaintext: string) {
    return {
      encryptedContent: Buffer.from("encrypted"),
      contentIv: Buffer.from("iv"),
      contentAuthTag: Buffer.from("tag"),
      wrappedKey: Buffer.from("key"),
    };
  }

  decrypt() {
    return "";
  }
}
