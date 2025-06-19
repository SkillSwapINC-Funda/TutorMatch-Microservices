import { Controller, Post, Body, Get, UseGuards, Request } from '@nestjs/common';
import { 
  AuthService, 
  AuthGuard, 
  GetUser, 
  Public 
} from '@app/shared';
import { SignUpDto, SignInDto, ResetPasswordDto, UpdatePasswordDto, RefreshTokenDto } from './dto/auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('signup')
  async signUp(@Body() signUpDto: SignUpDto) {
    return this.authService.signUp(signUpDto);
  }

  @Public()
  @Post('signin')
  async signIn(@Body() signInDto: SignInDto) {
    return this.authService.signIn(signInDto);
  }

  @Public()
  @Post('refresh-token')
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshToken(refreshTokenDto.refreshToken);
  }

  @Post('signout')
  @UseGuards(AuthGuard)
  async signOut() {
    return this.authService.signOut();
  }

  @Public()
  @Post('reset-password')
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }

  @Public()
  @Post('update-password')
  async updatePassword(@Body() updatePasswordDto: UpdatePasswordDto) {
    return this.authService.updatePassword(updatePasswordDto);
  }

  @Get('me')
  @UseGuards(AuthGuard)
  async getCurrentUser(@Request() req: any) {
    const token = req.headers.authorization?.split(' ')[1];
    return this.authService.getCurrentUser(token);
  }

  @Get('profile')
  @UseGuards(AuthGuard)
  async getProfile(@GetUser() user: any) {
    return {
      id: user.id,
      email: user.email,
      user_metadata: user.user_metadata,
    };
  }
}
