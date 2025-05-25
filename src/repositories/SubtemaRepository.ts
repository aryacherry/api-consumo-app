import { Prisma, subtemas } from "../../generated/prisma";

export interface SubtemaRepository {
    create(subtema: Prisma.subtemasUncheckedCreateInput): Promise<subtemas>;
    findById(id: number): Promise<subtemas | null>;
    findAll(): Promise<subtemas[]>;
    update(id: number, subtema: Prisma.subtemasUncheckedUpdateInput): Promise<subtemas | null>;
    delete(id: number): Promise<void>;
}
