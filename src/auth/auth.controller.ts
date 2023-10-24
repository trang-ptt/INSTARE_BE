import { Body, Controller, Patch, Post } from '@nestjs/common';
import { ApiBody, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { AuthDto } from './dto/auth.dto';
import { SignInDto } from './dto/sign-in.dto';
import { SignUpDto } from './dto/sign-up.dto';
import { VerifyDto } from './dto/verify.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('signUpAfterVerify')
  async signUpAfterVerify(@Body() dto: VerifyDto) {
    return await this.authService.signUpAfterVerify(dto);
  }

  @Post('signIn')
  async signIn(@Body() dto: SignInDto) {
    return await this.authService.signIn(dto);
  }

  @Post('verifyEmailForSignUp')
  async verifyEmail(@Body() dto: SignUpDto) {
    return await this.authService.verifyEmailForSignUp(dto);
  }

  @Post('verifyEmailForgotPassword')
  @ApiBody({
    schema: {
      properties: {
        email: { type: 'string' },
      },
    },
  })
  async verifyEmailForgotPassword(@Body() dto: any) {
    return await this.authService.verifyEmailForgotPassword(dto.email);
  }

  @Post('checkOTPForgotPassword')
  async checkOTPForgotPassword(@Body() dto: VerifyDto) {
    return await this.authService.checkOTPForgotPassword(dto);
  }

  @Patch('newPasswordAfterVerify')
  async newPasswordAfterVerify(@Body() dto: AuthDto) {
    return await this.authService.newPasswordAfterVerify(dto);
  }
}
