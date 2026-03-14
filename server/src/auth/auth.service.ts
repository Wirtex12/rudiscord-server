import { Injectable, UnauthorizedException, ConflictException, BadRequestException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Tokens, User, AuthResponse, JwtPayload } from './types/tokens.types';
import * as bcrypt from 'bcryptjs';
import * as nodemailer from 'nodemailer';
import * as crypto from 'crypto';

interface VerificationCodeRecord {
  code: string;
  username: string;
  password: string;
  expiresAt: number;
}

export interface LoginOptions {
  rememberMe?: boolean;
}

@Injectable()
export class AuthService {
  private readonly verificationCodes = new Map<string, VerificationCodeRecord>();
  private readonly transporter: nodemailer.Transporter;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }

  // Generate unique 8-digit user ID
  private generateUserId(): string {
    const digits = '0123456789';
    let userId = '';
    for (let i = 0; i < 8; i++) {
      userId += digits[Math.floor(Math.random() * 10)];
    }
    return userId;
  }

  // Generate unique 6-digit short ID for friend requests
  private generateShortId(): string {
    const digits = '0123456789';
    let shortId = '';
    for (let i = 0; i < 6; i++) {
      shortId += digits[Math.floor(Math.random() * 10)];
    }
    return shortId;
  }

  // Check if user ID is unique
  private async isUserIdUnique(userId: string): Promise<boolean> {
    const existing = await this.prisma.user.findUnique({
      where: { userId },
    });
    return !existing;
  }

  // Check if short ID is unique
  private async isShortIdUnique(shortId: string): Promise<boolean> {
    const existing = await this.prisma.user.findUnique({
      where: { shortId },
    });
    return !existing;
  }

  // Generate unique user ID with retry
  private async generateUniqueUserId(): Promise<string> {
    let userId: string;
    let attempts = 0;
    const maxAttempts = 10;

    do {
      userId = this.generateUserId();
      attempts++;
    } while (!(await this.isUserIdUnique(userId)) && attempts < maxAttempts);

    if (attempts >= maxAttempts) {
      throw new Error('Failed to generate unique user ID');
    }

    return userId;
  }

  // Generate unique short ID with retry
  private async generateUniqueShortId(): Promise<string> {
    let shortId: string;
    let attempts = 0;
    const maxAttempts = 10;

    do {
      shortId = this.generateShortId();
      attempts++;
    } while (!(await this.isShortIdUnique(shortId)) && attempts < maxAttempts);

    if (attempts >= maxAttempts) {
      throw new Error('Failed to generate unique short ID');
    }

    return shortId;
  }

  async register(registerDto: RegisterDto): Promise<AuthResponse> {
    const existingEmail = await this.prisma.user.findUnique({
      where: { email: registerDto.email },
    });

    if (existingEmail) {
      throw new ConflictException('This email is already registered');
    }

    // Generate unique 8-digit user ID
    const userId = await this.generateUniqueUserId();
    
    // Generate unique 6-digit short ID for friend requests
    const shortId = await this.generateUniqueShortId();

    const passwordHash = await bcrypt.hash(registerDto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        userId,
        shortId,
        username: registerDto.username,
        email: registerDto.email,
        passwordHash,
      },
      select: {
        id: true,
        userId: true,
        shortId: true,
        username: true,
        email: true,
        avatar: true,
        createdAt: true,
      },
    });

    await this.sendVerificationCode(registerDto.email, registerDto.username, registerDto.password);

    const tokens = await this.generateTokens(user.id, user.username, user.userId || '', true);

    return {
      ...tokens,
      user: {
        id: user.id,
        userId: user.userId || undefined,
        shortId: user.shortId,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        createdAt: user.createdAt,
      },
    };
  }

  async login(loginDto: LoginDto, options: LoginOptions = {}): Promise<AuthResponse> {
    const { rememberMe = false } = options;

    const user = await this.prisma.user.findUnique({
      where: { email: loginDto.email },
      select: {
        id: true,
        userId: true,
        shortId: true,
        username: true,
        email: true,
        avatar: true,
        passwordHash: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.generateTokens(user.id, user.username, user.userId || '', rememberMe);

    return {
      ...tokens,
      user: {
        id: user.id,
        userId: user.userId || undefined,
        shortId: user.shortId,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        createdAt: user.createdAt,
      },
    };
  }

  async verifyToken(token: string): Promise<{ valid: boolean; user?: { id: string; username: string; email: string; shortId?: string } }> {
    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET,
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          username: true,
          email: true,
          shortId: true,
        },
      });

      if (!user) {
        return { valid: false };
      }

      return {
        valid: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          shortId: user.shortId,
        },
      };
    } catch {
      return { valid: false };
    }
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new NotFoundException('Account does not exist');
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await this.prisma.passwordResetToken.upsert({
      where: { email },
      update: {
        token,
        expiresAt,
        used: false,
      },
      create: {
        email,
        token,
        expiresAt,
        used: false,
      },
    });

    const resetUrl = `${process.env.RESET_PASSWORD_URL}?token=${token}`;

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background-color: #23272a;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 400px;
      margin: 40px auto;
      background-color: #2c2f33;
      border-radius: 8px;
      padding: 40px;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
    }
    .logo {
      text-align: center;
      color: #5865f2;
      font-size: 2.5rem;
      font-weight: bold;
      margin-bottom: 10px;
    }
    .title {
      text-align: center;
      color: #99aab5;
      font-size: 0.9rem;
      margin-bottom: 30px;
    }
    .reset-btn {
      display: inline-block;
      background-color: #5865f2;
      color: #ffffff;
      text-decoration: none;
      padding: 14px 30px;
      border-radius: 6px;
      font-size: 1rem;
      font-weight: 600;
      text-align: center;
      margin: 20px 0;
    }
    .reset-btn:hover {
      background-color: #4752c4;
    }
    .url-text {
      background-color: #23272a;
      padding: 12px;
      border-radius: 4px;
      font-size: 0.85rem;
      color: #b9bbbe;
      word-break: break-all;
      margin: 15px 0;
    }
    .footer {
      text-align: center;
      color: #72767d;
      font-size: 0.8rem;
      margin-top: 30px;
    }
    .warning {
      background-color: rgba(237, 66, 69, 0.1);
      border-left: 3px solid #ed4245;
      padding: 12px;
      margin-top: 20px;
      font-size: 0.85rem;
      color: #ed4245;
    }
    .expiry {
      text-align: center;
      color: #faa61a;
      font-size: 0.85rem;
      margin-top: 15px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">Voxit</div>
    <div class="title">Password Reset Request</div>
    
    <p style="color: #b9bbbe; font-size: 0.95rem;">
      You requested to reset your password. Click the button below to proceed:
    </p>
    
    <div style="text-align: center;">
      <a href="${resetUrl}" class="reset-btn">Reset Password</a>
    </div>
    
    <p style="color: #99aab5; font-size: 0.85rem; text-align: center;">
      Or copy and paste this URL into your browser:
    </p>
    
    <div class="url-text">${resetUrl}</div>
    
    <p class="expiry">
      ⏱ This link will expire in 1 hour
    </p>
    
    <div class="warning">
      If you didn't request this reset, please ignore this email. Your password will remain unchanged.
    </div>
    
    <div class="footer">
      © 2026 Voxit Messenger. All rights reserved.
    </div>
  </div>
</body>
</html>
    `;

    const textContent = `Password Reset Request\n\nClick the link below to reset your password:\n\n${resetUrl}\n\nThis link will expire in 1 hour.\n\nIf you didn't request this reset, please ignore this email.`;

    try {
      await this.transporter.sendMail({
        from: `"Voxit" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Voxit Password Reset',
        text: textContent,
        html: htmlContent,
      });

      console.log(`[EMAIL SENT] Password reset link sent to ${email}`);
      return { message: 'Password reset link sent to email' };
    } catch (error) {
      console.error(`[EMAIL ERROR] Failed to send reset link to ${email}:`, error);
      throw new BadRequestException('Failed to send password reset email');
    }
  }

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    const resetToken = await this.prisma.passwordResetToken.findUnique({
      where: { token },
    });

    if (!resetToken) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    if (resetToken.used) {
      throw new BadRequestException('This reset token has already been used');
    }

    if (resetToken.expiresAt < new Date()) {
      await this.prisma.passwordResetToken.delete({
        where: { token },
      });
      throw new BadRequestException('Reset token has expired');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { email: resetToken.email },
      data: { passwordHash },
    });

    await this.prisma.passwordResetToken.update({
      where: { token },
      data: { used: true },
    });

    console.log(`[PASSWORD RESET] Password reset for ${resetToken.email}`);
    return { message: 'Password has been reset successfully' };
  }

  async sendCode(email: string): Promise<{ message: string }> {
    const existingEmail = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingEmail) {
      throw new ConflictException('This email is already registered');
    }

    await this.sendVerificationCode(email, '', '');
    return { message: 'Verification code sent to email' };
  }

  async sendVerificationCode(email: string, username: string, password: string): Promise<void> {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000;

    this.verificationCodes.set(email, {
      code,
      username,
      password,
      expiresAt,
    });

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background-color: #23272a;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 400px;
      margin: 40px auto;
      background-color: #2c2f33;
      border-radius: 8px;
      padding: 40px;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
    }
    .logo {
      text-align: center;
      color: #5865f2;
      font-size: 2.5rem;
      font-weight: bold;
      margin-bottom: 10px;
    }
    .title {
      text-align: center;
      color: #99aab5;
      font-size: 0.9rem;
      margin-bottom: 30px;
    }
    .code-box {
      background-color: #23272a;
      border-radius: 6px;
      padding: 20px;
      text-align: center;
      margin: 20px 0;
    }
    .code {
      font-size: 2rem;
      font-weight: bold;
      color: #5865f2;
      letter-spacing: 8px;
    }
    .footer {
      text-align: center;
      color: #72767d;
      font-size: 0.8rem;
      margin-top: 30px;
    }
    .warning {
      background-color: rgba(237, 66, 69, 0.1);
      border-left: 3px solid #ed4245;
      padding: 12px;
      margin-top: 20px;
      font-size: 0.85rem;
      color: #ed4245;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">Voxit</div>
    <div class="title">Email Verification</div>
    
    <p style="color: #b9bbbe; font-size: 0.95rem;">Your verification code is:</p>
    
    <div class="code-box">
      <div class="code">${code}</div>
    </div>
    
    <p style="color: #72767d; font-size: 0.85rem; text-align: center;">
      This code will expire in 5 minutes
    </p>
    
    <div class="warning">
      If you didn't request this code, please ignore this email.
    </div>
    
    <div class="footer">
      © 2026 Voxit Messenger. All rights reserved.
    </div>
  </div>
</body>
</html>
    `;

    const textContent = `Voxit Verification Code: ${code}\n\nThis code will expire in 5 minutes.\n\nIf you didn't request this code, please ignore this email.`;

    try {
      await this.transporter.sendMail({
        from: `"Voxit" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Voxit Verification Code',
        text: textContent,
        html: htmlContent,
      });

      console.log(`[EMAIL SENT] Verification code sent to ${email}`);
    } catch (error) {
      console.error(`[EMAIL ERROR] Failed to send code to ${email}:`, error);
      throw new BadRequestException('Failed to send verification email');
    }
  }

  async verifyCode(email: string, code: string): Promise<AuthResponse> {
    const record = this.verificationCodes.get(email);

    if (!record) {
      throw new BadRequestException('Verification code not found. Please register again.');
    }

    if (record.expiresAt < Date.now()) {
      this.verificationCodes.delete(email);
      throw new BadRequestException('Verification code expired. Please register again.');
    }

    if (record.code !== code) {
      throw new BadRequestException('Invalid verification code.');
    }

    this.verificationCodes.delete(email);

    const user = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        userId: true,
        shortId: true,
        username: true,
        email: true,
        avatar: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new BadRequestException('User not found.');
    }

    const tokens = await this.generateTokens(user.id, user.username, user.userId || '', true);

    return {
      ...tokens,
      user: {
        id: user.id,
        userId: user.userId || undefined,
        shortId: user.shortId,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        createdAt: user.createdAt,
      },
    };
  }

  private async generateTokens(userId: string, username: string, userUniqueId: string, rememberMe: boolean = false): Promise<Tokens> {
    const payload: JwtPayload = { sub: userId, username, userUniqueId };

    const accessTokenExpiresIn: string = rememberMe
      ? (process.env.JWT_EXPIRES_IN_REMEMBER || '30d')
      : (process.env.JWT_EXPIRES_IN_SESSION || '24h');

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: process.env.JWT_SECRET,
      expiresIn: accessTokenExpiresIn as '30d' | '24h',
    });

    const refreshTokenExpiresIn: string = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: refreshTokenExpiresIn as '7d',
    });

    return { accessToken, refreshToken };
  }

  async uploadAvatar(userId: string, avatarUrl: string): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        userId: true,
        shortId: true,
        username: true,
        email: true,
        avatar: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { avatar: avatarUrl },
    });

    return {
      id: user.id,
      userId: user.userId || undefined,
      shortId: user.shortId,
      username: user.username,
      email: user.email,
      avatar: avatarUrl,
      createdAt: user.createdAt,
    };
  }

  async removeAvatar(userId: string): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        userId: true,
        shortId: true,
        username: true,
        email: true,
        avatar: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { avatar: null },
    });

    return {
      id: user.id,
      userId: user.userId || undefined,
      shortId: user.shortId,
      username: user.username,
      email: user.email,
      avatar: null,
      createdAt: user.createdAt,
    };
  }

  async deleteAccount(userId: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Delete user from database
    await this.prisma.user.delete({
      where: { id: userId },
    });

    return { message: 'Account deleted successfully' };
  }
}
