import { Router } from 'express'
import temaController from '../controllers/temaController'
import authMiddleware from '../middlewares/authMiddleware'

const router: Router = Router();

/**
 * @swagger
 * /api/tema:
 *   get:
 *     summary: Lista todos os temas
 *     tags: [Tema]
 *     responses:
 *       200:
 *         description: Lista de temas
 *       400:
 *         description: Erro ao listar os temas
 *       401:
 *         description: Não autorizado
 *       500:
 *         description: Erro interno do servidor
 */
router.get('/tema', authMiddleware, temaController.index);

/**
 * @swagger
 * /api/tema/{id}:
 *   get:
 *     summary: Verifica se um tema existe por ID
 *     tags: [Tema]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do tema
 *     responses:
 *       200:
 *         description: Tema encontrado
 *       404:
 *         description: Tema não encontrado
 *       400:
 *         description: Erro ao buscar o tema
 *       500:
 *         description: Erro interno do servidor
 */
router.get('/tema/:id', authMiddleware, temaController.checkIfExists);

/**
 * @swagger
 * /api/tema/{id}:
 *   delete:
 *     summary: Remove um tema pelo ID
 *     tags: [Tema]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do tema
 *     responses:
 *       204:
 *         description: Tema deletado
 *       404:
 *         description: Tema não encontrado
 *       500:
 *         description: Erro interno do servidor
 */
router.delete('/tema/:id', authMiddleware, temaController.delete);

/**
 * @swagger
 * /api/tema/{tema}/subtemas:
 *   get:
 *     summary: Lista subtemas de um tema
 *     tags: [Tema]
 *     parameters:
 *       - in: path
 *         name: tema
 *         required: true
 *         schema:
 *           type: string
 *         description: Nome do tema
 *     responses:
 *       200:
 *         description: Lista de subtemas
 *       404:
 *         description: Tema não encontrado
 *       500:
 *         description: Erro interno do servidor
 */
router.get('/tema/:tema/subtemas', authMiddleware, temaController.getSubtemasByTema);

export default router;
