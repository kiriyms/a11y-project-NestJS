import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { ROLES_KEY } from 'src/decorators/roles.decorator';
import { JwtPayloadDto } from 'src/modules/auth/dto/jwt-payload.dto';
import { DatabaseService } from 'src/modules/database/database.service';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly databaseService: DatabaseService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const payload: JwtPayloadDto = context.switchToHttp().getRequest().user;
    const user = await this.databaseService.getUserById(payload.sub);
    if (!user) {
      return false;
    }
    const isRequiredRolesExist = requiredRoles.some(
      (role) => user.role === role,
    );
    console.log(`user: ${user.role}, required: ${requiredRoles}`);

    return isRequiredRolesExist;
  }
}
