import { MailService } from './mail.service';
import { Controller } from '@nestjs/common';

@Controller('mail')
export class MailController {
  constructor(private mailService: MailService) {}
}
