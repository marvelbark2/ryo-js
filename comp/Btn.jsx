export default function Btn({ text }) {
    return (
        <button onClick={() => {
            console.log('clicked')
        }}>{text}</button>
    )
}