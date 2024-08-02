import { ClipboardCopy, Edit, Trash } from "lucide-react";
import { Role } from "../chat"
import { useToast } from "../../hooks/ui/use-toast"
import { Button } from "../../components/ui/button"
import { useEffect, useState } from "react";
import moment from 'moment'
import { openDB } from 'idb';

export const GeneratedPrompt = ({
    content, 
    generating,
    deleteMessageCallback
}) => {
    const { toast } = useToast()

    const copyToClipboard = () => {
        navigator.clipboard.writeText(content);
        toast({
            title: "Message copied!",
        })
    };

    return (
        <div className={"chat-message"}>
            {<div className={"chat-message-content assistant"}>
                {content}
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
                        deleteMessageCallback();
                    }}
                    >
                    <Trash/>

                </Button>
            </div>
        </div>
    )
}

