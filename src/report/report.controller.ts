import { Body, Controller, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { GetUser } from 'src/auth/decorator';
import { JwtGuard } from 'src/auth/guard';
import { ReportDTO, ResolveReportDTO } from './dto';
import { ReportService } from './report.service';

@ApiTags('Report')
@UseGuards(JwtGuard)
@ApiBearerAuth()
@Controller('report')
export class ReportController {
  constructor(private reportService: ReportService) {}

  @ApiBody({
    description: `Enter postId for post report and userId for user report, don't enter both`,
    type: ReportDTO,
  })
  @Post()
  async createReport(@GetUser() user: User, @Body() dto: ReportDTO) {
    return await this.reportService.createReport(user, dto);
  }

  @Get('posts')
  getPostReports(@GetUser() user: User) {
    this.reportService.isAdmin(user);
    return this.reportService.getPostReports();
  }

  @Get('users')
  getProfileReports(@GetUser() user: User) {
    this.reportService.isAdmin(user);
    return this.reportService.getProfileReports();
  }

  @Get(':id')
  viewReport(@GetUser() user: User, @Param('id') id: string) {
    this.reportService.isAdmin(user);
    return this.reportService.viewReport(id);
  }

  @Put(':id')
  resolveReport(
    @GetUser() user: User,
    @Param('id') id: string,
    @Body() dto: ResolveReportDTO,
  ) {
    this.reportService.isAdmin(user);
    return this.reportService.resolveReport(user, id, dto)
  }
}
