import { Router } from 'express';
import { deletar, index, show, store, update } from '../controllers/ingredienteController';

const router = Router();

router.get('/ingredientes', index);
router.post('/ingredientes', store);
router.put('/ingredientes/:ingredienteId', update);
router.get('/ingredientes/:ingredienteId', show);
router.delete('/ingredientes/:ingredienteId', deletar);

export default router;
