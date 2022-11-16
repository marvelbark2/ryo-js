import { useEffect } from "react";
import Router from "../../lib/router/router"

export default function index({ ...props }) {
    const router = Router();

    if (router.isLoading) return <div>Loading...</div>
    return (
        <div>
            Blog id: {router.query.id}
            <span>Return Back</span>
        </div>
    )
}