let count = 0;

export default {
    invalidate: 1000,
    runner: async () => {
        count++;
        return {
            count,
            timestamp: new Date().toISOString(),
        };
    },
};
