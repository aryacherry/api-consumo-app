import { dicas, dicas_subtemas, Prisma } from "../../generated/prisma";

export interface DicaRepository {
    create(data: Prisma.dicasUncheckedCreateInput): Promise<dicas>;
    update(dica: Prisma.dicasUncheckedUpdateInput): Promise<dicas>;
    findAllWithCorrelacaoOrderById(): Promise<(dicas & { dicas_subtemas: dicas_subtemas[] })[]>;
}