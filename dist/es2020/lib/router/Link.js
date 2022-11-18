export default function Link(props) {
    return (
    //@ts-ignore
    <a href={props.href}>{props.children}</a>);
}
