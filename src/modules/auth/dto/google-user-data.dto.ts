export class GoogleUserDataDto {
  id: string;
  displayName: string | null;
  name: {
    givenName: string | null;
    familyName: string | null;
  };
  emails: {
    value: string | null;
    verified: boolean;
  }[];
  photos: {
    value: string | null;
  }[];
  provider: string | null;
  _raw: string | null;
  _json: {
    sub: string | null;
    name: string | null;
    given_name: string | null;
    family_name: string | null;
    picture: string | null;
    email: string | null;
    email_verified: boolean | null;
  };
}
