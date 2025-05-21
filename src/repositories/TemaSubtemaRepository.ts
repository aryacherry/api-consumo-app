import { Prisma, temasubtema } from "../../generated/prisma";

export interface TemaSubtemaRepository {
    create(temaSubtema: Prisma.temasubtemaUncheckedCreateInput): Promise<temasubtema>;
    findByTemaAndSubtema({ tema, subtema }: Pick<temasubtema, "tema" | "subtema">): Promise<temasubtema[]>;
}
