import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
export class ShareDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  link: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  userId: string;
}
