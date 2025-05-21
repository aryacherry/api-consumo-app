import { usuarios, Prisma } from "../../generated/prisma";

export interface UserRepository {
    create(user: Prisma.usuariosUncheckedCreateInput): Promise<usuarios>;
    update(email: string, user: Prisma.usuariosUncheckedUpdateInput): Promise<usuarios>;
    delete(email: string): Promise<void>;
    findByEmail(email: string): Promise<usuarios | null>;
    findAll(): Promise<usuarios[]>;
    login(email: string, senha: string): Promise<string | null>;
    resetPasswordRequest(email: string): Promise<void>;
    resetPassword(email: string, newPassword: string): Promise<void>;
}
