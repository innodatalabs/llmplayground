import { Loader2, ClipboardCopy } from "lucide-react";
import { Role } from "../chat"
import { useToast } from "../../hooks/ui/use-toast"
import { Button } from "../../components/ui/button"

export const ChatMessage = ({role, content}) => {
    let roleClass = (role === Role.USER ? "user" : "assistant")
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
                {role}
            </div>
            <div className={"chat-message-content " + roleClass}>
                {content}
            </div>


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
        </div>
    )
}

