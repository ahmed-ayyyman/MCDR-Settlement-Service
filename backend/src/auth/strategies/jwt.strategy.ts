import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { passportJwtSecret } from 'jwks-rsa';
import { ConfigService } from '@nestjs/config';

interface JwtPayload {
  sub: string;
  preferred_username: string;
  email: string;
  realm_access?: {
    roles: string[];
  };
}

export interface AuthenticatedUser {
  id: string;
  username: string;
  email: string;
  roles: string[];
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    const keycloakUrl = configService.get<string>('KEYCLOAK_AUTH_SERVER_URL');
    const realm = configService.get<string>('KEYCLOAK_REALM');
    const issuer =
      configService.get<string>('JWT_ISSUER') ||
      `${keycloakUrl}/realms/${realm}`;
    const audience = configService.get<string>('JWT_AUDIENCE');

    super({
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: `${keycloakUrl}/realms/${realm}/protocol/openid-connect/certs`,
      }),
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      issuer,
      ...(audience ? { audience } : {}),
      algorithms: ['RS256'],
    });
  }

  validate(payload: JwtPayload): AuthenticatedUser {
    return {
      id: payload.sub,
      username: payload.preferred_username,
      email: payload.email,
      roles: payload.realm_access?.roles ?? [],
    };
  }
}
