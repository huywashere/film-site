import { Controller, Get, Put, Body, Param, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get(':username')
  getProfile(@Param('username') username: string) {
    return this.usersService.getProfile(username);
  }

  @Get(':username/activity')
  getActivity(@Param('username') username: string) {
    return this.usersService.getRecentActivity(username);
  }

  @Put('me')
  @UseGuards(AuthGuard('jwt'))
  updateMe(
    @Request() req,
    @Body() dto: { displayName?: string; bio?: string; avatarUrl?: string },
  ) {
    return this.usersService.updateMe(req.user.id, dto);
  }
}
