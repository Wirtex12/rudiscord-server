import { IsString, IsNotEmpty } from 'class-validator';

export class SendFriendRequestDto {
  @IsString()
  @IsNotEmpty()
  userId: string;
}

export class AcceptFriendRequestDto {
  @IsString()
  @IsNotEmpty()
  requestId: string;
}

export class DeclineFriendRequestDto {
  @IsString()
  @IsNotEmpty()
  requestId: string;
}

export class RemoveFriendDto {
  @IsString()
  @IsNotEmpty()
  friendId: string;
}
