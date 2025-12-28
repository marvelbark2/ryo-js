import useRouter from "ryo.js/router"
export default function User() {
    const router = useRouter();

    if (router.isLoading) {
        return <div>Loading...</div>;
    }
    return (
        <div>
            <h1>User ID: {router.params.id}</h1>
        </div>
    );
}