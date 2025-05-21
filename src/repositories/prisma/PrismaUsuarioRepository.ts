import { UsuarioRepository } from '../UsuarioRepository';
import { PrismaClient } from '../../../generated/prisma/client';

export class PrismaUsuarioRepository implements UsuarioRepository {
    private prisma: PrismaClient;

    constructor() {
        this.prisma = new PrismaClient();
    }

    async findByEmail(email: string) {
        return this.prisma.usuarios.findUnique({
            where: { email },
        });
    }

    async getMonitorStatusByEmail(email: string) {
        const statusMonitor = await this.prisma.usuarios.findUnique({
            where: { email },
            select: { ismonitor: true },
        });

        return Boolean(statusMonitor);
    }
}