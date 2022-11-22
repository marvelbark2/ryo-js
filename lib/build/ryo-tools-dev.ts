if (process.env.NODE_ENV === "development") {
    if (window) {
        const eventSource = new EventSource("/ryo_framework");
        eventSource.onmessage = (e) => {
            const data = e.data;
            if (data) {
                console.log("Restarting UI...")
                if (JSON.parse(data).restart) {
                    window.location.reload();
                }
            }
        }
    }
}

//TODO: TO be implemented in the future
export default {
    name: "framework",
}