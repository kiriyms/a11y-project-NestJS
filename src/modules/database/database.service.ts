import {
  Injectable,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import {
  PrismaClient,
  User,
  Report,
  Session,
  Prisma,
  VerificationToken,
  ResetPasswordToken,
  ReportStatus,
  SubscriptionStatus,
} from '@prisma/client';

@Injectable()
export class DatabaseService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  async getUsers(): Promise<User[]> {
    return this.user.findMany();
  }

  // also add this method without including reports
  async getUserById(id: string): Promise<User | null> {
    return this.user.findUnique({
      where: { id },
      include: { reports: { orderBy: { createdAt: 'desc' } } },
    });
  }

  // also add this method without including reports
  async getUserByEmail(email: string): Promise<User | null> {
    return this.user.findUnique({
      where: { email },
      include: { reports: { orderBy: { createdAt: 'desc' } } },
    });
  }

  async getUserByStrpeSubscriptionId(
    stripeSubscriptionId: string,
  ): Promise<User | null> {
    return this.user.findUnique({
      where: { stripeSubscriptionId },
    });
  }

  async getUserReports(id: string): Promise<Report[] | null> {
    return this.report.findMany({
      where: { userId: id },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createUser(
    email: string,
    passwordHash: string | null,
    isVerified: boolean,
    isOAuth: boolean,
  ): Promise<User> {
    if (isOAuth) {
      return this.user.create({
        data: {
          email,
          isVerified,
          isOAuth,
        },
      });
    }

    return this.user.create({
      data: {
        email,
        passwordHash,
        isVerified,
        isOAuth,
      },
    });
  }

  async updateUserIsVerified(id: string, isVerified: boolean): Promise<User> {
    return this.user.update({
      where: { id },
      data: {
        isVerified,
      },
    });
  }

  async updateUserPasswordHash(
    id: string,
    passwordHash: string,
  ): Promise<User> {
    return this.user.update({
      where: { id },
      data: {
        passwordHash,
      },
    });
  }

  async updateUserSubscriptionStatus(
    id: string,
    subscription: SubscriptionStatus,
  ): Promise<User> {
    return this.user.update({
      where: { id },
      data: {
        subscription,
      },
    });
  }

  async updateUserStripeCustomerId(
    id: string,
    stripeCustomerId: string,
  ): Promise<User> {
    return this.user.update({
      where: { id },
      data: {
        stripeCustomerId,
      },
    });
  }

  async updateUserStripeSubscriptionId(
    id: string,
    stripeSubscriptionId: string,
  ): Promise<User> {
    return this.user.update({
      where: { id },
      data: {
        stripeSubscriptionId,
      },
    });
  }

  async overrideSession(
    userId: string,
    accessTokenHash: string,
    refreshTokenHash: string,
  ): Promise<Session> {
    return this.$transaction(async (prisma) => {
      const session = await this.session.findFirst({
        where: { userId },
      });

      console.log(`old session: ${JSON.stringify(session)}`);
      console.log(
        `new hashes: ${JSON.stringify({ accessTokenHash, refreshTokenHash })}`,
      );

      if (session) {
        return this.session.update({
          where: { id: session.id },
          data: {
            accessTokenHash,
            refreshTokenHash,
          },
        });
      }

      return this.session.create({
        data: {
          accessTokenHash,
          refreshTokenHash,
          user: {
            connect: { id: userId },
          },
        },
      });
    });
  }

  async deleteSession(userId: string): Promise<Session> {
    const session = await this.getSessionByUserId(userId);

    return this.session.delete({
      where: { id: session.id },
    });
  }

  async getSessionByUserId(userId: string): Promise<Session> {
    const session = await this.session.findFirst({
      where: { userId },
    });

    if (!session) {
      throw new NotFoundException('session not found');
    }

    return session;
  }

  async getVerificationTokenByUserId(
    userId: string,
  ): Promise<VerificationToken> {
    const token = await this.verificationToken.findFirst({
      where: { userId },
    });

    if (!token) {
      throw new NotFoundException('verification token not found');
    }

    return token;
  }

  async overrideVerificationToken(
    userId: string,
    tokenHash: string,
  ): Promise<VerificationToken> {
    return this.$transaction(async (prisma) => {
      const verificationToken = await this.verificationToken.findFirst({
        where: { userId },
      });

      console.log(
        `old verification token: ${JSON.stringify(verificationToken)}`,
      );
      console.log(`new hash: ${JSON.stringify({ tokenHash })}`);

      if (verificationToken) {
        return this.verificationToken.update({
          where: { id: verificationToken.id },
          data: {
            tokenHash,
          },
        });
      }

      return this.verificationToken.create({
        data: {
          tokenHash,
          user: {
            connect: { id: userId },
          },
        },
      });
    });
  }

  async getResetPasswordTokenByUserId(
    userId: string,
  ): Promise<ResetPasswordToken> {
    const token = await this.resetPasswordToken.findFirst({
      where: { userId },
    });

    if (!token) {
      throw new NotFoundException('reset password token not found');
    }

    return token;
  }

  async overrideResetPasswordToken(
    userId: string,
    tokenHash: string,
  ): Promise<ResetPasswordToken> {
    return this.$transaction(async (prisma) => {
      const resetPasswordToken = await this.resetPasswordToken.findFirst({
        where: { userId },
      });

      console.log(
        `old reset password token: ${JSON.stringify(resetPasswordToken)}`,
      );
      console.log(`new hash: ${JSON.stringify({ tokenHash })}`);

      if (resetPasswordToken) {
        return this.resetPasswordToken.update({
          where: { id: resetPasswordToken.id },
          data: {
            tokenHash,
          },
        });
      }

      return this.resetPasswordToken.create({
        data: {
          tokenHash,
          user: {
            connect: { id: userId },
          },
        },
      });
    });
  }

  async createReport(userId: string, domain: string): Promise<Report> {
    return this.report.create({
      data: {
        domain,
        user: {
          connect: { id: userId },
        },
      },
    });
  }

  async getUserReportsByUserId(userId: string): Promise<Report[]> {
    return this.report.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getReportUserById(reportId: string): Promise<User> {
    const report = await this.report.findUnique({
      where: { id: reportId },
      include: { user: true },
    });

    if (!report) {
      throw new NotFoundException('report not found');
    }

    return report.user;
  }

  async getReportById(id: string): Promise<Report> {
    const report = await this.report.findUnique({
      where: { id },
    });

    if (!report) {
      throw new NotFoundException('report not found');
    }

    return report;
  }

  async updateReportStatusById(
    id: string,
    status: ReportStatus,
    fileName: string,
  ): Promise<Report> {
    const report = await this.report.findUnique({
      where: { id },
    });

    if (!report) {
      throw new NotFoundException('report not found');
    }

    return this.report.update({
      where: { id },
      data: { status, fileName },
    });
  }
}
