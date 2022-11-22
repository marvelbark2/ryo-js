
import { useEffect } from 'preact/hooks';

const EntryClient = ({ children, id }: any) => {
    useEffect(() => {
        console.log("🚀 ~ file: entry.tsx ~ line 6 ~ useEffect ~ useEffect", useEffect)
    }, [])
    return (
        <div>
            <h1>WRAPPED </h1>
            <div id={id}>
                {children}
            </div>
        </div>
    )
}

export const Wrapper = (props: any) => {
    const { Parent, Child, id } = props;
    return (
        <Parent>
            <span id={id}>
                {Child}
            </span>
        </Parent>
    )
}

export default EntryClient;
