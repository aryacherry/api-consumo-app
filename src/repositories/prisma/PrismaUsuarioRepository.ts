import type { UsuarioRepository } from '../UsuarioRepository'
import {
    type Prisma,
    PrismaClient,
    type usuarios,
} from '../../../generated/prisma/client'

export class PrismaUsuarioRepository implements UsuarioRepository {
    private prisma: PrismaClient

    constructor() {
        this.prisma = new PrismaClient()
    }

    async create(user: Prisma.usuariosUncheckedCreateInput) {
        return this.prisma.usuarios.create({
            data: user,
        })
    }

    async updateOne({
        email,
        foto_usuario,
        is_monitor,
        nivel_consciencia,
        nome,
        senha,
        telefone,
        tokens,
    }: {
        email: usuarios['email']
        foto_usuario?: usuarios['foto_usuario']
        is_monitor?: usuarios['is_monitor']
        nivel_consciencia?: usuarios['nivel_consciencia']
        nome?: usuarios['nome']
        senha?: usuarios['senha']
        telefone?: usuarios['telefone']
        tokens?: usuarios['tokens']
    }): Promise<usuarios> {
        return this.prisma.usuarios.update({
            where: { email },
            data: {
                ...(foto_usuario !== undefined && { foto_usuario }),
                ...(is_monitor !== undefined && { is_monitor }),
                ...(nivel_consciencia !== undefined && { nivel_consciencia }),
                ...(nome !== undefined && { nome }),
                ...(senha !== undefined && { senha }),
                ...(telefone !== undefined && { telefone }),
                ...(tokens !== undefined && { tokens }),
            },
        })
    }

    async updatePasswordByEmail(email: string, senha: string): Promise<void> {
        await this.prisma.usuarios.update({
            where: { email },
            data: { senha },
        })
    }

    async delete({ email }: Pick<usuarios, 'email'>) {
        await this.prisma.usuarios.delete({
            where: { email },
        })
    }

    async findAll() {
        return this.prisma.usuarios.findMany()
    }

    async findByEmail({ email }: Pick<usuarios, 'email'>) {
        return this.prisma.usuarios.findUnique({
            where: { email },
        })
    }

    async getMonitorStatusByEmail({
        email,
    }: Pick<usuarios, 'email'>): Promise<boolean | null> {
        const statusMonitor = await this.prisma.usuarios.findUnique({
            where: { email },
            select: { is_monitor: true },
        })
        return statusMonitor ? statusMonitor.is_monitor : null
    }
}
