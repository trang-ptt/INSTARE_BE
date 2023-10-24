import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { NoAuthService } from './no-auth.service';

@ApiTags('No Auth')
@Controller('no-auth')
export class NoAuthController {
  constructor(private noAuthService: NoAuthService) {}

  @Get('searchUser')
  searchUser(@Query('search') search: string) {
    return this.noAuthService.searchUser(search);
  }

  @Get('viewPost/:id')
  viewPost(@Param('id') id: string) {
    return this.noAuthService.viewPost(id);
  }

  @Get('viewUserProfile/:username')
  viewUserProfile(@Param('username') username: string) {
    return this.noAuthService.viewUserProfile(username);
  }
}
