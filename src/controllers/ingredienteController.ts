import Ingrediente from '../models/Ingrediente'
import { PrismaIngredienteRepository } from '../repositories/prisma/PrismaIngredienteRepository'
import { supabase } from '../supabase/client'
import type { Request, Response, RequestHandler } from 'express'


export const store: RequestHandler = async (req, res) => {
    try {
        const ingrediente = new Ingrediente(req.body)

        const { valid, errors } = ingrediente.validate()

        if (!valid) {
            res.status(400).json({
                message: 'Esse ingrediente não é válido',
                errors: errors,
            })
            return
        }

        const { postagemId } = req.body

        if (!postagemId) throw new Error('postagemId é obrigatório')

        const { data, error } = await ingrediente.save(postagemId)
        if (error) {
            throw error
        }
        res
            .status(201)
            .json({
                message: 'Ingrediente adicionado com sucesso',
                data: data,
            })
        return
    } catch (e) {
        res.status(500).json({
            message: 'Erro ao adicionar ingrediente',
            error: String(e),
        })
        return
    }
}

export const index: RequestHandler = async (_req, res) => {
    try {
        /* const { data: ingredientes, error } = await supabase
            .from('ingredientes')
            .select('nomeingrediente, quantidade, medida');

        if (error) throw error; */
        const ingredienteRepository = new PrismaIngredienteRepository()
        const ingredientes = await ingredienteRepository.findAll()
        res.json(ingredientes)
        return
    } catch (e) {
        if (e instanceof Error) {
            res.status(500).json({
                message: 'Erro ao listar ingredientes',
                error: String(e),
            })
        }
    }
}

export const show: RequestHandler = async (req: Request, res: Response) => {
    try {
        /* const { data: ingrediente, error } = await supabase
            .from('ingredientes')
            .select()
            .eq('ingrediente_id', req.params.ingredienteId)
            .single();

        if (error || !ingrediente) {
            handleError(res, `O ingrediente com o Id ${req.params.ingredienteId} não foi encontrado.`, 404, 'Ingrediente não encontrado')
        } */
        const ingredienteRepository = new PrismaIngredienteRepository()
        const ingrediente = await ingredienteRepository.findById(
            req.params.ingredienteId,
        )
        res.json(ingrediente)
        return
    } catch (e) {
        if (e instanceof Error) {
            res.status(500).json({
                message: 'Erro ao listar ingredientes',
                error: String(e),
            })
        }
    }
}

export const update = async (req: Request, res: Response) => {
    try {
        const updateIngrediente = new Ingrediente(req.body)

        const { valid, errors } = updateIngrediente.validate()

        if (!valid) {
            res.status(400).json({
                message: 'Esse ingrediente não é válido',
                errors: errors,
            })
            return
        }
        /* const { data: updatedIngrediente, error: updateError } = await supabase
            .from('ingredientes')
            .update([{
                nomeIngrediente: updateIngrediente.nomeIngrediente,
                quantidade: updateIngrediente.quantidade,
                medida: updateIngrediente.medida,
            }])
            .eq('ingrediente_id', req.params.ingredienteId)
            .select();

        if (updateError) throw updateError; */
        const ingredienteRepository = new PrismaIngredienteRepository()
        const updatedIngrediente = await ingredienteRepository.update(
            req.params.ingredienteId,
            {
                nome: updateIngrediente.nomeIngrediente,
                quantidade: updateIngrediente.quantidade.toString(),
                medida: updateIngrediente.medida,
            },
        )

        if (!updatedIngrediente) {
            res.status(404).json({
                message: `O ingrediente com o Id ${req.params.ingredienteId} não foi encontrado.`,
            })
            return
        }
        res
            .status(200)
            .json({
                message: 'Ingrediente atualizado com sucesso',
                data: updatedIngrediente,
            })
        return
    } catch (e) {
        if (e instanceof Error) {
            res.status(500).json({
                message: 'Erro ao atualizar ingrediente',
                error: String(e),
            })
        }
    }
}

export const deletar = async (req: Request, res: Response) => {
    try {
        /* const { data, error: deleteError } = await supabase
            .from('ingredientes')
            .delete()
            .eq('ingrediente_id', req.params.ingredienteId)
            .select();

        if (deleteError) throw deleteError; */
        const ingredienteRepository = new PrismaIngredienteRepository()
        await ingredienteRepository.delete(req.params.ingredienteId)
        res.status(204).end()
        return
    } catch (e) {
        if (e instanceof Error) {
            res.status(500).json({
                message: 'Erro ao deletar ingrediente',
                error: String(e),
            })
        }
    }
}

