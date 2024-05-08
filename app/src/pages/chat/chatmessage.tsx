import { ClipboardCopy, Edit, Trash } from "lucide-react";
import { Role } from "../chat"
import { useToast } from "../../hooks/ui/use-toast"
import { Button } from "../../components/ui/button"
import { useState } from "react";
import moment from 'moment'

export const ChatMessage = ({
    role, 
    content, 
    generating,
    date,
    updateMessageCallback,
    deleteMessageCallback
}) => {
    let roleClass = (role === Role.USER ? "user" : "assistant")
    const [editing, setEditing] = useState(false);

    const { toast } = useToast()

    const copyToClipboard = () => {
        navigator.clipboard.writeText(content);
        toast({
            title: "Message copied!",
        })
    };

    return (
        <div className={"chat-message"}>
            <div className="chat-message-role">
                <span>{role}</span>
                {date && <span className="chat-message-date">{moment(date).format("h:mm:ss")}</span>}
            </div>
            {!editing && <div className={"chat-message-content " + roleClass}>
                {content}
            </div>}
            {editing && <div className={roleClass}>
                <div 
                    contentEditable
                    className="chat-message-editing"
                    onBlur={(e) => {
                        updateMessageCallback(e.target.textContent)
                    }}
                    onKeyUp={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            updateMessageCallback(e.target.textContent)
                            setEditing(false)
                        }
                    }}
                >
                    {content}
                </div>
            </div>}
            {/*editing && <div className={roleClass}>
                <textarea
                className="chat-message-editing"
                value={content}
                >
                </textarea>
            </div>*/}

            <div className="chat-clipboardbutton-container">
                <Button
                    type="button"
                    variant="subtle"
                    className="chat-clipboardbutton"
                    onClick={(e) => {
                        copyToClipboard();
                    }}
                    >
                    <ClipboardCopy/>

                </Button>
                <Button
                    type="button"
                    variant="subtle"
                    className="chat-clipboardbutton"
                    disabled={generating}
                    onClick={(e) => {
                        setEditing(!editing);
                    }}
                    >
                    <Edit/>

                </Button>
                <Button
                    type="button"
                    variant="subtle"
                    className="chat-clipboardbutton"
                    disabled={generating}
                    onClick={(e) => {
                        deleteMessageCallback();
                    }}
                    >
                    <Trash/>

                </Button>
            </div>
        </div>
    )
}

