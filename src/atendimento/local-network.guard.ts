import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';

function ipv4Parts(address: string): number[] | null {
  const parts = address.split('.').map(Number);
  return parts.length === 4 && parts.every((part) => part >= 0 && part <= 255)
    ? parts
    : null;
}

export function isLocalNetworkAddress(rawAddress: string | undefined) {
  if (!rawAddress) return false;
  const address = rawAddress.toLowerCase().replace(/^::ffff:/, '');
  if (
    address === '::1' ||
    address.startsWith('fe80:') ||
    address.startsWith('fc') ||
    address.startsWith('fd')
  )
    return true;

  const parts = ipv4Parts(address);
  if (!parts) return false;
  const [first, second] = parts;
  return (
    first === 10 ||
    first === 127 ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168) ||
    (first === 169 && second === 254)
  );
}

@Injectable()
export class LocalNetworkGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();
    if (isLocalNetworkAddress(request.ip)) return true;
    throw new ForbiddenException(
      'O painel está disponível somente na rede local.',
    );
  }
}
