import { Injectable } from '@nestjs/common';
import { MailService } from '@app/common/mailer';
import { ContactDto } from './dto/contact.dto';

@Injectable()
export class ContactService {
  constructor(private readonly mailService: MailService) {}

  async submit(dto: ContactDto): Promise<void> {
    await this.mailService.sendContactFormEmail({
      name: dto.name,
      email: dto.email,
      subject: dto.subject,
      message: dto.message,
    });
  }
}
