import { usuarios } from "../../generated/prisma/client";

export interface UsuarioRepository {
    findByEmail(email: string): Promise<usuarios | null>;
    getMonitorStatusByEmail(email: string): Promise<boolean>;
}