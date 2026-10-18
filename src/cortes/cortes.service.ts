import { Injectable } from '@nestjs/common';
import { CriarCorteDto } from './dto/criar-corte.dto';
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
}
