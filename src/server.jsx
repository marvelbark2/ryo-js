import { PrismaClient } from "@prisma/client";

export function server() {

}

const prisma = new PrismaClient();

const Btn = ({ text }) => {
    return (
        <button onClick={() => {
            console.log('clicked')
        }}>{text}</button>
    )
}
export default async function SSRPage() {
    const data = await prisma.event.findMany();
    console.log(data.length)
    return (

        <div>
            <ul>
                {data.map((ev) => (
                    <li key={ev.id}>
                        <Btn text={ev.name} />
                    </li>
                ))}
            </ul>

        </div>

    )
}