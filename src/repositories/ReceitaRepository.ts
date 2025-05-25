import { receitas, receitas_subtemas, Prisma, ingredientes } from "../../generated/prisma";

export interface ReceitaRepository {
    create(receita: Prisma.receitasUncheckedCreateInput): Promise<receitas>;
    update(id: number, receita: Prisma.receitasUncheckedUpdateInput): Promise<receitas>;
    delete(id: number): Promise<void>;
    findById(id: number): Promise<receitas & { receitas_subtemas: receitas_subtemas[], ingredientes: ingredientes[] } | null>;
    findAll(): Promise<(receitas & { receitas_subtemas: receitas_subtemas[], ingredientes: ingredientes[] })[]>;
    findAllByTheme(tema: string): Promise<(receitas & { receitas_subtemas: receitas_subtemas[], ingredientes: ingredientes[] })[]>;
    findAllVerifiedByTheme(tema: string): Promise<(receitas & { receitas_subtemas: receitas_subtemas[], ingredientes: ingredientes[] })[]>;
    findAllNotVerifiedByTheme(tema: string): Promise<(receitas & { receitas_subtemas: receitas_subtemas[], ingredientes: ingredientes[] })[]>;
    getReceitasPorSubtemas(tema: string, subtemas: string[]): Promise<(receitas & { receitas_subtemas: receitas_subtemas[], ingredientes: ingredientes[] })[]>;
    verify(id: number, verifyBy: string): Promise<receitas>;
}
