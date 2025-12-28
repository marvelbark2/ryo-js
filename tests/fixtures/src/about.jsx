export function data() {
    return {
        title: "About Page",
        description: "This is the about page",
    };
}

export default function About({ data }) {
    return (
        <div>
            <h1 id="title">{data.title}</h1>
            <p id="description">{data.description}</p>
            <a href="/">Back to Home</a>
        </div>
    );
}
