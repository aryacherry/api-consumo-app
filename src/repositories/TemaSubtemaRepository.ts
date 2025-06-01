import { Prisma, subtemas } from "../../generated/prisma";

export interface TemaSubtemaRepository {
    create(subtema: Prisma.subtemasUncheckedCreateInput): Promise<subtemas>;
    findByTemaAndSubtema({ temaId }: { temaId?: NonNullable<subtemas['tema_id']>; subtemaId?: NonNullable<subtemas['id']> }): Promise<subtemas[]>;
    getSubtemasByTema({ temaId }: { temaId: NonNullable<subtemas['tema_id']> }): Promise<subtemas[]>;
}
