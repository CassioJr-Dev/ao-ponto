import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { CriarCorteDto } from './dto/criar-corte.dto';

@Injectable()
export class CortesRepository {
  constructor(private readonly prisma: PrismaService) {}

  listarDisponiveis() {
    return this.prisma.corte.findMany({
      where: { disponivel: true },
      select: {
        id: true,
        nome: true,
        imagemUrl: true,
        precoKg: true,
        disponivel: true,
      },
      orderBy: { nome: 'asc' },
    });
  }

  criar(dto: CriarCorteDto) {
    return this.prisma.corte.create({
      data: {
        nome: dto.nome,
        imagemUrl: dto.imagemUrl,
        precoKg: new Prisma.Decimal(dto.precoKg),
        disponivel: dto.disponivel ?? true,
      },
      select: {
        id: true,
        nome: true,
        imagemUrl: true,
        precoKg: true,
        disponivel: true,
      },
    });
  }
}
