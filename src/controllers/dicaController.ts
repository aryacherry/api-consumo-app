import type { RequestHandler, Response } from 'express'
import Dica from '../models/Dica'
//import { supabase } from '../supabase/client';
import Subtema from '../models/Subtemas'
import { PrismaDicaRepository } from '../repositories/prisma/PrismaDicaRepository'
import { PrismaDicaSubtemaRepository } from '../repositories/prisma/PrismaDicaSubtemaRepository'
import { PrismaSubtemaRepository } from '../repositories/prisma/PrismaSubtemaRepository'
import { PrismaTemaRepository } from '../repositories/prisma/PrismaTemaRepository'
import { PrismaUsuarioRepository } from '../repositories/prisma/PrismaUsuarioRepository'
import { z } from 'zod'

const createBodySchema = z.object({
    email: z
        .string({
            required_error: 'O campo email é obrigatório.',
            invalid_type_error: 'O campo email deve ser uma string.',
        })
        .min(1, {
            message: 'O campo email não pode estar vazio.',
        })
        .email({
            message: 'O campo email deve ser um email válido.',
        }),
    conteudo: z
        .string({
            required_error: 'O campo conteudo é obrigatório.',
            invalid_type_error: 'O campo conteudo deve ser uma string.',
        })
        .min(3, {
            message: 'O campo conteudo deve ter pelo menos 3 caracteres.',
        })
        .max(1000, {
            message: 'O campo conteudo deve ter no máximo 1000 caracteres.',
        }),
    titulo: z
        .string({
            required_error: 'O campo titulo é obrigatório.',
            invalid_type_error: 'O campo titulo deve ser uma string.',
        })
        .min(3, {
            message: 'O campo titulo deve ter pelo menos 3 caracteres.',
        })
        .max(100, {
            message: 'O campo titulo deve ter no máximo 100 caracteres.',
        }),
    tema: z
        .string({
            required_error: 'O campo tema é obrigatório.',
            invalid_type_error: 'O campo tema deve ser uma string.',
        })
        .min(1, {
            message: 'O campo tema não pode estar vazio.',
        }),
    subtemas: z.array(
        z
            .string({
                required_error: 'O campo subtemas é obrigatório.',
                invalid_type_error:
                    'O campo subtemas deve ser um array de strings.',
            })
            .min(1, {
                message: 'O campo subtemas deve ter pelo menos 1 subtema.',
            })
            .max(100, {
                message: 'O campo subtemas deve ter no máximo 100 subtemas.',
            })
            .min(1)
            .max(100),
    ),
})

export const create: RequestHandler = async (req, res, next) => {
    try {
        const { email, conteudo, titulo, tema, subtemas } =
            createBodySchema.parse(req.body)
        const usuarioRepository = new PrismaUsuarioRepository()
        const user = await usuarioRepository.findByEmail({ email })
        if (!user) {
            res.status(404).json({
                message: `O usuário com o email ${email} não existe.`,
            })
            return
        }
        const isCreatedBySpecialist = user.is_monitor

        const temaRepository = new PrismaTemaRepository()
        const temaExists = await temaRepository.findByName({ nome: tema })
        if (!temaExists) {
            res.status(404).json({
                message: `O tema ${tema} não existe.`,
            })
            return
        }
        const subtemaRepository = new PrismaSubtemaRepository()
        const subtemas_id: string[] = []
        for (const subtema of subtemas) {
            const subtemaExists = await subtemaRepository.findByName({
                nome: subtema,
            })
            if (!subtemaExists) {
                const subtemaCriado = await subtemaRepository.create({
                    tema_id: temaExists.id,
                    nome: subtema,
                    descricao: '',
                })
                subtemas_id.push(subtemaCriado.id)
                continue
            }
            if (subtemaExists.tema_id !== temaExists.id) {
                res.status(400).json({
                    message: `O subtema ${subtema} não pertence ao tema ${tema}.`,
                })
                return
            }
            subtemas_id.push(subtemaExists.id)
        }

        const dicaRepository = new PrismaDicaRepository()
        const dicaData = await dicaRepository.create({
            tema_id: temaExists.id,
            usuario_id: user.id,
            conteudo,
            titulo,
            is_verify: false,
            verify_by: null,
            is_created_by_specialist: isCreatedBySpecialist,
            dicas_subtemas: {
                createMany: {
                    data: subtemas_id.map((id) => {
                        return {
                            subtema_id: id,
                            assunto: '',
                        }
                    }),
                },
            },
        })

        res.status(201).json({
            dica: dicaData,
        })
        return
    } catch (error) {
        next(error)
    }
}

export const getAll: RequestHandler = async (_req, res, next) => {
    try {
        const dicasRepository = new PrismaDicaRepository()
        const dicas = await dicasRepository.findAllWithCorrelacaoOrderById()
        const dicasComDetalhes = await Promise.all(
            dicas.map(async (dica) => {
                const temaRepository = new PrismaTemaRepository()
                const tema = await temaRepository.findById({ id: dica.tema_id })
                if (!tema) {
                    throw new Error(
                        `Tema com ID ${dica.tema_id} não encontrado.`,)
                }
                const subtemaRepository = new PrismaSubtemaRepository()
                const subtemas = await subtemaRepository.findByTemaId({ tema_id: tema.id })
                return {
                    id: dica.id,
                    titulo: dica.titulo,
                    conteudo: dica.conteudo,
                    isVerify: dica.is_verify,
                    usuarioId: dica.usuario_id,
                    verifyBy: dica.verify_by,
                    createdAt: dica.data_criacao,
                    updatedAt: dica.data_alteracao,
                    tema: tema.nome,
                    subtemas: subtemas.map((subtema) => subtema.nome),
                    isCreatedBySpecialist: dica.is_created_by_specialist,
                }
            }),
        )

        res.json({ dicas: dicasComDetalhes })
        return
    } catch (error) {
        next(error)
    }
}

const getByCodeSchema = z.object({
    id: z.string({
        required_error: 'ID é obrigatório',
        invalid_type_error: 'ID deve ser um UUID válido'
    }).uuid('ID deve ser um UUID válido'),
})
export const getByCode: RequestHandler = async (req, res, next) => {
    try {
        const { id } = getByCodeSchema.parse(req.params)
        const dicaRepository = new PrismaDicaRepository()
        const dica = await dicaRepository.findById(id)
        if (!dica) {
            res.status(404).json({
                message: `Dica com o código ${id} não encontrada.`,
            })
            return
        }
        const subtemaRepository = new PrismaSubtemaRepository()
        const subtemas = await subtemaRepository.findByTemaId({
            tema_id: dica.tema_id,
        })
        const temaRepository = new PrismaTemaRepository()
        const tema = await temaRepository.findById({ id: dica.tema_id })
        if (!tema) {
            res.status(404).json({
                message: `Tema com o ID ${dica.tema_id} não encontrado.`,
            })
            return
        }
        res.json({
            id: dica.id,
            titulo: dica.titulo,
            conteudo: dica.conteudo,
            isVerify: dica.is_verify,
            usuarioId: dica.usuario_id,
            verifyBy: dica.verify_by,
            createdAt: dica.data_criacao,
            updatedAt: dica.data_alteracao,
            tema: tema.nome,
            subtemas: subtemas.map((subtema) => subtema.nome),
        })
    } catch (error) {
        next(error)
    }
}

export const update: RequestHandler = async (req, res, next) => {
    try {
        const updatedDica = new Dica(req.body)
        const { valid, errors } = updatedDica.validate()

        if (!valid) {
            res.status(400).json({
                message: `Erro ao validar dica: ${errors?.join(', ')}`,
            })
            return
        }

        const tema = req.body.tema
        const subtemas = req.body.subtemas

        const subtemaObj = new Subtema(subtemas)
        const resultadoSubtema = await subtemaObj.validate()

        if (resultadoSubtema.erros.length > 0) {
            res.status(400).json({
                message: `Erro ao validar subtemas: ${resultadoSubtema.erros.join(', ')}`,
            })
            return
        }

        const dicaRepository = new PrismaDicaRepository()
        const dicaAtualizada = await dicaRepository.update(req.params.id, {
            conteudo: updatedDica.conteudo,
        })
        if (!dicaAtualizada) {
            res.status(404).json({
                message: `Dica com o código ${req.params.id} não encontrada.`,
            })
            return
        }

        const temaRepository = new PrismaTemaRepository()
        const temaExists = await temaRepository.findByName({ nome: tema })
        if (!temaExists) {
            res.status(404).json({
                message: `O tema ${tema} não existe.`,
            })
            return
        }
        for (const subtema of subtemas) {
            let subtemaData = await temaRepository.getSubtemasByTema({
                temaId: temaExists.id,
            })
            if (!subtemaData || subtemaData.length === 0) {
                const subtemaRepository = new PrismaSubtemaRepository()
                const createdSubtema = await subtemaRepository.create({
                    tema_id: temaExists.id,
                    nome: subtema,
                    descricao: '',
                })
                subtemaData = [createdSubtema]
            }
            const dicaSubtemaRepository = new PrismaDicaSubtemaRepository()
            await dicaSubtemaRepository.create({
                dica_id: req.params.id,
                subtema_id: subtemaData[0].id,
                assunto: '',
            })
        }

        const dicaSubtemaRepository = new PrismaDicaSubtemaRepository()
        const subtemasAtuais = await dicaSubtemaRepository.findByDicaId(
            req.params.id,
        )

        const subtemasParaRemover = subtemasAtuais.filter(
            (subtemaAtual) => !subtemas.includes(subtemaAtual.subtema_id),
        )

        if (subtemasParaRemover.length > 0) {
            await dicaSubtemaRepository.deleteMany(req.params.id)
        }

        res.status(200).json({
            message: 'Dica e correlações atualizadas com sucesso',
            data: dicaAtualizada,
        })
        return
    } catch (error) {
        next(error)
    }
}

export const deletar: RequestHandler = async (req, res, next) => {
    try {
        const dicaId = req.params.id
        const dicaSubtemaRepository = new PrismaDicaSubtemaRepository()
        await dicaSubtemaRepository.deleteMany(req.params.id)
        const dicaRepository = new PrismaDicaRepository()
        await dicaRepository.delete(dicaId)
        res.status(204).end()
        return
    } catch (error) {
        next(error)
    }
}

export const verify: RequestHandler = async (req, res, next) => {
    try {
        const verifyBy = req.body.verifyBy
        const id = req.params.id

        if (!verifyBy) {
            res.status(400).json({
                message: 'O campo verifyBy é obrigatório.',
            })
            return
        }

        const usuarioRepository = new PrismaUsuarioRepository()
        const user = await usuarioRepository.findByEmail(verifyBy)
        if (!user) {
            res.status(404).json({
                message: `O usuário com o email ${verifyBy} não existe.`,
            })
            return
        }
        const isMonitor = await usuarioRepository.getMonitorStatusByEmail({
            email: verifyBy,
        })
        if (!isMonitor) {
            res.status(403).json({
                message: `O usuário com o email ${verifyBy} não tem permissão para verificar dicas.`,
            })
            return
        }

        const dicaRepository = new PrismaDicaRepository()
        const dica = await dicaRepository.findById(id)
        if (!dica) {
            res.status(404).json({
                message: `A dica com o código ${id} não foi encontrada.`,
            })
            return
        }
        await dicaRepository.update(id, {
            is_verify: true,
            verify_by: verifyBy,
            data_alteracao: new Date(),
        })
        res.status(200).json({
            message: `A dica com o código ${id} foi verificada com sucesso pelo usuário com o email ${verifyBy}.`,
        })
        return
    } catch (error) {
        next(error)
    }
}

export const getAllVerifiedByTheme: RequestHandler = async (req, res, next) => {
    try {
        const { dicaId, tema } = req.params
        const temaRepository = new PrismaTemaRepository()
        const temaExists = await temaRepository.findByName({
            nome: tema,
        })
        if (!temaExists) {
            res.status(404).json({
                message: `O tema ${tema} não existe.`,
            })
            return
        }
        const dicaSubtemaRepository = new PrismaDicaSubtemaRepository()
        const idPost = await dicaSubtemaRepository.findByDicaId(dicaId)
        if (!idPost) {
            res.status(404).json({
                message: 'Nenhuma receita encontrada',
            })
            return
        }
        const dicaRepository = new PrismaDicaRepository()
        const dicas = await dicaRepository.findAllByIsVerify(true)
        const dicasComDetalhes = await Promise.all(
            dicas.map(async (dica) => {
                return {
                    id: dica.id,
                    titulo: dica.titulo,
                    conteudo: dica.conteudo,
                    isVerify: dica.is_verify,
                    idUsuario: dica.usuario_id,
                    verifyBy: dica.verify_by,
                    dataCriacao: dica.data_criacao,
                    ultimaAlteracao: dica.data_alteracao,
                    tema: dica.dicas_subtemas[0].subtema_id,
                    subtemas: Array.from(dica.dicas_subtemas),
                    isCreatedBySpecialist: dica.is_created_by_specialist,
                }
            }),
        )
        res.json(dicasComDetalhes)
        return
    } catch (error) {
        next(error)
    }
}

export const getAllNotVerifiedByTheme: RequestHandler = async (req, res, next) => {
    try {
        const { dicaId, tema } = req.params
        const temaRepository = new PrismaTemaRepository()
        const temaExists = await temaRepository.findByName({ nome: tema })
        if (!temaExists) {
            res.status(404).json({
                message: `O tema ${tema} não existe.`,
            })
            return
        }
        const dicaSubtemaRepository = new PrismaDicaSubtemaRepository()
        const idPost = await dicaSubtemaRepository.findByDicaId(dicaId)
        if (!idPost) {
            res.status(404).json({
                message: 'Nenhuma receita encontrada',
            })
            return
        }
        const dicaRepository = new PrismaDicaRepository()
        const dicas = await dicaRepository.findAllByIsVerify(false)
        const dicasComDetalhes = await Promise.all(
            dicas.map(async (dica) => {
                return {
                    id: dica.id,
                    titulo: dica.titulo,
                    conteudo: dica.conteudo,
                    isVerify: dica.is_verify,
                    idUsuario: dica.usuario_id,
                    verifyBy: dica.verify_by,
                    dataCriacao: dica.data_criacao,
                    ultimaAlteracao: dica.data_alteracao,
                    tema: dica.dicas_subtemas[0].subtema_id,
                    subtemas: Array.from(dica.dicas_subtemas),
                    isCreatedBySpecialist: dica.is_created_by_specialist,
                }
            }),
        )
        res.json(dicasComDetalhes)
    } catch (error) {
        next(error)
    }
}

export const getAllByTheme: RequestHandler = async (req, res, next) => {
    try {
        const { dicaId, tema } = req.params
        const temaRepository = new PrismaTemaRepository()
        const temaExists = await temaRepository.findByName({ nome: tema })
        if (!temaExists) {
            res.status(404).json({
                message: `O tema ${tema} não existe.`,
            })
            return
        }
        const dicaSubtemaRepository = new PrismaDicaSubtemaRepository()
        const idPost = await dicaSubtemaRepository.findByDicaId(dicaId)
        if (!idPost) {
            res.status(404).json({
                message: 'Nenhuma receita encontrada',
            })
            return
        }
        const dicaRepository = new PrismaDicaRepository()
        const dicas = await dicaRepository.findAllWithCorrelacaoOrderById()
        const dicasComDetalhes = await Promise.all(
            dicas.map(async (dica) => {
                return {
                    id: dica.id,
                    titulo: dica.titulo,
                    conteudo: dica.conteudo,
                    isVerify: dica.is_verify,
                    idUsuario: dica.usuario_id,
                    verifyBy: dica.verify_by,
                    dataCriacao: dica.data_criacao,
                    ultimaAlteracao: dica.data_alteracao,
                    tema: dica.dicas_subtemas[0].subtema_id,
                    subtemas: Array.from(dica.dicas_subtemas),
                    isCreatedBySpecialist: dica.is_created_by_specialist,
                }
            }),
        )
        res.json(dicasComDetalhes)
        return
    } catch (error) {
        next(error)
    }
}

export const getDica: RequestHandler = async (req, res, next) => {
    try {
        const dicaId = req.params.dicaId
        const dicaSubtemaRepository = new PrismaDicaSubtemaRepository()
        const correlacoes = await dicaSubtemaRepository.findByDicaId(dicaId)

        if (!correlacoes || correlacoes.length === 0) {
            res.status(200).json([])
            return
        }

        const idsDicas = [
            ...new Set(correlacoes.map((correlacao) => correlacao.dica_id)),
        ]
        if (idsDicas.length === 0) {
            res.status(200).json([])
            return
        }

        const dicaRepository = new PrismaDicaRepository()
        const dicas = await dicaRepository.findAllByIsVerify(true)

        const dicasComDetalhes = await Promise.all(
            dicas.map(async (dica) => {
                return {
                    id: dica.id,
                    titulo: dica.titulo,
                    conteudo: dica.conteudo,
                    isVerify: dica.is_verify,
                    idUsuario: dica.usuario_id,
                    verifyBy: dica.verify_by,
                    dataCriacao: dica.data_criacao,
                    ultimaAlteracao: dica.data_alteracao,
                    tema: dica.dicas_subtemas?.[0]?.subtema_id || null,
                    subtemas: Array.from(dica.dicas_subtemas),
                    isCreatedBySpecialist: dica.is_created_by_specialist,
                }
            }),
        )

        res.json(dicasComDetalhes)
        return
    } catch (error) {
        next(error)
    }
}

export const getSpecialistsDica: RequestHandler = async (req, res, next) => {
    try {
        const { dicaId, tema } = req.params
        const temaRepository = new PrismaTemaRepository()
        const temaExists = await temaRepository.findByName({ nome: tema })
        if (!temaExists) {
            res.status(404).json({
                message: `O tema ${tema} não existe.`,
            })
            return
        }
        const dicaSubtemaRepository = new PrismaDicaSubtemaRepository()
        const idPost = await dicaSubtemaRepository.findByDicaId(dicaId)
        if (!idPost) {
            res.status(404).json({
                message: 'Nenhuma receita encontrada',
            })
            return
        }
        const dicaRepository = new PrismaDicaRepository()
        const dicas = await dicaRepository.findAllCreatedBySpecialist(true)
        const dicasComDetalhes = await Promise.all(
            dicas.map(async (dica) => {
                return {
                    id: dica.id,
                    titulo: dica.titulo,
                    conteudo: dica.conteudo,
                    isVerify: dica.is_verify,
                    idUsuario: dica.usuario_id,
                    verifyBy: dica.verify_by,
                    dataCriacao: dica.data_criacao,
                    ultimaAlteracao: dica.data_alteracao,
                    tema: dica.dicas_subtemas[0].subtema_id,
                    subtemas: Array.from(dica.dicas_subtemas),
                    isCreatedBySpecialist: dica.is_created_by_specialist,
                }
            }),
        )
        res.json(dicasComDetalhes)
        return
    } catch (error) {
        next(error)
    }
}
