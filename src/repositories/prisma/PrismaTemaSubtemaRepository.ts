import { Prisma, subtemas } from "../../../generated/prisma";
import { TemaSubtemaRepository } from "../TemaSubtemaRepository";
import { PrismaClient } from "../../../generated/prisma/client";

export class PrismaTemaSubtemaRepository implements TemaSubtemaRepository {
    private prisma: PrismaClient;
    
    constructor() {
        this.prisma = new PrismaClient();
    }
    
    async create({ tema_id, nome, descricao }: Prisma.subtemasUncheckedCreateInput) {
        return this.prisma.subtemas.create({
            data: {
                tema_id,
                nome,
                descricao,
            }
        });
    }

    async findByTemaAndSubtema({ temaId }: { temaId?: NonNullable<subtemas['tema_id']>; subtemaId?: NonNullable<subtemas['id']> }) {
        return this.prisma.subtemas.findMany({
            where: {
                tema_id: temaId
            }
        });
    }

    async getSubtemasByTema({ temaId }: { temaId: NonNullable<subtemas['tema_id']> }) {
        return this.prisma.subtemas.findMany({
            where: { tema_id: temaId }
        });
    }
}

export default new PrismaTemaSubtemaRepository();