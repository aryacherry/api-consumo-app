import { tema, temasubtema, Prisma } from "../../generated/prisma";

export interface TemaRepository {
    findAll(): Promise<tema[]>;
    findById(id: number): Promise<tema | null>;
    delete(id: number): Promise<void>;
    getSubtemasByTema(tema: string): Promise<temasubtema[]>;
    checkIfExists(id: number): Promise<boolean>;
}
