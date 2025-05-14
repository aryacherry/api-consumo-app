import { Router } from 'express';
import temaController from '../controllers/temaController.js'; //Trocar.js por .ts
import authMiddleware from '../middlewares/authMiddleware.js'; //Trocar.js por .ts

const router = Router();

router.get('/tema', authMiddleware, temaController.index);
router.get('/tema/:id', authMiddleware, temaController.checkIfExists);
router.delete('/tema/:id', authMiddleware, temaController.delete);
router.get('/tema/:tema/subtemas', authMiddleware, temaController.getSubtemasByTema);

export default router;