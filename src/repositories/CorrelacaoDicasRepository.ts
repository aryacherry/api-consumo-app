import { Prisma, dicas_subtemas} from "../../generated/prisma";

export interface CorrelacaoDicasRepository {
    create(correlacaoDicas: Prisma.dicas_subtemasUncheckedCreateInput): Promise<dicas_subtemas>;
    findByDicaId(dicaId: number): Promise<dicas_subtemas[]>;
    delete(dicaId: number): Promise<void>;
}