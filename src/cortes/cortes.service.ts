import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CriarCorteDto } from './dto/criar-corte.dto';
import { AtualizarCorteDto } from './dto/atualizar-corte.dto';
import { CortesRepository } from './cortes.repository';

@Injectable()
export class CortesService {
  constructor(private readonly repository: CortesRepository) {}

  listarDisponiveis() {
    return this.repository.listarDisponiveis();
  }

  criar(dto: CriarCorteDto) {
    return this.repository.criar(dto);
  }

  listarTodos() {
    return this.repository.listarTodos();
  }

  async atualizar(id: string, dto: AtualizarCorteDto) {
    try {
      return await this.repository.atualizar(id, dto);
    } catch (error) {
      this.tratarErroPrisma(error);
    }
  }

  async deletar(id: string) {
    try {
      await this.repository.deletar(id);
    } catch (error) {
      this.tratarErroPrisma(error);
    }
  }

  private tratarErroPrisma(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        throw new NotFoundException('Corte não encontrado.');
      }
      if (error.code === 'P2003') {
        throw new ConflictException(
          'Não é possível excluir um corte associado a pedidos.',
        );
      }
    }
    throw error;
  }
}
