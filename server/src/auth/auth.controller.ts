import { Controller, Post, Delete, Body, HttpCode, HttpStatus, UseInterceptors, UploadedFile, UnauthorizedException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import multer, { diskStorage, FileFilterCallback } from 'multer';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { SendCodeDto } from './dto/send-code.dto';
import { VerifyCodeDto } from './dto/verify-code.dto';
import { Tokens } from './types/tokens.types';
import { Request } from 'express';

export interface LoginRequest extends LoginDto {
  rememberMe?: boolean;
}

export interface ForgotPasswordDto {
  email: string;
}

export interface ResetPasswordDto {
  token: string;
  newPassword: string;
}

export interface UploadAvatarRequest {
  userId: string;
}

// Multer configuration for avatar upload
const avatarStorage = diskStorage({
  destination: './uploads/avatars',
  filename: (req: Request, file: Express.Multer.File, callback: (error: Error | null, filename: string) => void) => {
    const uniqueFilename = `${uuidv4()}${extname(file.originalname)}`;
    callback(null, uniqueFilename);
  },
});

const avatarFileFilter = (req: Request, file: Express.Multer.File, callback: FileFilterCallback) => {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  
  if (!allowedMimeTypes.includes(file.mimetype)) {
    callback(null, false);
    return;
  }
  
  callback(null, true);
};

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() registerDto: RegisterDto): Promise<{ message: string; email: string }> {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginRequest: LoginRequest): Promise<Tokens> {
    const { rememberMe = false, ...loginDto } = loginRequest;
    return this.authService.login(loginDto, { rememberMe });
  }

  @Post('verify-token')
  @HttpCode(HttpStatus.OK)
  async verifyToken(@Body('token') token: string): Promise<{ valid: boolean; user?: { id: string; username: string; email: string; avatar?: string } }> {
    return this.authService.verifyToken(token);
  }

  @Post('upload-avatar')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('avatar', {
    storage: avatarStorage,
    fileFilter: avatarFileFilter,
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB limit
    },
  }))
  async uploadAvatar(
    @UploadedFile() file: Express.Multer.File,
    @Body('userId') userId: string,
  ): Promise<{ message: string; avatarUrl: string }> {
    if (!file) {
      throw new Error('No file uploaded');
    }
    
    if (!userId) {
      throw new Error('User ID is required');
    }

    const avatarUrl = `/uploads/avatars/${file.filename}`;
    return this.authService.uploadAvatar(userId, avatarUrl);
  }

  @Post('remove-avatar')
  @HttpCode(HttpStatus.OK)
  async removeAvatar(@Body('userId') userId: string): Promise<{ message: string }> {
    return this.authService.removeAvatar(userId);
  }

  @Delete('account')
  @HttpCode(HttpStatus.OK)
  async deleteAccount(@Body('userId') userId: string, @Body('token') token: string): Promise<{ message: string }> {
    // Verify token first
    const tokenData = await this.authService.verifyToken(token);
    
    if (!tokenData.valid || !tokenData.user) {
      throw new UnauthorizedException('Invalid token');
    }
    
    // Verify user is deleting their own account
    if (tokenData.user.id !== userId) {
      throw new UnauthorizedException('Cannot delete another user account');
    }
    
    return this.authService.deleteAccount(userId);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto): Promise<{ message: string }> {
    return this.authService.forgotPassword(forgotPasswordDto.email);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto): Promise<{ message: string }> {
    return this.authService.resetPassword(resetPasswordDto.token, resetPasswordDto.newPassword);
  }

  @Post('send-code')
  @HttpCode(HttpStatus.OK)
  async sendCode(@Body() sendCodeDto: SendCodeDto): Promise<{ message: string }> {
    return this.authService.sendCode(sendCodeDto.email);
  }

  @Post('verify-code')
  @HttpCode(HttpStatus.OK)
  async verifyCode(@Body() verifyCodeDto: VerifyCodeDto): Promise<Tokens> {
    return this.authService.verifyCode(verifyCodeDto.email, verifyCodeDto.code);
  }
}
