import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { CloudinaryService } from 'nestjs-cloudinary';
import { GetUser } from './../auth/decorator';
import { JwtGuard } from './../auth/guard/jwt.guard';
import { ProfileDto } from './dto';
import { ChangePassDto } from './dto/change-pass.dto';
import { UserService } from './user.service';

@ApiTags('User')
@UseGuards(JwtGuard)
@ApiBearerAuth()
@Controller('user')
export class UserController {
  constructor(
    private config: ConfigService,
    private userService: UserService,
    private cloudinaryService: CloudinaryService,
  ) {}
  @Get('getMe')
  getMe(@GetUser() user: User) {
    return user;
  }

  @Get('getProfile')
  getProfile(@GetUser() user: User) {
    return this.userService.getProfile(user);
  }

  @Patch('uploadAvaOnly')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @GetUser() user: User,
    @UploadedFile() file: Express.Multer.File,
  ) {
    try {
      const uploaded = await this.cloudinaryService.uploadFile(file, {
        resource_type: 'auto'
      });
      console.log(uploaded.url);
      return await this.userService.uploadAva(user, uploaded.url);
    } catch (error) {
      throw error;
    }
  }

  @Patch('updateProfileOnly')
  updateProfile(@GetUser() user: User, @Body() dto: ProfileDto) {
    return this.userService.updateProfile(user, dto);
  }

  @Patch('updateProfileWithAva')
  @UseInterceptors(FileInterceptor('file'))
  async updateProfileWithAva(
    @GetUser() user: User,
    @Body() dto: ProfileDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (file) await this.uploadFile(user, file);
    return await this.updateProfile(user, dto);
  }

  @Patch('changePassword')
  async changePassword(@GetUser() user: User, @Body() dto: ChangePassDto) {
    return this.userService.changePassword(user, dto);
  }

  @Delete('removeAva')
  async removeAva(@GetUser() user: User) {
    return this.userService.removeAva(user);
  }
}
