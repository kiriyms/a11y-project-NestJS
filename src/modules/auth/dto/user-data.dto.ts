import { $Enums } from '@prisma/client';

export class UserDataDto {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  organization: string | null;
  isOAuth: boolean;
  isActive: boolean;
  isVerified: boolean;
  role: $Enums.Role;
  subscription: $Enums.SubscriptionStatus;
  remainingReports: number;
  createdAt: Date;
  updatedAt: Date;
}
