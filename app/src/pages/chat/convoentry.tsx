import { Check, ClipboardCopy, Edit, Pencil, Trash, X } from "lucide-react";
import { Role } from "../chat"
import { useToast } from "../../hooks/ui/use-toast"
import { Button } from "../../components/ui/button"
import { useContext, useRef, useState } from "react";
import moment from 'moment'
import { ChatContext } from "../../app";

export const ConvoEntry = ({
    name, 
    index, 
}) => {
    const {chatContext, setChatContext} = useContext(ChatContext)

    const [editing, setEditing] = useState(false);

    const [tempName, setTempName] = useState("")

    const divRef = useRef(null);

    const updateConvoName = () => {
        const updatedConvos = [...chatContext.convos]; 
        const updatedConvo = { ...updatedConvos[index], name: tempName }; 
        updatedConvos[index] = updatedConvo; 

        setChatContext(
            { ...chatContext, 
                convos: updatedConvos 
            }
        );
    }
    const { toast } = useToast()
    return (
        <div className="convo-entry-wrapper">
            <div 
                className={"convo-entry" + (chatContext.activeConvo === index ? " selected" : "")}
                ref={divRef}
                contentEditable={editing}
                suppressContentEditableWarning={true}
                onBlur={(e) => {
                    if (editing && tempName) {
                        updateConvoName();
                        setEditing(false);
                    }
                }}
                onKeyUp={(e) => {
                    if (e.key != 'Enter') {
                        setTempName(e.target.textContent)
                    } else {
                        updateConvoName();
                        setEditing(false);
                    }
                }}

            
                onClick={(e) => {
                    if (chatContext.activeConvo != index) {
                        setChatContext({
                            ...chatContext,
                            activeConvo : index
                        })
                    } else {
                        setEditing(true)
                        divRef.current.focus();
                    }
                }}
            >
                {name}
            </div>
            <div 
                className="convo-entry-contextMenu"
            >
                
                <Button
                    onClick={(e) => {
                        const updatedConvos = [...chatContext.convos]; 
                        let newIndex = chatContext.activeConvo

                        if (updatedConvos.length > 1) {
                            updatedConvos.splice(index, 1);
                            if (chatContext.activeConvo === index) {
                                newIndex = 0;
                            }
                        }
                        setChatContext(
                            { ...chatContext, 
                                convos: updatedConvos, 
                                activeConvo: newIndex
                            }
                        );    
                    }}
                >
                    <Trash></Trash>
                </Button>       
            </div>
        </div>
    )
}

