import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from 'src/idm/decorators/public.decorator';
import { ContactService } from './contact.service';
import { ContactDto } from './dto/contact.dto';

@ApiTags('contact')
@Throttle({ default: { ttl: 1000, limit: 10 } })
@Controller({
  path: 'contact',
  version: '1',
})
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @ApiOperation({ summary: 'Submit contact form' })
  @ApiOkResponse({ description: 'Message sent' })
  @Public()
  @Post()
  @HttpCode(HttpStatus.OK)
  async submit(@Body() dto: ContactDto) {
    await this.contactService.submit(dto);
    return { message: 'Message sent' };
  }
}
