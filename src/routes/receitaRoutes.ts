import type { Router } from 'express'
import type { Multer } from 'multer'
import express from 'express'
import multer from 'multer'
import {
    create,
    deletar,
    getAll,
    getAllByTheme,
    getAllNotVerifiedByTheme,
    getAllVerifiedByTheme,
    getById,
    getReceitasPorSubtemas,
    update,
    verify,
} from '../controllers/receitaController'

const router: Router = express.Router()

const storage = multer.memoryStorage()
// Configuração do Multer
const upload: Multer = multer({
    storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
    },
})

const processFormData = upload.array('fotos', 8)

// Rotas

/**
 * @swagger
 * /api/receitas:
 *   post:
 *     summary: Cria uma nova receita
 *     tags: [Receitas]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               titulo:
 *                 required: true
 *                 type: string
 *               conteudo:
 *                 required: true
 *                 type: string
 *               usuarioId:
 *                 required: true
 *                 type: string
 *               tema:
 *                 required: true
 *                 type: string
 *               subtema:
 *                 required: true
 *                 type: array
 *                 items:
 *                   type: string
 *               fotos:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Imagens da receita (até 8 arquivos)
 *     responses:
 *       201:
 *         description: Receita criada com sucesso
 *       400:
 *         description: Erro ao criar a receita
 *       500:
 *         description: Erro interno do servidor
 */

router.post('/receitas', processFormData, create)

/**
 * @swagger
 * /api/receitas:
 *   get:
 *     summary: Lista todas as receitas
 *     tags: [Receitas]
 *     responses:
 *       200:
 *         description: Lista de receitas
 *       400:
 *         description: Erro ao listar as receitas
 *       500:
 *         description: Erro interno do servidor
 */
router.get('/receitas', getAll)

/**
 * @swagger
 * /api/receitas/{id}:
 *   get:
 *     summary: Obtém uma receita pelo ID
 *     tags: [Receitas]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID da receita
 *     responses:
 *       200:
 *         description: Detalhes da receita
 *       400:
 *         description: Erro ao buscar a receita
 *       404:
 *         description: Receita não encontrada
 *       500:
 *         description: Erro interno do servidor
 */
router.get('/receitas/:id', getById)

/**
 * @swagger
 * /api/receitas/{id}:
 *   put:
 *     summary: Atualiza uma receita pelo ID
 *     tags: [Receitas]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID da receita
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               nome:
 *                 type: string
 *               ingredientes:
 *                 type: string
 *               preparo:
 *                 type: string
 *               tempoPreparo:
 *                 type: integer
 *               categoria:
 *                 type: string
 *               fotos:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Novas imagens da receita (opcional)
 *     responses:
 *       200:
 *         description: Receita atualizada com sucesso
 *       400:
 *         description: Erro ao atualizar a receita
 *       404:
 *         description: Receita não encontrada
 *       500:
 *         description: Erro interno do servidor
 */
router.put('/receitas/:id', processFormData, update)

/**
 * @swagger
 * /api/receitas/{id}:
 *   delete:
 *     summary: Deleta uma receita pelo ID
 *     tags: [Receitas]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID da receita
 *     responses:
 *       200:
 *         description: Receita deletada com sucesso
 *       400:
 *         description: Erro ao deletar a receita
 *       404:
 *         description: Receita não encontrada
 *       500:
 *         description: Erro interno do servidor
 */
router.delete('/receitas/:id', deletar)

/**
 * @swagger
 * /api/receitas/{id}/verificar:
 *   patch:
 *     summary: Verifica uma receita
 *     tags: [Receitas]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID da receita
 *     responses:
 *       200:
 *         description: Receita verificada com sucesso
 *       400:
 *         description: Erro ao verificar a receita
 *       404:
 *         description: Receita não encontrada
 *       500:
 *         description: Erro interno do servidor
 */
router.patch('/receitas/:id/verificar', verify)

/**
 * @swagger
 * /api/{tema}/receitas:
 *   get:
 *     summary: Lista receitas por tema
 *     tags: [Receitas]
 *     parameters:
 *       - in: path
 *         name: tema
 *         required: true
 *         schema:
 *           type: string
 *         description: Tema das receitas
 *     responses:
 *       200:
 *         description: Lista de receitas por tema
 *       400:
 *         description: Erro ao listar receitas por tema
 *       500:
 *         description: Erro interno do servidor
 */
router.get('/:tema/receitas', getAllByTheme)

/**
 * @swagger
 * /api/{tema}/receitas/verificadas:
 *   get:
 *     summary: Lista receitas verificadas por tema
 *     tags: [Receitas]
 *     parameters:
 *       - in: path
 *         name: tema
 *         required: true
 *         schema:
 *           type: string
 *         description: Tema das receitas
 *     responses:
 *       200:
 *         description: Lista de receitas verificadas por tema
 *       400:
 *         description: Erro ao listar receitas verificadas por tema
 *       500:
 *         description: Erro interno do servidor
 */
router.get('/:tema/receitas/verificadas', getAllVerifiedByTheme)

/**
 * @swagger
 * /api/{tema}/receitas/nao-verificadas:
 *   get:
 *     summary: Lista receitas não verificadas por tema
 *     tags: [Receitas]
 *     parameters:
 *       - in: path
 *         name: tema
 *         required: true
 *         schema:
 *           type: string
 *         description: Tema das receitas
 *     responses:
 *       200:
 *         description: Lista de receitas não verificadas por tema
 *       400:
 *         description: Erro ao listar receitas não verificadas por tema
 *       500:
 *         description: Erro interno do servidor
 */
router.get('/:tema/receitas/nao-verificadas', getAllNotVerifiedByTheme)

/**
 * @swagger
 * /api/receitas/{tema}/{subtema}:
 *   get:
 *     summary: Lista receitas por tema e subtema
 *     tags: [Receitas]
 *     parameters:
 *       - in: path
 *         name: tema
 *         required: true
 *         schema:
 *           type: string
 *         description: Tema das receitas
 *       - in: path
 *         name: subtema
 *         required: true
 *         schema:
 *           type: string
 *         description: Subtema das receitas
 *     responses:
 *       200:
 *         description: Lista de receitas por tema e subtema
 *       400:
 *         description: Erro ao listar receitas por tema e subtema
 *       500:
 *         description: Erro interno do servidor
 */
router.get('/receitas/:tema/:subtema', getReceitasPorSubtemas)

export default router
