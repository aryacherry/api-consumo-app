import type { RequestHandler, Response } from 'express'
import Dica from '../models/Dica'
//import { supabase } from '../supabase/client';
import Subtema from '../models/Subtemas'
import { PrismaDicaRepository } from '../repositories/prisma/PrismaDicaRepository'
import { PrismaDicaSubtemaRepository } from '../repositories/prisma/PrismaDicaSubtemaRepository'
import { PrismaSubtemaRepository } from '../repositories/prisma/PrismaSubtemaRepository'
import { PrismaTemaRepository } from '../repositories/prisma/PrismaTemaRepository'
import { PrismaUsuarioRepository } from '../repositories/prisma/PrismaUsuarioRepository'

export const create: RequestHandler = async (req, res, next) => {
    try {
        const dica = new Dica(req.body)
        const { valid, errors } = dica.validate()

        if (!valid)
            return handleError(
                res,
                errors?.join(', ') || '',
                400,
                'Dica Inválida',
            )

        const tema = req.body.tema
        const subtemas = req.body.subtemas
            ? Array.isArray(req.body.subtemas)
                ? req.body.subtemas
                : [req.body.subtemas]
            : []
        const titulo = req.body.titulo

        if (!titulo || titulo.trim() === '') {
            return handleError(
                res,
                'O campo "titulo" é obrigatório.',
                400,
                'Campo faltando',
            )
        }

        const usuarioRepository = new PrismaUsuarioRepository()
        const isMonitor = await usuarioRepository.getMonitorStatusByEmail({
            email: dica.usuarioId,
        })
        if (isMonitor === null) {
            return handleError(
                res,
                `O usuário com o email ${dica.usuarioId} não foi encontrado.`,
                404,
                'Usuário não encontrado',
            )
        }
        const isCreatedBySpecialist = isMonitor

        const temaRepository = new PrismaTemaRepository()
        const temaExists = await temaRepository.findByName({ nome: tema })
        if (!temaExists) {
            return handleError(
                res,
                `O tema ${tema} não existe.`,
                404,
                'Tema não encontrado',
            )
        }
        const subtemaObj = new Subtema(subtemas)
        if (subtemas.length > 0) {
            const resultadoSubtema = await subtemaObj.validate()

            if (resultadoSubtema.erros.length > 0) {
                return handleError(
                    res,
                    resultadoSubtema.erros?.join(', ') || '',
                    400,
                    'Erro ao processar subtemas',
                )
            }

            for (const subtema of subtemas) {
                const temaSubtemaRepository = new PrismaSubtemaRepository()
                const subtemaData = await temaSubtemaRepository.findByTemaId({
                    tema_id: tema,
                })

                if (subtemaData.length === 0) {
                    const temaSubtemaRepository = new PrismaSubtemaRepository()
                    try {
                        await temaSubtemaRepository.create({
                            tema_id: temaExists.id,
                            nome: subtema,
                            descricao: '',
                        })
                    } catch (error) {
                        return handleError(
                            res,
                            String(error),
                            400,
                            'Erro ao criar relação tema-subtema',
                        )
                    }
                }
            }
        }

        const dicaRepository = new PrismaDicaRepository()
        const dicaData = await dicaRepository.create({
            tema_id: temaExists.id,
            usuario_id: dica.usuarioId,
            conteudo: dica.conteudo,
            titulo: titulo,
            is_verify: false,
            verify_by: null,
            data_criacao: new Date(),
            data_alteracao: new Date(),
            is_created_by_specialist: isCreatedBySpecialist,
        })

        res.status(201).json({
            message: 'Dica criada com sucesso',
            data: dicaData,
        })
        return
    } catch (error) {
        next(error)
    }
}

export const getAll: RequestHandler = async (_req, res) => {
    try {
        const dicasRepository = new PrismaDicaRepository()
        const dicas = await dicasRepository.findAllWithCorrelacaoOrderById()
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
    } catch (e) {
        if (e instanceof Error) {
            return handleError(res, e.message)
        }
    }
}

export const getByCode: RequestHandler = async (req, res) => {
    try {
        const dicaRepository = new PrismaDicaRepository()
        const dica = await dicaRepository.findById(req.params.id)
        if (!dica) {
            return handleError(
                res,
                `A dica com o código ${req.params.id} não foi encontrada.`,
                404,
                'Dica não encontrada',
            )
        }

        res.json({
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
        })
    } catch (e) {
        if (e instanceof Error) {
            return handleError(res, e.message)
        }
    }
}

export const update: RequestHandler = async (req, res) => {
    try {
        const updatedDica = new Dica(req.body)
        const { valid, errors } = updatedDica.validate()

        if (!valid)
            return handleError(
                res,
                errors?.join(', ') || '',
                400,
                'Essa dica não é válida',
            )

        const tema = req.body.tema
        const subtemas = req.body.subtemas

        const subtemaObj = new Subtema(subtemas)
        const resultadoSubtema = await subtemaObj.validate()

        if (resultadoSubtema.erros.length > 0) {
            return handleError(
                res,
                resultadoSubtema.erros?.join(', ') || '',
                400,
                'Erro ao processar subtemas',
            )
        }

        const dicaRepository = new PrismaDicaRepository()
        const dicaAtualizada = await dicaRepository.update(req.params.id, {
            conteudo: updatedDica.conteudo,
        })
        if (!dicaAtualizada) {
            return handleError(
                res,
                `Dica com o código ${req.params.id} não encontrada.`,
                404,
                'Dica não encontrada',
            )
        }

        const temaRepository = new PrismaTemaRepository()
        const temaExists = await temaRepository.findByName({ nome: tema })
        if (!temaExists) {
            return handleError(
                res,
                `O tema ${tema} não existe.`,
                404,
                'Tema não encontrado',
            )
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
    } catch (e) {
        if (e instanceof Error) {
            return handleError(res, e.message)
        }
    }
}

export const deletar: RequestHandler = async (req, res) => {
    try {
        const dicaId = req.params.id
        const dicaSubtemaRepository = new PrismaDicaSubtemaRepository()
        await dicaSubtemaRepository.deleteMany(req.params.id)
        const dicaRepository = new PrismaDicaRepository()
        await dicaRepository.delete(dicaId)
        res.status(204).end()
        return
    } catch (e) {
        if (e instanceof Error) {
            return handleError(res, e.message)
        }
    }
}

export const verify: RequestHandler = async (req, res) => {
    try {
        const verifyBy = req.body.verifyBy
        const id = req.params.id

        if (!verifyBy) {
            return handleError(
                res,
                `O campo 'verifyBy' é obrigátorio.`,
                400,
                'Input inválido',
            )
        }

        const usuarioRepository = new PrismaUsuarioRepository()
        const user = await usuarioRepository.findByEmail(verifyBy)
        if (!user) {
            return handleError(
                res,
                `O usuário com o email ${verifyBy} não foi encontrado.`,
                404,
                'Usuário não encontrado',
            )
        }
        const isMonitor = await usuarioRepository.getMonitorStatusByEmail({
            email: verifyBy,
        })
        if (!isMonitor) {
            return handleError(
                res,
                `O usuário com o email ${verifyBy} não é um monitor.`,
                400,
                'Usuário não é monitor',
            )
        }

        const dicaRepository = new PrismaDicaRepository()
        const dica = await dicaRepository.findById(id)
        if (!dica)
            return handleError(
                res,
                `A dica com o código ${id} não foi encontrada.`,
                404,
                'Dica não encontrada',
            )
        await dicaRepository.update(id, {
            is_verify: true,
            verify_by: verifyBy,
            data_alteracao: new Date(),
        })
        res.status(200).json({
            message: `A dica com o código ${id} foi verificada com sucesso pelo usuário com o email ${verifyBy}.`,
        })
        return
    } catch (e) {
        if (e instanceof Error) {
            return handleError(res, e.message)
        }
    }
}

export const getAllVerifiedByTheme: RequestHandler = async (req, res) => {
    try {
        const { dicaId, tema } = req.params
        const temaRepository = new PrismaTemaRepository()
        const temaExists = await temaRepository.findByName({
            nome: tema,
        })
        if (!temaExists) {
            return handleError(
                res,
                `O tema ${tema} não existe.`,
                404,
                'Tema não encontrado',
            )
        }
        const dicaSubtemaRepository = new PrismaDicaSubtemaRepository()
        const idPost = await dicaSubtemaRepository.findByDicaId(dicaId)
        if (!idPost)
            return handleError(res, 'Nenhuma receita encontrada', 404)
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
    } catch (e) {
        if (e instanceof Error) {
            return handleError(res, e.message)
        }
    }
}

export const getAllNotVerifiedByTheme: RequestHandler = async (req, res) => {
    try {
        const { dicaId, tema } = req.params
        const temaRepository = new PrismaTemaRepository()
        const temaExists = await temaRepository.findByName({ nome: tema })
        if (!temaExists) {
            return handleError(
                res,
                `O tema ${tema} não existe.`,
                404,
                'Tema não encontrado',
            )
        }
        const dicaSubtemaRepository = new PrismaDicaSubtemaRepository()
        const idPost = await dicaSubtemaRepository.findByDicaId(dicaId)
        if (!idPost)
            return handleError(res, 'Nenhuma receita encontrada', 404)
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
    } catch (e) {
        if (e instanceof Error) {
            return handleError(res, e.message)
        }
    }
}

export const getAllByTheme: RequestHandler = async (req, res) => {
    try {
        const { dicaId, tema } = req.params
        const temaRepository = new PrismaTemaRepository()
        const temaExists = await temaRepository.findByName({ nome: tema })
        if (!temaExists) {
            return handleError(
                res,
                `O tema ${tema} não existe.`,
                404,
                'Tema não encontrado',
            )
        }
        const dicaSubtemaRepository = new PrismaDicaSubtemaRepository()
        const idPost = await dicaSubtemaRepository.findByDicaId(dicaId)
        if (!idPost)
            return handleError(res, 'Nenhuma receita encontrada', 404)
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
    } catch (e) {
        if (e instanceof Error) {
            return handleError(res, e.message)
        }
    }
}

export const getDica: RequestHandler = async (req, res) => {
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
    } catch (e) {
        console.error('Erro ao buscar dicas por subtemas:', e)
        if (e instanceof Error) {
            res.status(500).json({
                error: `Erro interno ao processar a solicitação: ${e.message}`,
            })
            return
        }
    }
}

export const getSpecialistsDica: RequestHandler = async (req, res) => {
    try {
        const { dicaId, tema } = req.params
        const temaRepository = new PrismaTemaRepository()
        const temaExists = await temaRepository.findByName({ nome: tema })
        if (!temaExists) {
            return handleError(
                res,
                `O tema ${tema} não existe.`,
                404,
                'Tema não encontrado',
            )
        }
        const dicaSubtemaRepository = new PrismaDicaSubtemaRepository()
        const idPost = await dicaSubtemaRepository.findByDicaId(dicaId)
        if (!idPost)
            return handleError(res, 'Nenhuma receita encontrada', 404)
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
    } catch (e) {
        console.error('Erro ao buscar dicas por subtemas:', e)
        if (e instanceof Error) {
            res.status(500).json({
                error: `Erro interno ao processar a solicitação: ${e.message}`,
            })
            return
        }
    }
}

function handleError(
    res: Response,
    detail = 'An error has occurred.',
    status = 500,
    message = 'Internal Server Error',
) {
    console.log(`Error: ${message} - ${detail}`)
    if (!res.headersSent) {
        res.status(status).json({ message, detail })
        return
    }
}
