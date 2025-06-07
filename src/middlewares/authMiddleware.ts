import jwt, { JwtPayload } from 'jsonwebtoken';
import { Request, Response, NextFunction, RequestHandler } from 'express';
import dotenv from 'dotenv';

dotenv.config();
declare global {
    namespace Express {
        interface Request {
            user: JwtPayload;
        }
    }
}

const authMiddleware: RequestHandler = async(req: Request, res: Response, next: NextFunction)  =>{
    let authHeader = req.headers['authorization'];
    const parts = authHeader.split(' ');

    if (parts.length !== 2) {
        return res.status(401).json({error: 'Token mal formatado'});
    }

    const [scheme, token] = parts;

    if (!/^Bearer$/i.test(scheme)) {
        return res.status(401).json({error: 'Token mal formatado'});
    }

    try{    
        let decoded = jwt.verify(token, process.env.JWT_SECRET as string);
        req.user = decoded as JwtPayload;
        next(); 
    } catch (error) {
       res.status(400).json({ message: 'Token Inválido ou erro de autenticação'});
    };
};
export default authMiddleware;
