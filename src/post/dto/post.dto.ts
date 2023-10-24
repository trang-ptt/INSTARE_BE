import { ApiProperty } from '@nestjs/swagger';

export class PostDto {
  @ApiProperty()
  caption: string
}
