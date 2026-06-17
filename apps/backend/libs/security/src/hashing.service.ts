import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';

@Injectable()
export class HashingService {
  private readonly options: argon2.Options = {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  };

  async hash(value: string): Promise<string> {
    return await argon2.hash(value, this.options);
  }

  async verify(value: string, hash: string): Promise<boolean> {
    return await argon2.verify(hash, value);
  }
}
