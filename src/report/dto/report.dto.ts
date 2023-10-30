import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class ReportDTO {
  @ApiProperty()
  userId: string;

  @ApiProperty()
  postId: string;

  @ApiProperty()
  reason: string;
}

export class ResolveReportDTO {
  @ApiProperty()
  @IsNotEmpty()
  violated: boolean

  @ApiProperty()
  reason: string
}
