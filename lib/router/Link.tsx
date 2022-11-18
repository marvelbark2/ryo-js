export default function Link(props: any) {
    return (
        //@ts-ignore
        <a href={props.href}>{props.children}</a>
    )
}