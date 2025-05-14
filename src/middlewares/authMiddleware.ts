import jwt, { JwtPayload } from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';

dotenv.config();

interface AuthenticatedRequest extends Request {
    user: JwtPayload;
}

async function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    let token = req.headers['authorization'];
    if(!token) return res.status(401).json({ message: 'Token não fornecido'});

    try{
        let decoded = jwt.verify(token, process.env.JWT_SECRET as string);
        req.user = decoded as JwtPayload;
        next(); 
    } catch (error) {
        return res.status(400).json({ message: 'Token Inválido ou erro de autenticação'});
    };
};
export default authMiddleware;
