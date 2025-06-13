import type { quizes, Prisma } from '../../generated/prisma'
import { PrismaClient } from '../../generated/prisma'

export interface QuizRepository {
    create(
        quiz: Prisma.quizesUncheckedCreateInput,
    ): Promise<quizes>
    update(
        id: quizes['id'],
        quiz: Prisma.quizesUncheckedUpdateInput,
    ): Promise<quizes>
    delete(id: quizes['id']): Promise<void>
    findById(id: quizes['id']): Promise<quizes | null>
    findAll(): Promise<quizes[]>
}

export class PrismaQuizRepository implements QuizRepository {
    private prisma: PrismaClient

    constructor() {
        this.prisma = new PrismaClient()
    }

    async create(quiz: Prisma.quizesUncheckedCreateInput): Promise<quizes> {
        return this.prisma.quizes.create({
            data: quiz
        })
    }

    async update(id: quizes['id'], quiz: Prisma.quizesUncheckedUpdateInput): Promise<quizes> {
        return this.prisma.quizes.update({
            where: { id },
            data: quiz
        })
    }

    async delete(id: quizes['id']): Promise<void> {
        await this.prisma.quizes.delete({
            where: { id }
        })
    }

    async findById(id: quizes['id']): Promise<quizes | null> {
        return this.prisma.quizes.findUnique({
            where: { id }
        })
    }

    async findAll(): Promise<quizes[]> {
        return this.prisma.quizes.findMany({
            orderBy: {
                ordem: 'asc'
            }
        })
    }
}