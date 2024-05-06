import { Role } from "../chat"

export const ChatMessage = ({role, content}) => {
    let roleClass = (role === Role.USER ? "user" : "assistant")

    return (
        <div className={"chat-message"}>
            <div className="chat-message-role">
                {role}
            </div>
            <div className={"chat-message-content " + roleClass}>
                {content}
            </div>
        </div>
    )
}