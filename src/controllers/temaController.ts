import { supabase } from '../supabase/client.ts';
import Tema from '../models/Tema.ts';
import { Request, Response } from 'express';

const temaController = {
    index: async(req: Request, res: Response): Promise<void> => {
        try {
            const { data, error } = await supabase.from('tema').select('*');

            if (error) {
                 res.status(500).json({ error: 'Erro ao buscar temas', details: error.message });
            }

             res.status(200).json(data);

        } catch (error) {
             if (error instanceof Error) {
             res.status(500).json({ error: 'Erro no servidor', details: error.message });
             }
        }
    },

    checkIfExists :async(req: Request, res: Response) : Promise<void> => {
        try {
            const { id } = req.params;

            const TemaDoID = Number(id);

             if (isNaN(TemaDoID)) {
             res.status(400).json({ error: 'ID inválido' });
            }

            const tema = await Tema.findById(TemaDoID);
            if (!tema) {
                 res.status(404).json({ exists: false });
            }

             res.status(200).json({ exists: true });

        } catch (error) {
             if (error instanceof Error) {
             res.status(500).json({ error: 'Erro no servidor', details: error.message });
             }
        }
    },

    async getSubtemasByTema(req: Request, res: Response) {

        const tema = req.params.tema;
        
        try {
            const { data: subtemasData, error } = await supabase
                .from('temaSubtema')
                .select('subtema')
                .eq('tema', tema);

            if (error) throw error;

            res.status(200).json(subtemasData);
        } catch (error) {
             if (error instanceof Error) {

            res.status(500).json({
                error: "Erro ao buscar subtemas",
                details: error.message,
            });
      }
        }
    },
    

    delete :async(req: Request, res: Response): Promise<void> =>  {
        try {
            const { id } = req.params;

            const { data, error } = await supabase
                .from('tema')
                .delete()
                .eq('id', id)
                .select();

            if (error) {
                 res.status(500).json({ error: 'Erro ao deletar tema', details: error.message });
            }

            if (!data || data.length === 0) {
                 res.status(404).json({ error: `Tema com id ${id} não encontrado` });
            }

             res.status(204).end();

        } catch (error) {
             if (error instanceof Error) {
             res.status(500).json({ error: 'Erro no servidor', details: error.message });
             }
        }
    }
};

export default temaController;