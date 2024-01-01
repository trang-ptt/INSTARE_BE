import { ApiProperty } from '@nestjs/swagger';

export class PostDto {
  @ApiProperty()
  caption: string

  @ApiProperty()
  tagUserIdList: string

  @ApiProperty()
  emotion: string

  @ApiProperty()
  layout: number
}
