import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
export class SignInDto {
  @IsNotEmpty()
  @ApiProperty()
  emailOrUsername: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  password: string;
}
