import { useEffect } from 'react';
import Btn from '../comp/Btn';
import Router from '../lib/router/router';


export default function index() {
    const router = Router();
    useEffect(() => {
        console.log("router: ", router);
    })
    return (
        <div>Try dynamics in <Btn text={router.params.id} /> </div>
    )
}