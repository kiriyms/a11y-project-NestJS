export class JwtVerifyPayloadDto {
  sub: string;
  iat?: number;
  exp?: number;
}
