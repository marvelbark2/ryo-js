let count = 0;
export const data = {
    invalidate: 1,
    shouldUpdate: (_old, newValue) => newValue > 10,
    runner: async (stop) => {
        if (count === 60) {
            stop();
        }
        return count++;
    }
}
export default function index({ data }) {
    return (
        <div>
            <p>
                COUNTING... {data}
            </p>
        </div>
    )
}