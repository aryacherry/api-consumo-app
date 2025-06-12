import { supabase } from '../supabase/client'
import { v4 as uuidv4 } from 'uuid'
import argon2 from 'argon2'
import jwt from 'jsonwebtoken'
import nodemailer from 'nodemailer'
import type { RequestHandler } from 'express'
import { PrismaUsuarioRepository } from '../repositories/prisma/PrismaUsuarioRepository'
import { z } from 'zod'

const userPrismaRepository = new PrismaUsuarioRepository()

const storeUserSchema = z.object({
    nome: z.string({
        required_error: 'Nome é obrigatório',
        invalid_type_error: 'Nome deve ser um texto',
    }).min(3, 'Nome deve ter pelo menos 3 caracteres.').max(51, 'Nome deve ter no máximo 51 caracteres.'),
    email: z.string({
        required_error: 'Email é obrigatório',
        invalid_type_error: 'Email deve ser um texto',
    }).email({
        message: 'Deve ser um email válido',
    }),
    telefone: z.string({
        required_error: 'Telefone é obrigatório',
        invalid_type_error: 'Telefone deve ser um texto',
    }).regex(/^\+?[1-9]\d{1,14}$/, 'Número de telefone inválido'),
    tokens: z.string({
        required_error: 'Tokens é obrigatório',
        invalid_type_error: 'Tokens deve ser um texto',
    }),
    senha: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres.').max(255, 'A senha deve ter no máximo 255 caracteres.'),
    nivelConsciencia: z.number().min(0, 'Nível de consciência deve ser pelo menos 0.').max(5, 'Nível de consciência deve ser no máximo 5.'),
    isMonitor: z.boolean(),
    fotoUsu: z.string().url().optional()
})

export const storeUser: RequestHandler = async (req, res, next) => {
    let uploadedImagePath = null
    try {
        const user = storeUserSchema.parse(req.body)
        const existingUser = await userPrismaRepository.findByEmail({
            email: user.email,
        })
        if (existingUser) {
            res.status(400).json({ errors: ['Usuário já existe'] })
            return
        }
        let fotoUsuarioURL: string | null = null

        if (req.file) {
            const uploadResult = await uploadImage(req.file)

            if (!uploadResult) {
                res.status(500).json({
                    error: 'Erro ao fazer upload da imagem',
                })
                return
            }
            fotoUsuarioURL = uploadResult.url
            uploadedImagePath = uploadResult.path
        }

        // O hash da senha é gerado aqui
        const hashedPassword = await argon2.hash(user.senha)

        const createdUser = await userPrismaRepository.create({
            email: user.email,
            senha: hashedPassword,
            nome: user.nome,
            telefone: user.telefone,
            nivel_consciencia: String(user.nivelConsciencia),
            is_monitor: user.isMonitor,
            tokens: user.tokens,
            foto_usuario: fotoUsuarioURL ?? '',
        })

        res.status(201).json({ user: createdUser })
        return
    } catch (error) {
        if (uploadedImagePath) {
            await supabase.storage
                .from('fotoPerfil')
                .remove([uploadedImagePath])
        }
        next(error)
    }
}


export const indexUser: RequestHandler = async (_req, res, next) => {
    try {
        const users = await userPrismaRepository.findAll()

        const sanitizedUsers = users.map((user) => ({
            email: user.email,
            nome: user.nome,
            telefone: user.telefone,
            nivel_consciencia: user.nivel_consciencia,
            isMonitor: user.is_monitor,
            foto_usuario: user.foto_usuario,
        }))

        res.json({ users: sanitizedUsers })
    } catch (error) {
        next(error)
    }
}

const showUserSchema = z.object({
    email: z.string({
        required_error: 'Email é obrigatório',
        invalid_type_error: 'Email deve ser um texto',
    }).email({
        message: 'Deve ser um email válido',
    }),
})

export const showUser: RequestHandler = async (req, res, next) => {
    try {
        const { email } = showUserSchema.parse(req.params)
        const user = await userPrismaRepository.findByEmail({
            email,
        })

        if (!user) {
            res.status(404).json({ errors: ['Usuário não encontrado'] })
            return
        }

        res.status(200).json({ user })
    } catch (error) {
        next(error)
    }
}

const updateUserBodySchema = z.object({
    nome: z.string({
        required_error: 'Nome é obrigatório',
        invalid_type_error: 'Nome deve ser um texto',
    })
        .min(3, 'Nome deve ter pelo menos 3 caracteres.')
        .max(51, 'Nome deve ter no máximo 51 caracteres.')
        .optional(),
    telefone: z.string({
        required_error: 'Telefone é obrigatório',
        invalid_type_error: 'Telefone deve ser um texto',
    }).regex(/^\+?[1-9]\d{1,14}$/, 'Número de telefone inválido').optional(),
    senha: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres.').max(255, 'A senha deve ter no máximo 255 caracteres.').optional(),
    nivelConsciencia: z.number().min(0, 'Nível de consciência deve ser pelo menos 0.').max(5, 'Nível de consciência deve ser no máximo 5.').optional(),
    isMonitor: z.boolean().optional(),
    fotoUsu: z.string().url().optional()
})

const updateUserParamsSchema = z.object({
    email: z.string({
        required_error: 'Email é obrigatório',
        invalid_type_error: 'Email deve ser um texto',
    }).email({
        message: 'Deve ser um email válido',
    }),
})

export const updateUser: RequestHandler = async (req, res, next) => {
    let uploadedImagePath = null

    try {
        const { email } = updateUserParamsSchema.parse(req.params)
        const updateDataParser = updateUserBodySchema.parse(req.body)

        const user = await userPrismaRepository.findByEmail({
            email,
        })

        if (!user) {
            res.status(400).json({ errors: ['Usuário não encontrado'] })
            return
        }

        let fotoUsuarioURL = user.foto_usuario

        if (req.file) {
            const uploadResult = await uploadImage(req.file)
            if (!uploadResult) {
                res.status(500).json({
                    error: 'Erro ao fazer upload da imagem',
                })
                return
            }

            fotoUsuarioURL = uploadResult.url
            uploadedImagePath = uploadResult.path
        }

        const updatedDataFormatter = {
            email,
            ...(updateDataParser.nome && { nome: updateDataParser.nome }),
            ...(updateDataParser.telefone !== undefined && { telefone: updateDataParser.telefone }),
            ...(updateDataParser.nivelConsciencia !== undefined && {
                nivel_consciencia: String(updateDataParser.nivelConsciencia),
            }),
            ...(updateDataParser.isMonitor !== undefined && { is_monitor: updateDataParser.isMonitor }),
            ...(updateDataParser.senha && { senha: await argon2.hash(updateDataParser.senha.trim()) }), // A senha só será atualizada se for fornecida
            foto_usuario: fotoUsuarioURL,
        }

        const userAtualizado = await userPrismaRepository.updateOne(updatedDataFormatter)

        res.json({ user: userAtualizado })
    } catch (error) {
        if (uploadedImagePath) {
            await supabase.storage
                .from('fotoPerfil')
                .remove([uploadedImagePath])
        }
        next(error)
    }
}

const deleteUserParamsSchema = z.object({
    email: z.string({
        required_error: 'Email é obrigatório',
        invalid_type_error: 'Email deve ser um texto',
    }).email({
        message: 'Deve ser um email válido',
    }),
})

export const deleteUser: RequestHandler = async (req, res, next) => {
    try {
        const { email } = deleteUserParamsSchema.parse(req.params)

        const user = await userPrismaRepository.findByEmail({
            email,
        })

        if (!user) {
            res.status(400).json({ errors: ['Usuário não encontrado'] })
            return
        }

        await userPrismaRepository.delete({ email })

        res.status(204).send()
    } catch (error) {
        next(error)
    }
}

const loginUserSchema = z.object({
    email: z
        .string({
            required_error: 'Email é obrigatório',
            invalid_type_error: 'Email deve ser um texto',
        })
        .email('Email inválido'),
    senha: z
        .string({
            required_error: 'Senha é obrigatória',
            invalid_type_error: 'Senha deve ser um texto',
        })
        .min(6, 'Senha deve ter pelo menos 6 caracteres'),
})

export const loginUser: RequestHandler = async (req, res, next) => {
    try {
        const { email, senha } = loginUserSchema.parse(req.body)

        const user = await userPrismaRepository.findByEmail({ email })

        if (!user) {
            res.status(400).json({ error: 'Usuário não encontrado' })
            return
        }

        const validPassword = await argon2.verify(user.senha, senha)

        if (!validPassword) {
            res.status(401).json({ error: 'Credenciais inválidas' })
            return
        }

        const token = jwt.sign(
            { userID: user.id, email: user.email },
            process.env.JWT_SECRET as string,
        )

        res.status(200).json({ message: 'Login bem-sucedido', token })
    } catch (error) {
        next(error)
    }
}

const resetPasswordRequestSchema = z.object({
    email: z.string({
        required_error: 'Email é obrigatório',
        invalid_type_error: 'Email deve ser um texto',
    }).email({
        message: 'Deve ser um email válido',
    }),
})

export const resetPasswordRequestUser: RequestHandler = async (req, res, next) => {
    try {
        const { email } = resetPasswordRequestSchema.parse(req.body)
        const user = await userPrismaRepository.findByEmail({ email })

        if (!user) {
            res.status(404).json({ error: 'Usuário não encontrado' })
            return
        }

        const token = jwt.sign(
            { email: user.email },
            process.env.JWT_SECRET as string,
            { expiresIn: '1h' },
        )

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            host: 'smtp.gmail.com',
            port: 465,
            secure: true,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        })

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: user.email,
            subject: 'Redefinição de Senha',
            html: `<p>Seu token de redefinição de senha é:</p><p><strong>${token}</strong></p>`,
        }

        await transporter.sendMail(mailOptions)

        res.status(200).json({
            message: 'Token de redefinição de senha enviado com sucesso',
        })
    } catch (error) {
        next(error)
    }
}

const resetPasswordParamsSchema = z.object({
    token: z.string({
        required_error: 'Token é obrigatório',
        invalid_type_error: 'Token deve ser um texto',
    }),
})
const resetPasswordBodySchema = z.object({
    newPassword: z.string({
        required_error: 'Nova senha é obrigatória',
        invalid_type_error: 'Nova senha deve ser um texto',
    }).min(6, 'Nova senha deve ter pelo menos 6 caracteres').max(255, 'Nova senha deve ter no máximo 255 caracteres'),
})

export const resetPasswordUser: RequestHandler = async (req, res, next) => {
    try {
        const { token } = resetPasswordParamsSchema.parse(req.params)
        const { newPassword } = resetPasswordBodySchema.parse(req.body)
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
            email: string
        }
        const email = decoded.email

        const hashedPassword = await argon2.hash(newPassword)

        await userPrismaRepository.updatePasswordByEmail(email, hashedPassword)

        res.status(200).json({ message: 'Senha atualizada com sucesso' })
        return
    } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            res.status(400).json({ error: 'Token expirado' })
            return
        }
        if (error instanceof jwt.JsonWebTokenError) {
            res.status(400).json({ error: 'Token inválido' })
            return
        }
        next(error)
        return
    }
}

async function uploadImage(file: Express.Multer.File) {
    try {
        const uniqueFileName = `${uuidv4()}-${file.originalname}`
        const { data, error } = await supabase.storage
            .from('fotoPerfil')
            .upload(uniqueFileName, file.buffer, {
                contentType: file.mimetype,
            })

        if (error)
            throw new Error(`Erro ao fazer upload da imagem: ${error.message}`)

        const { data: publicURL } = supabase.storage
            .from('fotoPerfil')
            .getPublicUrl(data.path)

        return { url: publicURL.publicUrl, path: data.path }
    } catch (error) {
        if (error instanceof Error) {
            throw new Error(`Erro ao fazer upload da imagem: ${error.message}`)
        }
    }
}
