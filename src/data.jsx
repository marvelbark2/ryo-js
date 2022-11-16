import { PrismaClient } from '@prisma/client'
import { useEffect } from 'react';
import Btn from '../comp/Btn';
import Router from '../lib/router/router';

export const data = {
    invalidate: 1000,
    runner: async (stop) => {
        const prisma = new PrismaClient();
        const events = await prisma.event.findMany({});
        return { events };
    }
}
export default function index({ data }) {
    const router = Router();
    useEffect(() => {
        console.log({ data });
    }, [])
    if (router.isLoading) return <div>Loading...</div>
    return (
        <div>
            <p>
                <span onClick={() => router.back()}>BACK</span>
                <Btn text="TEST" />
                {
                    data.events.map((event) => {
                        return (
                            <div key={event.id}>
                                <a href={`/blog/${event.id}`}>{event.name}</a>
                            </div>
                        )
                    })
                }
            </p>
        </div>
    )
}