import { Fragment } from "preact"

const EntryClient = ({ children, id }: any) => {
    return (
        <Fragment>
            <div id={id}>
                {children}
            </div>
        </Fragment>
    )
}

export default EntryClient;
