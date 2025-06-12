import { supabase } from '../supabase/client'
import type { RequestHandler } from 'express'
import { PrismaUsuarioRepository } from '../repositories/prisma/PrismaUsuarioRepository'
import { PrismaReceitaRepository } from '../repositories/prisma/PrismaReceitaRepository'
import { PrismaSubtemaRepository } from '../repositories/prisma/PrismaSubtemaRepository'
import { z } from 'zod'
import { PrismaTemaRepository } from '../repositories/prisma/PrismaTemaRepository'

const receitaSchema = z.object({
    titulo: z.string({
        required_error: 'O título é obrigatório',
        invalid_type_error: 'O título deve ser uma string',
    }),
    conteudo: z.string({
        required_error: 'O conteúdo é obrigatório',
        invalid_type_error: 'O conteúdo deve ser uma string',
    }),
    idUsuario: z
        .string({
            required_error: 'O ID do usuário é obrigatório',
            invalid_type_error: 'O ID do usuário deve ser uma string',
        })
        .uuid({
            message: 'O ID do usuário deve ser um UUID válido',
        }),
    tema: z.string({
        required_error: 'O tema é obrigatório',
        invalid_type_error: 'O tema deve ser uma string',
    }),
    subtemas: z.array(
        z
            .string({
                required_error: 'Subtemas são obrigatórios',
                invalid_type_error:
                    'Os subtemas devem ser uma lista de strings',
            })
            .min(1, 'Pelo menos um subtema é obrigatório'),
    ),
})
export const create: RequestHandler = async (req, res, next) => {
    try {
        const { titulo, conteudo, idUsuario, tema, subtemas } =
            receitaSchema.parse(req.body)
        const files = req.files as Express.Multer.File[] | undefined
        const userRepository = new PrismaUsuarioRepository()
        const userExists = await userRepository.findByEmail({
            email: idUsuario,
        })
        if (!userExists) {
            res.status(404).json({ error: 'Usuário não encontrado' })
            return
        }
        const temaRepository = new PrismaTemaRepository()
        let temaExists = await temaRepository.findByName({ nome: tema })
        if (!temaExists) {
            temaExists = await temaRepository.create({
                nome: tema,
                descricao: `Tema ${tema} criado automaticamente`,
            })
        }
        const subtemaRepository = new PrismaSubtemaRepository()
        for (const subtema of subtemas) {
            let subtemaExists = await subtemaRepository.findByName({
                nome: subtema,
            })
            if (!subtemaExists) {
                subtemaExists = await subtemaRepository.create({
                    tema_id: temaExists.id,
                    nome: subtema,
                    descricao: `Subtema ${subtema} criado automaticamente`,
                })
            }
        }
        const receitaRepository = new PrismaReceitaRepository()
        const receitaCriada = await receitaRepository.create({
            conteudo,
            titulo,
            usuario_id: userExists.id,
            tema_id: temaExists.id,
            is_verify: false,
            image_source: 'null',
        })
        const imageUrls: string[] = []
        if (!files || files.length === 0) {
            res.status(201).json({ receita: receitaCriada, fotos: [] })
            return
        }
        for (const file of files) {
            const fileName = `${receitaCriada.id}-${Date.now()}-${file.originalname}`
            const { error: uploadError } = await supabase.storage
                .from('fotosReceitas')
                .upload(fileName, file.buffer, {
                    contentType: file.mimetype,
                })

            if (uploadError) throw uploadError

            const {
                data: { publicUrl },
            } = supabase.storage.from('fotosReceitas').getPublicUrl(fileName)

            const { error: fotoError } = await supabase
                .from('fotosReceitas')
                .insert({
                    idFoto: Date.now(),
                    id: receitaCriada.id,
                    url: publicUrl,
                    createdAt: new Date().toISOString(),
                })

            if (fotoError) throw fotoError
            imageUrls.push(publicUrl)
        }

        await receitaRepository.update(receitaCriada.id, {
            image_source: Buffer.from(
                JSON.stringify(imageUrls),
                'utf-8',
            ).toString('base64'),
        })
        res.status(201).json({ receita: receitaCriada, fotos: imageUrls })
        return
    } catch (error) {
        next(error)
    }
}

export const getAll: RequestHandler = async (_req, res, next) => {
    try {
        const receitaRepository = new PrismaReceitaRepository()
        const temaRepository = new PrismaTemaRepository()
        const subtemaRepository = new PrismaSubtemaRepository()
        const receitas = await receitaRepository.findAll()
        const receitasFormatadas = await Promise.all(receitas.map(
            async (receita) => {
                const tema = await temaRepository.findById({
                    id: receita.tema_id,
                })
                const subtemas = await subtemaRepository.findByTemaId({
                    tema_id: receita.tema_id,
                })
                let fotos: string
                try {
                    fotos = JSON.parse(
                        Buffer.from(receita.image_source, 'base64').toString(
                            'utf-8',
                        ))
                } catch (_error) {
                    fotos = receita.image_source
                }
                return {
                    id: receita.id,
                    titulo: receita.titulo,
                    conteudo: receita.conteudo,
                    isVerify: receita.is_verify,
                    usuarioId: receita.usuario_id,
                    tema: tema?.nome || null,
                    subtemas: subtemas.map((subtema) => subtema.nome),
                    ingredientes: receita.ingredientes,
                    fotos,
                }
            },
        ))
        res.status(200).json({ receitas: receitasFormatadas })
        return
    } catch (error) {
        next(error)
    }
}

export const getById: RequestHandler = async (req, res, next) => {
    try {
        const { id } = req.params
        const receitaRepository = new PrismaReceitaRepository()
        const receita = await receitaRepository.findById(id)
        if (!receita) {
            res.status(404).json({ error: 'Receita não encontrada' })
            return
        }
        res.status(200).json({ receita })
        return
    } catch (error) {
        next(error)
    }
}
const receitaUpdateSchema = z.object({
    titulo: z.string().optional(),
    conteudo: z.string().optional(),
    ingredientes: z
        .array(
            z.object({
                nome: z.string(),
                quantidade: z.string(),
                medida: z.string(),
            }),
        )
        .optional(),
})
export const update: RequestHandler = async (req, res, next) => {
    const imageUrls: string[] = []
    try {
        const { titulo, conteudo, ingredientes } =
            receitaUpdateSchema.parse(req.body)
        const { id } = req.params
        const files = req.files as Express.Multer.File[] | undefined

        const receitaRepository = new PrismaReceitaRepository()
        const receita = await receitaRepository.findById(id)
        if (!receita) {
            res.status(404).json({ error: 'Receita não encontrada' })
            return
        }
        const receitasAtualizadas = await receitaRepository.update(id, {
            titulo: titulo || receita.titulo,
            conteudo: conteudo || receita.conteudo,
            ...(ingredientes && ingredientes),
        })

        if (files && files.length > 0) {
            for (const file of files) {
                const { error: uploadError } = await supabase.storage
                    .from('fotosReceitas')
                    .upload(`receitas/${receita.id}/${file.originalname}`, file.buffer, {
                        contentType: file.mimetype,
                    })

                if (uploadError) throw uploadError

                const {
                    data: { publicUrl },
                } = supabase.storage.from('fotosReceitas').getPublicUrl(file.originalname)

                const { error: fotoError } = await supabase
                    .from('fotosReceitas')
                    .insert({
                        idFoto: Date.now(),
                        id: receita.id,
                        url: publicUrl,
                        createdAt: new Date().toISOString(),
                    })

                if (fotoError) throw fotoError
                imageUrls.push(publicUrl)
            }

            await receitaRepository.update(receita.id, {
                image_source: Buffer.from(
                    JSON.stringify(imageUrls),
                    'utf-8',
                ).toString('base64'),
            })
        }
        res.status(200).json({
            receitas: receitasAtualizadas,
            fotos: imageUrls,
        })
        return
    } catch (error) {
        if (imageUrls.length > 0) {
            for (const url of imageUrls) {
                const fileName: string | undefined = url
                    .split('/fotosReceitas/')
                    .pop()
                if (fileName) {
                    await supabase.storage
                        .from('fotosReceitas')
                        .remove([fileName])
                }
            }
        }
        next(error)
    }
}

export const deletar: RequestHandler = async (req, res, next) => {
    try {
        const receitaRepository = new PrismaReceitaRepository()

        const { id } = req.params

        const receita = await receitaRepository.findById(id)

        if (!receita) {
            res.status(404).json({
                error: 'Receita não encontrada',
            })
            return
        }

        await receitaRepository.delete(id)

        res.json({
            message: 'Receita deletada com sucesso',
        })
        return
    } catch (error) {
        next(error)
    }
}

export const verify: RequestHandler = async (req, res, next) => {
    try {
        const receitaRepository = new PrismaReceitaRepository()
        const userRepository = new PrismaUsuarioRepository()
        const { verifyBy } = req.params
        const { id, email } = req.params

        if (!verifyBy) {
            res.status(400).json({
                error: 'O parâmetro verifyBy é obrigatório',
            })
            return
        }

        const users = await userRepository.findByEmail({ email })

        if (!users) {
            res.status(404).json({
                error: `O usuário com o email ${verifyBy} não foi encontrado.`,
            })
            return
        }

        if (!users.is_monitor) {
            res.status(400).json({
                error: `O usuário com o email ${verifyBy} não é um monitor.`,
            })
            return
        }

        const receitaAtualizada = await receitaRepository.update(id, {
            is_verify: true,
            verify_by: verifyBy,
            data_alteracao: new Date(),
        })

        if (!receitaAtualizada) {
            res.status(404).json({
                error: 'Receita não encontrada',
            })
            return
        }

        res.json({
            message: 'Receita verificada com sucesso',
            data: receitaAtualizada,
        })
        return
    } catch (error) {
        next(error)
    }
}

export const getAllVerifiedByTheme: RequestHandler = async (
    req,
    res,
    next,
) => {
    try {
        const { tema } = req.params
        const receitaRepository = new PrismaReceitaRepository()

        const temaRepository = new PrismaTemaRepository()
        const temaExists = await temaRepository.findByName({ nome: tema })
        if (!temaExists) {
            res.status(400).json({
                error: `O tema ${tema} não é um tema válido.`,
            })
            return
        }

        const receitas = await receitaRepository.findAllVerifiedByTheme(tema)

        if (!receitas.length) {
            res.status(404).json({
                error: 'Nenhuma receita encontrada',
            })
            return
        }

        const receitaComDetalhes = receitas.map((receita) => {
            // Depois, analisar para ver se está tudo certo
            const subtemasSet = new Set(
                receita.receitas_subtemas.map((rel) => rel.subtema_id),
            )

            return {
                id: receita.id,
                titulo: receita.titulo,
                conteudo: receita.conteudo,
                isVerify: receita.is_verify,
                idUsuario: receita.usuario_id,
                verifyBy: receita.verify_by,
                dataCriacao: receita.data_criacao,
                ultimaAlteracao: receita.data_alteracao,
                tema: tema,
                subtemas: Array.from(subtemasSet),
                fotos: receita.image_source ? [receita.image_source] : [],
            }
        })
        res.status(200).json({ receitas: receitaComDetalhes })
    } catch (error) {
        next(error)
    }
}

export const getAllNotVerifiedByTheme: RequestHandler = async (
    req,
    res,
    next,
) => {
    try {
        const { tema } = req.params
        const receitaRepository = new PrismaReceitaRepository()

        const temaRepository = new PrismaTemaRepository()
        const temaExists = await temaRepository.findByName({ nome: tema })

        if (!temaExists) {
            res.status(400).json({
                error: `O tema ${tema} não é um tema válido.`,
            })
            return
        }

        const receitas = await receitaRepository.findAllNotVerifiedByTheme(tema)

        if (!receitas.length) {
            res.status(404).json({
                error: 'Nenhuma receita encontrada',
            })
            return
        }

        const receitaComDetalhes = receitas.map((receita) => {
            // Depois, analisar para ver se isso está funcionando
            const subtemasSet = new Set(
                receita.receitas_subtemas.map((rel) => rel.subtema_id),
            )

            return {
                id: receita.id,
                titulo: receita.titulo,
                conteudo: receita.conteudo,
                isVerify: receita.is_verify,
                idUsuario: receita.usuario_id,
                verifyBy: receita.verify_by,
                dataCriacao: receita.data_criacao,
                ultimaAlteracao: receita.data_alteracao,
                tema: tema,
                subtemas: Array.from(subtemasSet),
                fotos: receita.image_source ? [receita.image_source] : [],
            }
        })

        res.json({ receitas: receitaComDetalhes })
    } catch (error) {
        next(error)
    }
}

export const getAllByTheme: RequestHandler = async (req, res, next) => {
    try {
        const { tema } = req.params
        const receitaRepository = new PrismaReceitaRepository()

        const temaRepository = new PrismaTemaRepository()
        const temaExists = await temaRepository.findByName({ nome: tema })
        if (!temaExists) {
            res.status(400).json({
                error: `O tema ${tema} não é um tema válido.`,
            })
            return
        }

        const receitas = await receitaRepository.findAllByTheme(tema)

        if (!receitas.length) {
            res.status(404).json({
                error: 'Nenhuma receita encontrada',
            })
            return
        }

        const receitaComDetalhes = receitas.map((receita) => {
            // Depois, analisar para ver se isso está funcionando
            const subtemasSet = new Set(
                receita.receitas_subtemas.map((rel) => rel.subtema_id),
            )

            return {
                id: receita.id,
                titulo: receita.titulo,
                conteudo: receita.conteudo,
                isVerify: receita.is_verify,
                idUsuario: receita.usuario_id,
                verifyBy: receita.verify_by,
                dataCriacao: receita.data_criacao,
                ultimaAlteracao: receita.data_alteracao,
                tema: tema,
                subtemas: Array.from(subtemasSet),
                fotos: receita.image_source ? [receita.image_source] : [],
            }
        })

        res.json({ receitas: receitaComDetalhes })
    } catch (error) {
        next(error)
    }
}

export const getReceitasPorSubtemas: RequestHandler = async (
    req,
    res,
    next,
) => {
    try {
        const { tema } = req.params
        const subtema = req.params.subtema.split(',')
        const receitaRepository = new PrismaReceitaRepository()

        const receitas = await receitaRepository.getReceitasPorSubtemas(tema, subtema)

        const formatadas = receitas.map((receita) => {
            // Depois, analisar para ver se está tudo certo
            const subtemasSet = new Set(
                receita.receitas_subtemas.map((rel) => rel.subtema_id),
            )

            return {
                id: receita.id,
                titulo: receita.titulo,
                conteudo: receita.conteudo,
                isVerify: receita.is_verify,
                idUsuario: receita.usuario_id,
                verifyBy: receita.verify_by,
                dataCriacao: receita.data_criacao,
                ultimaAlteracao: receita.data_alteracao,
                subtemas: Array.from(subtemasSet),
                fotos: receita.image_source ? [receita.image_source] : [],
            }
        })
        if (formatadas.length === 0) {
            res.status(404).json({
                error: 'Nenhuma receita encontrada para os subtemas especificados',
            })
            return
        }
        res.status(200).json({ receitas: formatadas })
        return
    } catch (error) {
        next(error)
    }
}
