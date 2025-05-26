import { Prisma, PrismaClient, dicas, dicas_subtemas } from "../../../generated/prisma";
import { DicaRepository } from "../DicaRepository";

export class PrismaDicaRepository implements DicaRepository {
    private prisma: PrismaClient;
    constructor(){
        this.prisma = new PrismaClient();
    }
    create({ 
        usuario_id, 
        verify_by,
        titulo,
        conteudo,
        data_criacao,
        data_alteracao,
        is_verify,
        is_created_by_specialist
    }: Prisma.dicasUncheckedCreateInput): Promise<dicas> {
        return this.prisma.dicas.create({
            data: {
                usuario_id,
                verify_by,
                titulo,
                conteudo,
                data_criacao,
                data_alteracao,
                is_created_by_specialist,
                is_verify
            }
        });
    }
    update(dica: Prisma.dicasUncheckedUpdateInput): Promise<dicas> {
        throw new Error("Method not implemented.");
    }
    findAllWithCorrelacaoOrderById(): Promise<(dicas & { dicas_subtemas: dicas_subtemas[]; })[]> {
        throw new Error("Method not implemented.");
    }
    
}