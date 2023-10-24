import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';
export class MailDto {
  @IsEmail()
  @IsNotEmpty()
  @ApiProperty()
  email: string;
}
