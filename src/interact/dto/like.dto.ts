import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';
export class LikeDTO {
  @IsNotEmpty()
  @ApiProperty({
    enum: ['LOVE', 'LIKE', 'LAUGH', 'SAD', 'ANGRY']
  })
  react: string;
}
