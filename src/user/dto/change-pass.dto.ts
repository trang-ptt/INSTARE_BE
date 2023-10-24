import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
export class ChangePassDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  oldPass: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  newPass: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  confirmPass: string;
}
